"""Pedidos desde la mesa: mesas, cuentas, pedidos y sus estados.

Reglas que fija este módulo (ver `docs/ORDERING.md`):

- La cuenta de una mesa se abre sola con el primer pedido y sólo el negocio
  la cierra. Es una para toda la mesa.
- Un pedido llega como `pending` y sólo avanza: recibido, preparando, listo.
  El comensal no puede cancelar; el negocio cancela productos sueltos o el
  pedido entero.
- El precio y el nombre se copian del producto al pedir. El total siempre lo
  calcula el servidor, sin contar lo cancelado ni lo que aún no se aceptó.
- Cada cambio sube `Business.orders_version` y `TableAccount.version` en la
  misma transacción: es lo que deja a los clientes preguntar "¿cambió algo?"
  cada pocos segundos sin cargar la base.
"""

import re
import secrets
from datetime import timedelta, timezone
from decimal import Decimal
from uuid import UUID

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import selectinload

from app.database.basemodel import utc_now
from app.database.db import db
from app.modules.analytics.security import protected_value, tracking_key
from app.modules.billing.guards import plan_key_for
from app.modules.billing.plans import allows_orders
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.catalogue.services import _business_access
from app.modules.products.model import Product
from app.shared.i18n import _

from .model import (
    ACCEPTED_STATUSES,
    ACCOUNT_CLOSED,
    ACCOUNT_OPEN,
    CHANNEL_DELIVERY,
    CHANNEL_TAKEAWAY,
    DELIVERY_FLOW,
    REMOTE_CHANNELS,
    ORDER_CANCELLED,
    ORDER_FLOW,
    ORDER_PENDING,
    DiningTable,
    Order,
    OrderItem,
    TableAccount,
)

MAX_TABLE_NUMBER = 9999
MAX_TABLE_NAME = 40
MAX_DINER_NAME = 40
MAX_NOTES = 200
MAX_LINES_PER_ORDER = 30
MAX_QUANTITY = 20
# Pedidos sin aceptar que un mismo teléfono puede tener a la vez en una mesa.
# Corta a quien manda pedidos en ráfaga (o desde fuera del local) sin estorbar
# a quien pide en tandas normales.
MAX_PENDING_PER_DEVICE = 5
# Tras cerrar la cuenta, el comensal todavía ve sus pedidos un rato, marcados
# como cuenta cerrada; después la mesa vuelve a estar en blanco para él.
CLOSED_ACCOUNT_VISIBLE_FOR = timedelta(hours=12)

DEVICE_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
IDEMPOTENCY_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")

TIMESTAMP_FOR_STATUS = {
    "received": "received_at",
    "preparing": "preparing_at",
    "ready": "ready_at",
    "on_the_way": "on_the_way_at",
}


class OrderingError(Exception):
    """Error de validación con su respuesta ya armada."""

    def __init__(self, message, status=400, **extra):
        super().__init__(message)
        self.payload = {"message": message, **extra}
        self.status = status


def _uuid(value):
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


def _money(value):
    return format(Decimal(value or 0).quantize(Decimal("0.01")), ".2f")


def _iso(value):
    return value.isoformat() if value else None


