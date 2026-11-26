from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.shared.i18n import _

from .services import (
    add_movement,
    checkout_account,
    close_cash,
    current_cash,
    get_session,
    list_sessions,
    open_cash,
)

cash_bp = Blueprint("cash", __name__, url_prefix="/api/businesses/<business_id>")


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _respond(result_status):
    result, status = result_status
    response = jsonify(result)
    response.headers["Cache-Control"] = "no-store"
    return response, status


def _with_body(handler, *args):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    return _respond(handler(get_jwt_identity(), *args, data))


@cash_bp.get("/cash")
@jwt_required()
def get_cash(business_id):
    """El turno abierto con su reporte en vivo, o el último corte."""
    return _respond(current_cash(get_jwt_identity(), business_id))


@cash_bp.post("/cash/open")
@jwt_required()
def post_open_cash(business_id):
    return _with_body(open_cash, business_id)


@cash_bp.post("/cash/movements")
@jwt_required()
def post_movement(business_id):
    return _with_body(add_movement, business_id)


@cash_bp.post("/cash/close")
@jwt_required()
def post_close_cash(business_id):
    return _with_body(close_cash, business_id)


@cash_bp.get("/cash/sessions")
@jwt_required()
def get_sessions(business_id):
    return _respond(list_sessions(get_jwt_identity(), business_id))


@cash_bp.get("/cash/sessions/<session_id>")
@jwt_required()
def get_one_session(business_id, session_id):
    return _respond(get_session(get_jwt_identity(), business_id, session_id))


@cash_bp.post("/accounts/<account_id>/checkout")
@jwt_required()
def post_checkout(business_id, account_id):
    return _with_body(checkout_account, business_id, account_id)
