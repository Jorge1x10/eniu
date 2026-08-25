from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .services import (
    create_category,
    delete_category,
    get_category,
    list_categories,
    update_category,
)


category_bp = Blueprint("categories", __name__, url_prefix="/api")


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@category_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/categories")
@jwt_required()
def get_catalogue_categories(business_id, catalogue_id):
    result, status_code = list_categories(
        get_jwt_identity(), business_id, catalogue_id
    )
    return jsonify(result), status_code


@category_bp.post("/businesses/<business_id>/catalogues/<catalogue_id>/categories")
@jwt_required()
def new_category(business_id, catalogue_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": "Debes enviar información en formato JSON"}), 400
    result, status_code = create_category(
        get_jwt_identity(), business_id, catalogue_id, data
    )
    return jsonify(result), status_code


@category_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/categories/<category_id>")
@jwt_required()
def get_catalogue_category(business_id, catalogue_id, category_id):
    result, status_code = get_category(
        get_jwt_identity(), business_id, catalogue_id, category_id
    )
    return jsonify(result), status_code


@category_bp.patch("/businesses/<business_id>/catalogues/<catalogue_id>/categories/<category_id>")
@jwt_required()
def edit_category(business_id, catalogue_id, category_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": "Debes enviar información en formato JSON"}), 400
    result, status_code = update_category(
        get_jwt_identity(), business_id, catalogue_id, category_id, data
    )
    return jsonify(result), status_code


@category_bp.delete("/businesses/<business_id>/catalogues/<catalogue_id>/categories/<category_id>")
@jwt_required()
def remove_category(business_id, catalogue_id, category_id):
    result, status_code = delete_category(
        get_jwt_identity(), business_id, catalogue_id, category_id
    )
    return jsonify(result), status_code
