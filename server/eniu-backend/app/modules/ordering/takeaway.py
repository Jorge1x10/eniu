"""Pedidos para llevar: desde el enlace del menú, sin QR de mesa.

Reglas (ver `docs/ORDERING.md`, "Para llevar"):

- El negocio los activa aparte (`Business.takeaway_enabled`) y además deben
  estar activos los pedidos (`ordering_enabled` y el plan).
- Cada pedido para llevar abre **su propia cuenta**, sin mesa, con el nombre
  y el teléfono de quien pide. Pasa por los mismos estados que en la mesa y
  se paga al recoger (efectivo o terminal): cobrar cierra la cuenta, y eso es
  "entregado".
- Como no hay mesa física detrás, los límites son más estrictos: pocos
  pedidos sin aceptar por teléfono y un tope por menú y por hora.
- El cliente ve sus pedidos para llevar de las últimas horas, identificado
  por el mismo token de dispositivo que en la mesa.
"""

import re

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import selectinload

from app.database.basemodel import utc_now
from app.database.db import db
from app.modules.catalogue.model import Catalogue
from app.shared.i18n import _

from .model import ACCOUNT_OPEN, CHANNEL_TAKEAWAY, ORDER_PENDING, Order, OrderItem, TableAccount
from .services import (
    CLOSED_ACCOUNT_VISIBLE_FOR,
    OrderingError,
    _aware,
    _iso,
    _money,
    _ordering_enabled,
    _orderable_products,
    _parse_order,
    _touch,
    account_total,
    device_hash,
    order_payload,
    valid_device_token,
)

# Pedidos para llevar sin aceptar que un teléfono puede tener a la vez en un
# negocio. En la mesa son 5; aquí no hay nadie sentado detrás.
MAX_PENDING_TAKEAWAY_PER_DEVICE = 3
PHONE_DIGITS = (8, 15)
_PHONE_CLEAN_RE = re.compile(r"[\s().-]")


def _public_catalogue(public_slug):
    """El menú publicado de ese enlace, o None."""
    if not isinstance(public_slug, str) or not public_slug or len(public_slug) > 120:
        return None
    catalogue = Catalogue.query.filter_by(public_slug=public_slug, is_published=True).first()
    if not catalogue or not catalogue.business:
        return None
    return catalogue


def _takeaway_enabled(business):
    return bool(business.takeaway_enabled) and _ordering_enabled(business)


def _parse_phone(value):
    """Un teléfono escrito a mano: se quitan espacios, guiones y paréntesis.

    Se guarda con su `+` inicial si lo trae; sólo se comprueba que tenga de
    8 a 15 dígitos, para no rechazar números de otros países.
    """
    if not isinstance(value, str):
        raise OrderingError(_("Escribe un teléfono para avisarte cuando tu pedido esté listo"))
    phone = _PHONE_CLEAN_RE.sub("", value.strip())
    digits = phone[1:] if phone.startswith("+") else phone
    if not digits.isdigit() or not PHONE_DIGITS[0] <= len(digits) <= PHONE_DIGITS[1]:
        raise OrderingError(_("Escribe un teléfono válido, de 8 a 15 dígitos"))
    return phone


def get_public_takeaway(public_slug):
    try:
        catalogue = _public_catalogue(public_slug)
        if not catalogue:
            return {"message": _("Este menú no está disponible")}, 404
        business = catalogue.business
        return {
            "business": {"name": business.name},
            "menu": {"public_slug": catalogue.public_slug},
            "ordering": {"enabled": _takeaway_enabled(business)},
        }, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar el menú")}, 500


