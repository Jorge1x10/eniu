from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .services import create_promotion, delete_promotion, list_promotions, update_promotion
from app.shared.i18n import _


promotion_bp = Blueprint("promotions", __name__, url_prefix="/api")


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@promotion_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/promotions")
@jwt_required()
def get_catalogue_promotions(business_id, catalogue_id):
    result, status_code = list_promotions(get_jwt_identity(), business_id, catalogue_id)
    return jsonify(result), status_code


@promotion_bp.post("/businesses/<business_id>/catalogues/<catalogue_id>/promotions")
@jwt_required()
def new_promotion(business_id, catalogue_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    result, status_code = create_promotion(get_jwt_identity(), business_id, catalogue_id, data)
    return jsonify(result), status_code


@promotion_bp.patch("/businesses/<business_id>/catalogues/<catalogue_id>/promotions/<promotion_id>")
@jwt_required()
def edit_promotion(business_id, catalogue_id, promotion_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    result, status_code = update_promotion(get_jwt_identity(), business_id, catalogue_id, promotion_id, data)
    return jsonify(result), status_code


@promotion_bp.delete("/businesses/<business_id>/catalogues/<catalogue_id>/promotions/<promotion_id>")
@jwt_required()
def remove_promotion(business_id, catalogue_id, promotion_id):
    result, status_code = delete_promotion(get_jwt_identity(), business_id, catalogue_id, promotion_id)
    return jsonify(result), status_code