def _aware(value):
    """SQLite devuelve las fechas sin zona; Postgres, en UTC. Se igualan."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _new_qr_token():
    return secrets.token_urlsafe(18)


def device_hash(device_token):
    """Lo que se guarda del token del comensal: nunca el token mismo."""
    return protected_value("diner", device_token)


def valid_device_token(device_token):
    return isinstance(device_token, str) and bool(DEVICE_TOKEN_RE.match(device_token))


def _touch(business_id, account=None):
    """Marca que algo cambió para quien consulta en vivo.

    Se suma en la base (`col = col + 1`), no en Python: dos cambios a la vez
    no pueden pisarse el número.
    """
    Business.query.filter_by(id=business_id).update(
        {Business.orders_version: Business.orders_version + 1},
        synchronize_session=False,
    )
    if account is not None:
        TableAccount.query.filter_by(id=account.id).update(
            {TableAccount.version: TableAccount.version + 1},
            synchronize_session=False,
        )


# --- Serialización -----------------------------------------------------------


def table_qr_url(table):
    slug = table.catalogue.public_slug if table.catalogue else None
    if not slug:
        return None
    return f"{current_app.config['PUBLIC_WEB_BASE_URL']}/m/{slug}/mesa/{table.qr_token}"


def table_payload(table):
    return {
        "id": str(table.id),
        "number": table.number,
        "name": table.name,
        "catalogue_id": str(table.catalogue_id),
        "is_active": table.is_active,
        # Sin publicar el menú, el QR no lleva a ningún sitio todavía.
        "catalogue_published": bool(table.catalogue and table.catalogue.is_published),
        "qr_url": table_qr_url(table),
    }


def _table_label(table):
    return {"number": table.number, "name": table.name}


def _item_payload(item, with_id):
    payload = {
        "name": item.name,
        "quantity": item.quantity,
        "unit_price": _money(item.unit_price),
        "line_total": _money(item.line_total),
        "notes": item.notes,
        "is_cancelled": item.is_cancelled,
    }
    if with_id:
        payload["id"] = str(item.id)
    return payload


def _order_total(order):
    return sum((item.line_total for item in order.items if not item.is_cancelled), Decimal("0"))


def order_payload(order, for_business=False):
    payload = {
        "status": order.status,
        "diner_name": order.diner_name,
        "created_at": _iso(order.created_at),
        "received_at": _iso(order.received_at),
        "preparing_at": _iso(order.preparing_at),
        "ready_at": _iso(order.ready_at),
        "on_the_way_at": _iso(order.on_the_way_at),
        "cancelled_at": _iso(order.cancelled_at),
        "items": [_item_payload(item, with_id=for_business) for item in order.items],
        "total": _money(_order_total(order)),
    }
    # El comensal no necesita ids: no puede tocar el pedido una vez enviado.
    # Recibe la clave con la que lo mandó, para reconocerlo en su carrito.
    if for_business:
        payload["id"] = str(order.id)
    else:
        payload["idempotency_key"] = order.idempotency_key
    return payload


def account_subtotal(account):
    """Lo consumido: sólo pedidos aceptados y productos sin cancelar."""
    return sum(
        (_order_total(order) for order in account.orders if order.status in ACCEPTED_STATUSES),
        Decimal("0"),
    )


def account_total(account):
    """Lo que se debe: lo consumido y, a domicilio, el envío.

    El envío sólo se cobra si hay algo que entregar: si el negocio canceló
    todo, la cuenta queda en cero.
    """
    subtotal = account_subtotal(account)
    if account.channel == CHANNEL_DELIVERY and subtotal > 0:
        return subtotal + (account.delivery_fee or Decimal("0"))
    return subtotal


def delivery_payload(account):
    """A dónde y cómo se entrega un pedido a domicilio; None en los demás."""
    if account.channel != CHANNEL_DELIVERY:
        return None
    return {
        "address": account.delivery_address,
        "zone": account.delivery_zone,
        "references": account.delivery_references,
        "fee": _money(account.delivery_fee),
        "pay_with": account.pay_with,
        "cash_tendered": _money(account.cash_tendered) if account.cash_tendered is not None else None,
    }


def _account_payload_for_business(account):
    return {
        "id": str(account.id),
        "status": account.status,
        "channel": account.channel,
        # Una cuenta para llevar no tiene mesa: trae a quién se entrega.
        "table": {"id": str(account.table_id), **_table_label(account.table)} if account.table else None,
        "customer": (
            {"name": account.customer_name, "phone": account.customer_phone}
            if account.channel in REMOTE_CHANNELS else None
        ),
        "delivery": delivery_payload(account),
        "opened_at": _iso(account.created_at),
        "closed_at": _iso(account.closed_at),
        "total": _money(account_total(account)),
        "pending_orders": sum(1 for order in account.orders if order.status == ORDER_PENDING),
        "orders": [order_payload(order, for_business=True) for order in account.orders],
    }


# --- Comensal ------------------------------------------------------------------


def _public_table(qr_token):
    """La mesa de un QR, si está activa y su menú publicado; si no, None."""
    if not isinstance(qr_token, str) or not qr_token or len(qr_token) > 64:
        return None
    table = DiningTable.query.filter_by(qr_token=qr_token, is_active=True).first()
    if not table or not table.catalogue or not table.catalogue.is_published:
        return None
    return table


def _plan_allows_orders(business):
    return allows_orders(plan_key_for(business.owner_id))


def _ordering_state(business):
    """Si el negocio acepta pedidos ahora y, si no, por qué.

    `paused`: el negocio los apagó. `plan`: su plan no los incluye (por
    ejemplo, terminó la prueba gratuita). El panel muestra uno u otro aviso.
    """
    extra = {"takeaway": bool(business.takeaway_enabled), "delivery": bool(business.delivery_enabled)}
    if not _plan_allows_orders(business):
        return {"enabled": False, "reason": "plan", **extra}
    if not business.ordering_enabled:
        return {"enabled": False, "reason": "paused", **extra}
    return {"enabled": True, "reason": None, **extra}


def _ordering_enabled(business):
    return _ordering_state(business)["enabled"]


def get_public_table(qr_token):
    try:
        table = _public_table(qr_token)
        if not table:
            return {"message": _("Esta mesa no está disponible")}, 404
        return {
            "table": _table_label(table),
            # El menú se pide aparte con su endpoint de siempre, que está
            # cacheado: es la ruta más caliente del backend.
            "menu": {"public_slug": table.catalogue.public_slug},
            "ordering": {"enabled": _ordering_enabled(table.business)},
        }, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar la mesa")}, 500


def _orderable_products(catalogue):
    """Clave pública de producto -> producto, sólo de lo que se puede pedir.

    La clave es el `tracking_key` que el menú público ya publica por
    producto: el pedido no necesita exponer ningún id interno. Se puede pedir
    lo que el menú muestra, está disponible y tiene precio; un producto sin
    precio ("Consultar") se ve en el menú, pero se pide al mesero.
    """
    products = (
        Product.query
        .filter(Product.catalogue_id == catalogue.id, Product.is_available.is_(True), Product.price.isnot(None))
        .all()
    )
    return {
        tracking_key(catalogue.id, "product", product.id): product
        for product in products
        if product.category is None or product.category.is_visible
    }


def _parse_order(data, extra_fields=()):
    if not isinstance(data, dict):
        raise OrderingError(_("Debes enviar información en formato JSON"))
    unknown = set(data) - {"diner_name", "idempotency_key", "items", *extra_fields}
    if unknown:
        raise OrderingError(_("Se enviaron campos no permitidos"), fields=sorted(unknown))

    diner_name = data.get("diner_name")
    diner_name = diner_name.strip() if isinstance(diner_name, str) else ""
    if not diner_name:
        raise OrderingError(_("Escribe tu nombre para mandar el pedido"))
    if len(diner_name) > MAX_DINER_NAME:
        raise OrderingError(_("El nombre no puede superar {limit} caracteres", limit=MAX_DINER_NAME))

    key = data.get("idempotency_key")
    if not isinstance(key, str) or not IDEMPOTENCY_KEY_RE.match(key):
        raise OrderingError(_("El pedido no tiene un identificador válido"))

    items = data.get("items")
    if not isinstance(items, list) or not items:
        raise OrderingError(_("El pedido no tiene productos"))
    if len(items) > MAX_LINES_PER_ORDER:
        raise OrderingError(_("Un pedido puede tener hasta {limit} productos", limit=MAX_LINES_PER_ORDER))

    lines = []
    for entry in items:
        if not isinstance(entry, dict) or set(entry) - {"product_key", "quantity", "notes"}:
            raise OrderingError(_("Uno de los productos del pedido no es válido"))
        product_key = entry.get("product_key")
        quantity = entry.get("quantity")
        notes = entry.get("notes")
        if not isinstance(product_key, str) or not product_key:
            raise OrderingError(_("Uno de los productos del pedido no es válido"))
        if not isinstance(quantity, int) or isinstance(quantity, bool) or not 1 <= quantity <= MAX_QUANTITY:
            raise OrderingError(_("La cantidad debe ser de 1 a {limit}", limit=MAX_QUANTITY))
        if notes is not None and not isinstance(notes, str):
            raise OrderingError(_("Las notas no son válidas"))
        notes = (notes or "").strip() or None
        if notes and len(notes) > MAX_NOTES:
            raise OrderingError(_("Las notas no pueden superar {limit} caracteres", limit=MAX_NOTES))
        lines.append((product_key, quantity, notes))
    return diner_name, key, lines


def _open_account(table):
    """La cuenta abierta de la mesa, o una nueva si no hay."""
    account = TableAccount.query.filter_by(table_id=table.id, status=ACCOUNT_OPEN).first()
    if account:
        return account
    try:
        with db.session.begin_nested():
            account = TableAccount(table_id=table.id, business_id=table.business_id, status=ACCOUNT_OPEN)
            db.session.add(account)
        return account
    except IntegrityError:
        # Otro comensal de la mesa la abrió en ese mismo instante.
        return TableAccount.query.filter_by(table_id=table.id, status=ACCOUNT_OPEN).one()


def place_order(qr_token, device_token, data):
    if not valid_device_token(device_token):
        return {"message": _("No pudimos identificar este dispositivo. Recarga la página.")}, 400
    try:
        diner_name, idempotency_key, lines = _parse_order(data)
    except OrderingError as error:
        return error.payload, error.status

    device = device_hash(device_token)
    try:
        table = _public_table(qr_token)
        if not table:
            return {"message": _("Esta mesa no está disponible")}, 404

        # Un reintento del mismo envío devuelve el pedido que ya existe.
        existing = Order.query.filter_by(device_hash=device, idempotency_key=idempotency_key).first()
        if existing:
            if existing.account.table_id is None or existing.account.table_id != table.id:
                return {"message": _("El pedido no tiene un identificador válido")}, 409
            return {"order": order_payload(existing)}, 200

        if not _ordering_enabled(table.business):
            return {
                "message": _("Este negocio no está recibiendo pedidos en este momento"),
                "code": "ordering_disabled",
            }, 409

        orderable = _orderable_products(table.catalogue)
        unavailable = sorted({key for key, _quantity, _notes in lines if key not in orderable})
        if unavailable:
            return {
                "message": _("Algunos productos ya no se pueden pedir. Revisa tu carrito."),
                "code": "products_unavailable",
                "product_keys": unavailable,
            }, 409

        account = _open_account(table)
        pending = Order.query.filter_by(
            account_id=account.id, device_hash=device, status=ORDER_PENDING,
        ).count()
        if pending >= MAX_PENDING_PER_DEVICE:
            db.session.rollback()
            return {
                "message": _("Espera a que el negocio confirme tus pedidos antes de mandar otro"),
                "code": "too_many_pending",
            }, 429

        order = Order(
            account_id=account.id,
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
        db.session.add(order)
        db.session.flush()
        _touch(table.business_id, account)
        db.session.commit()
        return {"order": order_payload(order)}, 201
    except IntegrityError:
        # Dos envíos idénticos a la vez: el segundo choca con la clave única.
        db.session.rollback()
        existing = Order.query.filter_by(device_hash=device, idempotency_key=idempotency_key).first()
        if existing:
            return {"order": order_payload(existing)}, 200
        return {"message": _("No fue posible mandar el pedido")}, 500
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible mandar el pedido")}, 500


def _device_account(table, device):
    """La cuenta más reciente de la mesa en la que este teléfono pidió."""
    return (
        TableAccount.query
        .join(Order, Order.account_id == TableAccount.id)
        .filter(TableAccount.table_id == table.id, Order.device_hash == device)
        .order_by(TableAccount.created_at.desc())
        .first()
    )


def diner_orders(qr_token, device_token, known_version=None):
    """Los pedidos de este comensal en la cuenta de la mesa: su carrito."""
    if not valid_device_token(device_token):
        return {"message": _("No pudimos identificar este dispositivo. Recarga la página.")}, 400
    try:
        table = _public_table(qr_token)
        if not table:
            return {"message": _("Esta mesa no está disponible")}, 404
        device = device_hash(device_token)
        account = _device_account(table, device)
        if account and account.status == ACCOUNT_CLOSED and (
            not account.closed_at or utc_now() - _aware(account.closed_at) > CLOSED_ACCOUNT_VISIBLE_FOR
        ):
            account = None
        if not account:
            return {"account": None, "orders": []}, 200
        if known_version is not None and known_version == account.version:
            return {"changed": False, "version": account.version}, 200
        orders = [order for order in account.orders if order.device_hash == device]
        return {
            "account": {"status": account.status, "version": account.version},
            "orders": [order_payload(order) for order in orders],
        }, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar tus pedidos")}, 500


def diner_account(qr_token, device_token):
    """La cuenta de toda la mesa: lo que el negocio ya aceptó.

    Sólo la ve quien pidió en esta cuenta. Con una foto del QR no basta para
    ver lo que consumió la mesa ni el nombre de quienes están en ella.
    """
    if not valid_device_token(device_token):
        return {"message": _("No pudimos identificar este dispositivo. Recarga la página.")}, 400
    try:
        table = _public_table(qr_token)
        if not table:
            return {"message": _("Esta mesa no está disponible")}, 404
        account = TableAccount.query.filter_by(table_id=table.id, status=ACCOUNT_OPEN).first()
        device = device_hash(device_token)
        if not account or not any(order.device_hash == device for order in account.orders):
            return {"message": _("Todavía no tienes pedidos en esta mesa"), "code": "no_account"}, 404
        lines = []
        for order in account.orders:
            if order.status not in ACCEPTED_STATUSES:
                continue
            for item in order.items:
                if item.is_cancelled:
                    continue
                lines.append({**_item_payload(item, with_id=False), "diner_name": order.diner_name, "status": order.status})
        return {
            "account": {
                "table": _table_label(table),
                "opened_at": _iso(account.created_at),
                "lines": lines,
                "total": _money(account_total(account)),
            }
        }, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar la cuenta")}, 500


# --- Negocio: mesas -------------------------------------------------------------


def _table_fields(data, business, partial):
    if not isinstance(data, dict):
        raise OrderingError(_("Debes enviar información en formato JSON"))
    unknown = set(data) - {"number", "name", "catalogue_id", "is_active"}
    if unknown:
        raise OrderingError(_("Se enviaron campos no permitidos"), fields=sorted(unknown))
    fields = {}
    if "number" in data or not partial:
        number = data.get("number")
        if not isinstance(number, int) or isinstance(number, bool) or not 1 <= number <= MAX_TABLE_NUMBER:
            raise OrderingError(_("El número de mesa debe ser de 1 a {limit}", limit=MAX_TABLE_NUMBER))
        fields["number"] = number
    if "name" in data:
        name = data.get("name")
        if name is not None and not isinstance(name, str):
            raise OrderingError(_("El nombre de la mesa no es válido"))
        name = (name or "").strip() or None
        if name and len(name) > MAX_TABLE_NAME:
            raise OrderingError(_("El nombre no puede superar {limit} caracteres", limit=MAX_TABLE_NAME))
        fields["name"] = name
    if "catalogue_id" in data or not partial:
        catalogue_uuid = _uuid(data.get("catalogue_id"))
        catalogue = (
            Catalogue.query.filter_by(id=catalogue_uuid, business_id=business.id).first()
            if catalogue_uuid else None
        )
        if not catalogue:
            raise OrderingError(_("Elige un menú de este negocio para la mesa"))
        fields["catalogue_id"] = catalogue.id
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            raise OrderingError(_("{field} debe ser verdadero o falso", field="is_active"))
        fields["is_active"] = data["is_active"]
    return fields


def _owned_table(business, table_id):
    table_uuid = _uuid(table_id)
    if not table_uuid:
        return None
    return DiningTable.query.filter_by(id=table_uuid, business_id=business.id).first()


def list_tables(owner_id, business_id):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        tables = DiningTable.query.filter_by(business_id=business.id).order_by(DiningTable.number).all()
        return {"tables": [table_payload(table) for table in tables]}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar las mesas")}, 500


def _duplicate_number():
    return {"message": _("Ya existe una mesa con ese número"), "code": "duplicate_number"}, 409


def create_table(owner_id, business_id, data):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        fields = _table_fields(data, business, partial=False)
        table = DiningTable(business_id=business.id, qr_token=_new_qr_token(), **fields)
        db.session.add(table)
        db.session.commit()
        return {"table": table_payload(table)}, 201
    except OrderingError as error:
        return error.payload, error.status
    except IntegrityError:
        db.session.rollback()
        return _duplicate_number()
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible crear la mesa")}, 500


def update_table(owner_id, business_id, table_id, data):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        table = _owned_table(business, table_id)
        if not table:
            return {"message": _("Mesa no encontrada")}, 404
        for field, value in _table_fields(data, business, partial=True).items():
            setattr(table, field, value)
        db.session.commit()
        return {"table": table_payload(table)}, 200
    except OrderingError as error:
        return error.payload, error.status
    except IntegrityError:
        db.session.rollback()
        return _duplicate_number()
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar la mesa")}, 500


def regenerate_table_qr(owner_id, business_id, table_id):
    """Invalida el QR impreso de la mesa: el anterior deja de funcionar."""
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        table = _owned_table(business, table_id)
        if not table:
            return {"message": _("Mesa no encontrada")}, 404
        table.qr_token = _new_qr_token()
        db.session.commit()
        return {"table": table_payload(table)}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar la mesa")}, 500


def delete_table(owner_id, business_id, table_id):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        table = _owned_table(business, table_id)
        if not table:
            return {"message": _("Mesa no encontrada")}, 404
        if TableAccount.query.filter_by(table_id=table.id, status=ACCOUNT_OPEN).first():
            return {
                "message": _("Cierra la cuenta de la mesa antes de borrarla"),
                "code": "account_open",
            }, 409
        db.session.delete(table)
        db.session.commit()
        return {"message": _("Mesa eliminada")}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible eliminar la mesa")}, 500


def set_ordering(owner_id, business_id, data):
    """Enciende o pausa los pedidos del negocio (`enabled`) y los para llevar (`takeaway`)."""
    changes = {key: data[key] for key in ("enabled", "takeaway") if key in data}
    if not changes:
        return {"message": _("{field} debe ser verdadero o falso", field="enabled")}, 400
    for key, value in changes.items():
        if not isinstance(value, bool):
            return {"message": _("{field} debe ser verdadero o falso", field=key)}, 400
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        if changes.get("enabled") and not _plan_allows_orders(business):
            return {"message": _("Tu plan actual no incluye pedidos desde la mesa"), "code": "plan_limit"}, 403
        if "enabled" in changes:
            business.ordering_enabled = changes["enabled"]
        if "takeaway" in changes:
            business.takeaway_enabled = changes["takeaway"]
        db.session.flush()
        _touch(business.id)
        db.session.commit()
        return {"ordering": _ordering_state(business)}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar los pedidos")}, 500


# --- Negocio: pedidos en vivo ------------------------------------------------------


def live_orders(owner_id, business_id, known_version=None):
    """Las cuentas abiertas del negocio con todos sus pedidos.

    Con `known_version` igual a la actual responde sólo `changed: false`: una
    lectura de una fila por clave primaria. Es lo que hace el panel cada pocos
    segundos.
    """
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        if known_version is not None and known_version == business.orders_version:
            return {"changed": False, "version": business.orders_version}, 200
        accounts = (
            TableAccount.query
            .options(
                selectinload(TableAccount.table),
                selectinload(TableAccount.orders).selectinload(Order.items),
            )
            .filter_by(business_id=business.id, status=ACCOUNT_OPEN)
            .order_by(TableAccount.created_at)
            .all()
        )
        return {
            "changed": True,
            "version": business.orders_version,
            "ordering": _ordering_state(business),
            "accounts": [_account_payload_for_business(account) for account in accounts],
        }, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar los pedidos")}, 500


def _owned_order(business, order_id):
    order_uuid = _uuid(order_id)
    if not order_uuid:
        return None
    return (
        Order.query
        .join(TableAccount, TableAccount.id == Order.account_id)
        .filter(Order.id == order_uuid, TableAccount.business_id == business.id)
        .first()
    )


def _cancel_order(order, now):
    for item in order.items:
        if not item.is_cancelled:
            item.is_cancelled = True
            item.cancelled_at = now
    order.status = ORDER_CANCELLED
    order.cancelled_at = now


def update_order_status(owner_id, business_id, order_id, status):
    if status not in DELIVERY_FLOW[1:] and status != ORDER_CANCELLED:
        return {"message": _("El estado del pedido no es válido")}, 400
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        order = _owned_order(business, order_id)
        if not order:
            return {"message": _("Pedido no encontrado")}, 404
        if order.account.status != ACCOUNT_OPEN:
            return {"message": _("La cuenta de esta mesa ya está cerrada"), "code": "account_closed"}, 409
        if order.status == ORDER_CANCELLED:
            return {"message": _("Este pedido está cancelado"), "code": "order_cancelled"}, 409

        now = utc_now()
        flow = DELIVERY_FLOW if order.account.channel == CHANNEL_DELIVERY else ORDER_FLOW
        if status == ORDER_CANCELLED:
            _cancel_order(order, now)
        elif status not in flow:
            return {"message": _("Sólo un pedido a domicilio puede salir a entregarse"), "code": "invalid_transition"}, 409
        else:
            current = flow.index(order.status)
            target = flow.index(status)
            if target <= current:
                return {"message": _("Un pedido sólo puede avanzar de estado"), "code": "invalid_transition"}, 409
            # Saltar pasos (de enviado a preparando) también cuenta como
            # recibido: lo que se prepara, se aceptó.
            for step in flow[current + 1:target + 1]:
                setattr(order, TIMESTAMP_FOR_STATUS[step], now)
            order.status = status
        db.session.flush()
        _touch(business.id, order.account)
        db.session.commit()
        return {"order": order_payload(order, for_business=True)}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar el pedido")}, 500


def cancel_order_item(owner_id, business_id, order_id, item_id):
    """Cancela un producto suelto, a petición del comensal."""
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        order = _owned_order(business, order_id)
        item_uuid = _uuid(item_id)
        item = next((entry for entry in order.items if entry.id == item_uuid), None) if order else None
        if not item:
            return {"message": _("Producto del pedido no encontrado")}, 404
        if order.account.status != ACCOUNT_OPEN:
            return {"message": _("La cuenta de esta mesa ya está cerrada"), "code": "account_closed"}, 409
        if item.is_cancelled:
            return {"order": order_payload(order, for_business=True)}, 200

        now = utc_now()
        item.is_cancelled = True
        item.cancelled_at = now
        # Sin productos vivos, el pedido entero queda cancelado.
        if all(entry.is_cancelled for entry in order.items):
            order.status = ORDER_CANCELLED
            order.cancelled_at = now
        db.session.flush()
        _touch(business.id, order.account)
        db.session.commit()
        return {"order": order_payload(order, for_business=True)}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible cancelar el producto")}, 500


def close_account(owner_id, business_id, account_id):
    """Cierra la cuenta de una mesa. El siguiente pedido abre una nueva."""
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        account_uuid = _uuid(account_id)
        account = (
            TableAccount.query.filter_by(id=account_uuid, business_id=business.id).first()
            if account_uuid else None
        )
        if not account:
            return {"message": _("Cuenta no encontrada")}, 404
        if account.status != ACCOUNT_OPEN:
            return {"message": _("La cuenta de esta mesa ya está cerrada"), "code": "account_closed"}, 409
        # Un pedido sin aceptar puede ser real: se decide antes de cerrar, no
        # se borra en silencio.
        pending = sum(1 for order in account.orders if order.status == ORDER_PENDING)
        if pending:
            return {
                "message": _("Acepta o cancela los pedidos pendientes antes de cerrar la cuenta"),
                "code": "pending_orders",
                "pending_orders": pending,
            }, 409
        account.status = ACCOUNT_CLOSED
        account.closed_at = utc_now()
        db.session.flush()
        _touch(business.id, account)
        db.session.commit()
        return {"account": _account_payload_for_business(account)}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible cerrar la cuenta")}, 500
