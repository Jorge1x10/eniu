from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.shared.i18n import _

from .services import delete_current_user, update_current_user


users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.patch("/me")
@jwt_required()
def update_me():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return jsonify({"message": _("No se enviaron datos")}), 400

    result, status = update_current_user(get_jwt_identity(), data)
    return jsonify(result), status

@users_bp.delete("/me")
@jwt_required()
def delete_me():
    data = request.get_json(silent=True) or {}
    result, status = delete_current_user(
        get_jwt_identity(), data.get("password"), data.get("confirmation")
    )
    return jsonify(result), status
