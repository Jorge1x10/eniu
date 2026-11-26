"""Pedidos para llevar y a domicilio: desde el enlace del menú, sin QR de mesa.

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

A domicilio es lo mismo con más datos: colonia (de las que el negocio
atiende), dirección, referencias y cómo va a pagar (efectivo, con cuánto, o
tarjeta). El envío cuesta lo mismo en todas las colonias y se copia a la
cuenta al pedir. Hay un estado más, "En camino"; entregado es cobrar.
"""

import re
from decimal import Decimal, InvalidOperation

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import selectinload

from app.database.basemodel import utc_now
from app.database.db import db
from app.modules.catalogue.model import Catalogue
from app.shared.i18n import _

from app.modules.catalogue.services import _business_access

from .model import (
    ACCOUNT_OPEN,
    CHANNEL_DELIVERY,
    CHANNEL_TAKEAWAY,
    ORDER_PENDING,
    PAY_CASH,
    PAY_WITH,
    REMOTE_CHANNELS,
    Order,
    OrderItem,
    TableAccount,
)
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
    delivery_payload,
    device_hash,
    order_payload,
    valid_device_token,
)

# Pedidos para llevar sin aceptar que un teléfono puede tener a la vez en un
# negocio. En la mesa son 5; aquí no hay nadie sentado detrás.
MAX_PENDING_TAKEAWAY_PER_DEVICE = 3
PHONE_DIGITS = (8, 15)
_PHONE_CLEAN_RE = re.compile(r"[\s().-]")
MAX_ZONES = 200
MAX_ZONE = 60
MAX_ADDRESS = 200
MAX_REFERENCES = 200
MAX_MONEY = Decimal("100000")
_MONEY_RE = re.compile(r"^\d{1,6}(\.\d{1,2})?$")


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


def _delivery_enabled(business):
    return bool(business.delivery_enabled) and bool(business.delivery_zones) and _ordering_enabled(business)


def _money_or_none(value):
    return _money(value) if value is not None else None


def delivery_settings(business):
    """Lo que el negocio configuró para entregar a domicilio."""
    return {
        "enabled": bool(business.delivery_enabled),
        "fee": _money(business.delivery_fee),
        "min_order": _money_or_none(business.delivery_min_order),
        "zones": list(business.delivery_zones or []),
    }


def _parse_amount(value, field, allow_empty=False):
    """Un importe escrito a mano: "35", "35.5" o 35.50, hasta 2 decimales."""
    if value is None or value == "":
        if allow_empty:
            return None
        raise OrderingError(_("{field} debe ser un importe válido", field=field))
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise OrderingError(_("{field} debe ser un importe válido", field=field))
    text = str(value).strip()
    if not _MONEY_RE.match(text):
        raise OrderingError(_("{field} debe ser un importe válido", field=field))
    try:
        amount = Decimal(text)
    except InvalidOperation as error:
        raise OrderingError(_("{field} debe ser un importe válido", field=field)) from error
    if amount >= MAX_MONEY:
        raise OrderingError(_("{field} debe ser un importe válido", field=field))
    return amount.quantize(Decimal("0.01"))


def _clean_text(value, limit):
    if value is None:
        return None
    if not isinstance(value, str):
        raise OrderingError(_("Los datos de la entrega no son válidos"))
    value = " ".join(value.split())
    if len(value) > limit:
        raise OrderingError(_("Los datos de la entrega no son válidos"))
    return value or None


def _parse_zones(value):
    """Colonias que atiende el negocio: sin vacías ni repetidas (sin importar mayúsculas)."""
    if not isinstance(value, list) or len(value) > MAX_ZONES:
        raise OrderingError(_("Las colonias no son válidas"))
    zones, seen = [], set()
    for entry in value:
        name = _clean_text(entry, MAX_ZONE)
        if not name:
            continue
        key = name.casefold()
        if key not in seen:
            seen.add(key)
            zones.append(name)
    return zones


def set_delivery(owner_id, business_id, data):
    """Configura a domicilio: `enabled`, `fee`, `min_order` y `zones` (todos opcionales)."""
    if not isinstance(data, dict) or not data or set(data) - {"enabled", "fee", "min_order", "zones"}:
        return {"message": _("Se enviaron campos no permitidos")}, 400
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        if "enabled" in data and not isinstance(data["enabled"], bool):
            raise OrderingError(_("{field} debe ser verdadero o falso", field="enabled"))
        if "fee" in data:
            business.delivery_fee = _parse_amount(data["fee"], "fee")
        if "min_order" in data:
            business.delivery_min_order = _parse_amount(data["min_order"], "min_order", allow_empty=True)
        if "zones" in data:
            business.delivery_zones = _parse_zones(data["zones"])
        if "enabled" in data:
            business.delivery_enabled = data["enabled"]
        if business.delivery_enabled and not business.delivery_zones:
            raise OrderingError(_("Agrega al menos una colonia para entregar a domicilio"), code="zones_required")
        db.session.flush()
        _touch(business.id)
        db.session.commit()
        return {"delivery": delivery_settings(business)}, 200
    except OrderingError as error:
        db.session.rollback()
        return error.payload, error.status
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible guardar la entrega a domicilio")}, 500