def place_takeaway_order(public_slug, device_token, data):
    if not valid_device_token(device_token):
        return {"message": _("No pudimos identificar este dispositivo. Recarga la página.")}, 400
    try:
        diner_name, idempotency_key, lines = _parse_order(data, extra_fields=("phone",))
        phone = _parse_phone((data or {}).get("phone"))
    except OrderingError as error:
        return error.payload, error.status

    device = device_hash(device_token)
    try:
        catalogue = _public_catalogue(public_slug)
        if not catalogue:
            return {"message": _("Este menú no está disponible")}, 404
        business = catalogue.business

        existing = Order.query.filter_by(device_hash=device, idempotency_key=idempotency_key).first()
        if existing:
            account = existing.account
            if account.channel != CHANNEL_TAKEAWAY or account.business_id != business.id:
                return {"message": _("El pedido no tiene un identificador válido")}, 409
            return {"order": _diner_takeaway_payload(existing)}, 200

        if not _takeaway_enabled(business):
            return {
                "message": _("Este negocio no está recibiendo pedidos para llevar en este momento"),
                "code": "ordering_disabled",
            }, 409

        orderable = _orderable_products(catalogue)
        unavailable = sorted({key for key, _quantity, _notes in lines if key not in orderable})
        if unavailable:
            return {
                "message": _("Algunos productos ya no se pueden pedir. Revisa tu carrito."),
                "code": "products_unavailable",
                "product_keys": unavailable,
            }, 409

        pending = (
            Order.query
            .join(TableAccount, TableAccount.id == Order.account_id)
            .filter(
                TableAccount.business_id == business.id,
                TableAccount.channel == CHANNEL_TAKEAWAY,
                Order.device_hash == device,
                Order.status == ORDER_PENDING,
            )
            .count()
        )
        if pending >= MAX_PENDING_TAKEAWAY_PER_DEVICE:
            return {
                "message": _("Espera a que el negocio confirme tus pedidos antes de mandar otro"),
                "code": "too_many_pending",
            }, 429

        account = TableAccount(
            business_id=business.id,
            table_id=None,
            channel=CHANNEL_TAKEAWAY,
            customer_name=diner_name,
            customer_phone=phone,
            status=ACCOUNT_OPEN,
        )
        order = Order(
            account=account,
            diner_name=diner_name,
            device_hash=device,
            idempotency_key=idempotency_key,
            status=ORDER_PENDING,
        )
        for position, (product_key, quantity, notes) in enumerate(lines):
            product = orderable[product_key]
            order.items.append(OrderItem(
                product_id=product.id,
                position=position,
                name=product.name,
                unit_price=product.price,
                quantity=quantity,
                notes=notes,
            ))
        db.session.add_all([account, order])
        db.session.flush()
        _touch(business.id, account)
        db.session.commit()
        return {"order": _diner_takeaway_payload(order)}, 201
    except IntegrityError:
        db.session.rollback()
        existing = Order.query.filter_by(device_hash=device, idempotency_key=idempotency_key).first()
        if existing:
            return {"order": _diner_takeaway_payload(existing)}, 200
        return {"message": _("No fue posible mandar el pedido")}, 500
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible mandar el pedido")}, 500


def _diner_takeaway_payload(order):
    """El pedido como lo ve quien lo hizo, con el estado de su cuenta.

    Una cuenta para llevar cerrada es un pedido entregado (se cobró al
    recogerlo) o uno que el negocio cerró sin cobrar.
    """
    account = order.account
    return {
        **order_payload(order),
        "account": {
            "status": account.status,
            "closed_at": _iso(account.closed_at),
            "total": _money(account_total(account)),
        },
    }


def diner_takeaway_orders(public_slug, device_token):
    """Los pedidos para llevar de este teléfono en el negocio, de las últimas horas."""
    if not valid_device_token(device_token):
        return {"message": _("No pudimos identificar este dispositivo. Recarga la página.")}, 400
    try:
        catalogue = _public_catalogue(public_slug)
        if not catalogue:
            return {"message": _("Este menú no está disponible")}, 404
        since = utc_now() - CLOSED_ACCOUNT_VISIBLE_FOR
        orders = (
            Order.query
            .join(TableAccount, TableAccount.id == Order.account_id)
            .options(selectinload(Order.items), selectinload(Order.account).selectinload(TableAccount.orders))
            .filter(
                TableAccount.business_id == catalogue.business_id,
                TableAccount.channel == CHANNEL_TAKEAWAY,
                Order.device_hash == device_hash(device_token),
            )
            .order_by(Order.created_at.desc())
            .limit(10)
            .all()
        )
        # La ventana se compara aquí: SQLite guarda las fechas sin zona.
        recent = [order for order in orders if _aware(order.created_at) >= since]
        return {"orders": [_diner_takeaway_payload(order) for order in recent]}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar tus pedidos")}, 500
