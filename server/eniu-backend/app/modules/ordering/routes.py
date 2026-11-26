from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_limiter.util import get_remote_address

from app.extensions import limiter
from app.shared.i18n import _

from .services import (
    cancel_order_item,
    close_account,
    create_table,
    delete_table,
    device_hash,
    diner_account,
    diner_orders,
    get_public_table,
    list_tables,
    live_orders,
    place_order,
    regenerate_table_qr,
    set_ordering,
    update_order_status,
    update_table,
    valid_device_token,
)
from .stats import order_stats
from .takeaway import diner_takeaway_orders, get_public_takeaway, place_takeaway_order

ordering_bp = Blueprint("ordering", __name__, url_prefix="/api")

# El navegador del comensal genera este token una vez y lo guarda. Identifica
# el teléfono, no a la persona, y el servidor sólo guarda su hash.
DINER_HEADER = "X-Eniu-Diner"


def _device_token():
    return request.headers.get(DINER_HEADER)


def _device_limit_key():
    """Los límites del comensal van por teléfono, no por IP.

    En un restaurante todos los comensales comparten la IP del Wi-Fi: un
    límite por IP bloquearía al local lleno. Sin token válido se cae a la IP.
    """
    token = _device_token()
    if valid_device_token(token):
        return f"diner:{device_hash(token)}"
    return f"ip:{get_remote_address()}"


def _table_limit_key():
    return f"table:{request.view_args.get('qr_token', '')}"


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _version_arg():
    value = request.args.get("version")
    try:
        return int(value) if value is not None else None
    except ValueError:
        return None


def _private(payload, status):
    """Respuestas del comensal: son suyas, ningún caché intermedio las guarda."""
    response = jsonify(payload)
    response.headers["Cache-Control"] = "no-store"
    return response, status


# --- Comensal --------------------------------------------------------------------


@ordering_bp.get("/public/tables/<qr_token>")
@limiter.limit("60 per minute", key_func=_device_limit_key)
def public_table(qr_token):
    return _private(*get_public_table(qr_token))


@ordering_bp.post("/public/tables/<qr_token>/orders")
@limiter.limit("10 per minute", key_func=_device_limit_key)
@limiter.limit("120 per hour", key_func=_table_limit_key)
def public_place_order(qr_token):
    if request.content_length and request.content_length > 32 * 1024:
        return _private({"message": _("El pedido es demasiado grande")}, 413)
    return _private(*place_order(qr_token, _device_token(), request.get_json(silent=True)))


@ordering_bp.get("/public/tables/<qr_token>/orders")
@limiter.limit("30 per minute", key_func=_device_limit_key)
def public_diner_orders(qr_token):
    return _private(*diner_orders(qr_token, _device_token(), _version_arg()))


@ordering_bp.get("/public/tables/<qr_token>/account")
@limiter.limit("30 per minute", key_func=_device_limit_key)
def public_diner_account(qr_token):
    return _private(*diner_account(qr_token, _device_token()))


def _menu_limit_key():
    return f"takeaway:{request.view_args.get('public_slug', '')}"


@ordering_bp.get("/public/takeaway/<public_slug>")
@limiter.limit("60 per minute", key_func=_device_limit_key)
def public_takeaway(public_slug):
    return _private(*get_public_takeaway(public_slug))


@ordering_bp.post("/public/takeaway/<public_slug>/orders")
@limiter.limit("5 per minute", key_func=_device_limit_key)
@limiter.limit("60 per hour", key_func=_menu_limit_key)
def public_place_takeaway_order(public_slug):
    if request.content_length and request.content_length > 32 * 1024:
        return _private({"message": _("El pedido es demasiado grande")}, 413)
    return _private(*place_takeaway_order(public_slug, _device_token(), request.get_json(silent=True)))


@ordering_bp.get("/public/takeaway/<public_slug>/orders")
@limiter.limit("30 per minute", key_func=_device_limit_key)
def public_takeaway_orders(public_slug):
    return _private(*diner_takeaway_orders(public_slug, _device_token()))


# --- Negocio ----------------------------------------------------------------------


@ordering_bp.get("/businesses/<business_id>/tables")
@jwt_required()
def get_tables(business_id):
    result, status = list_tables(get_jwt_identity(), business_id)
    return jsonify(result), status


@ordering_bp.post("/businesses/<business_id>/tables")
@jwt_required()
def new_table(business_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    result, status = create_table(get_jwt_identity(), business_id, data)
    return jsonify(result), status


@ordering_bp.patch("/businesses/<business_id>/tables/<table_id>")
@jwt_required()
def edit_table(business_id, table_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    result, status = update_table(get_jwt_identity(), business_id, table_id, data)
    return jsonify(result), status


@ordering_bp.post("/businesses/<business_id>/tables/<table_id>/regenerate-qr")
@jwt_required()
def new_table_qr(business_id, table_id):
    result, status = regenerate_table_qr(get_jwt_identity(), business_id, table_id)
    return jsonify(result), status


@ordering_bp.delete("/businesses/<business_id>/tables/<table_id>")
@jwt_required()
def remove_table(business_id, table_id):
    result, status = delete_table(get_jwt_identity(), business_id, table_id)
    return jsonify(result), status


@ordering_bp.patch("/businesses/<business_id>/ordering")
@jwt_required()
def toggle_ordering(business_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    result, status = set_ordering(get_jwt_identity(), business_id, data)
    return jsonify(result), status


@ordering_bp.get("/businesses/<business_id>/orders/stats")
@jwt_required()
def get_order_stats(business_id):
    """Lo más pedido, ventas y horas pico de los pedidos aceptados (`?from=&to=`)."""
    result, status = order_stats(get_jwt_identity(), business_id, request.args)
    return jsonify(result), status


@ordering_bp.get("/businesses/<business_id>/orders/live")
@jwt_required()
def get_live_orders(business_id):
    result, status = live_orders(get_jwt_identity(), business_id, _version_arg())
    response = jsonify(result)
    response.headers["Cache-Control"] = "no-store"
    return response, status


@ordering_bp.patch("/businesses/<business_id>/orders/<order_id>")
@jwt_required()
def edit_order(business_id, order_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    result, status = update_order_status(get_jwt_identity(), business_id, order_id, data.get("status"))
    return jsonify(result), status


@ordering_bp.post("/businesses/<business_id>/orders/<order_id>/items/<item_id>/cancel")
@jwt_required()
def cancel_item(business_id, order_id, item_id):
    result, status = cancel_order_item(get_jwt_identity(), business_id, order_id, item_id)
    return jsonify(result), status


@ordering_bp.post("/businesses/<business_id>/accounts/<account_id>/close")
@jwt_required()
def close_table_account(business_id, account_id):
    result, status = close_account(get_jwt_identity(), business_id, account_id)
    return jsonify(result), status