def get_delivery(owner_id, business_id):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        return {"delivery": delivery_settings(business)}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar la entrega a domicilio")}, 500


def _parse_delivery(data, business, subtotal):
    """Colonia, dirección, referencias y pago de un pedido a domicilio."""
    delivery = data.get("delivery")
    if not isinstance(delivery, dict) or set(delivery) - {"zone", "address", "references", "pay_with", "cash_tendered"}:
        raise OrderingError(_("Los datos de la entrega no son válidos"))
    zone = _clean_text(delivery.get("zone"), MAX_ZONE)
    zones = {name.casefold(): name for name in business.delivery_zones or []}
    if not zone or zone.casefold() not in zones:
        raise OrderingError(_("Elige una de las colonias a las que entrega el restaurante"), code="zone_not_served")
    address = _clean_text(delivery.get("address"), MAX_ADDRESS)
    if not address:
        raise OrderingError(_("Escribe la dirección de entrega"))
    references = _clean_text(delivery.get("references"), MAX_REFERENCES)
    pay_with = delivery.get("pay_with")
    if pay_with not in PAY_WITH:
        raise OrderingError(_("Elige cómo vas a pagar"))
    fee = business.delivery_fee or Decimal("0")
    cash_tendered = None
    if pay_with == PAY_CASH:
        cash_tendered = _parse_amount(delivery.get("cash_tendered"), "cash_tendered", allow_empty=True)
        if cash_tendered is not None and cash_tendered < subtotal + fee:
            raise OrderingError(_("El efectivo con el que pagas no alcanza para el total"), code="tendered_short")
    return {
        "delivery_zone": zones[zone.casefold()],
        "delivery_address": address,
        "delivery_references": references,
        "delivery_fee": fee,
        "pay_with": pay_with,
        "cash_tendered": cash_tendered,
    }


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
            "delivery": {
                "enabled": _delivery_enabled(business),
                "fee": _money(business.delivery_fee),
                "min_order": _money_or_none(business.delivery_min_order),
                "zones": list(business.delivery_zones or []) if _delivery_enabled(business) else [],
            },
        }, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar el menú")}, 500


def place_takeaway_order(public_slug, device_token, data):
    return _place_remote_order(public_slug, device_token, data, CHANNEL_TAKEAWAY)


def place_delivery_order(public_slug, device_token, data):
    return _place_remote_order(public_slug, device_token, data, CHANNEL_DELIVERY)


def _place_remote_order(public_slug, device_token, data, channel):
    if not valid_device_token(device_token):
        return {"message": _("No pudimos identificar este dispositivo. Recarga la página.")}, 400
    delivery = channel == CHANNEL_DELIVERY
    try:
        diner_name, idempotency_key, lines = _parse_order(data, extra_fields=("phone", "delivery") if delivery else ("phone",))
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
            if account.channel != channel or account.business_id != business.id:
                return {"message": _("El pedido no tiene un identificador válido")}, 409
            return {"order": _diner_takeaway_payload(existing)}, 200

        if not (_delivery_enabled(business) if delivery else _takeaway_enabled(business)):
            return {
                "message": (
                    _("Este negocio no está entregando a domicilio en este momento") if delivery
                    else _("Este negocio no está recibiendo pedidos para llevar en este momento")
                ),
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

        delivery_fields = {}
        if delivery:
            subtotal = sum((orderable[key].price * quantity for key, quantity, _notes in lines), Decimal("0"))
            minimum = business.delivery_min_order
            if minimum and subtotal < minimum:
                return {
                    "message": _("El pedido mínimo a domicilio es de {amount}", amount=_money(minimum)),
                    "code": "below_minimum",
                    "min_order": _money(minimum),
                }, 409
            try:
                delivery_fields = _parse_delivery(data, business, subtotal)
            except OrderingError as error:
                return error.payload, error.status

        pending = (
            Order.query
            .join(TableAccount, TableAccount.id == Order.account_id)
            .filter(
                TableAccount.business_id == business.id,
                TableAccount.channel.in_(REMOTE_CHANNELS),
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
            channel=channel,
            customer_name=diner_name,
            customer_phone=phone,
            status=ACCOUNT_OPEN,
            **delivery_fields,
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
        "channel": account.channel,
        "account": {
            "status": account.status,
            "closed_at": _iso(account.closed_at),
            "total": _money(account_total(account)),
            "delivery": delivery_payload(account),
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
                TableAccount.channel.in_(REMOTE_CHANNELS),
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
