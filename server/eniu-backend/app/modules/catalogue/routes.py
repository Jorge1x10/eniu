from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .services import (
    create_catalogue,
    delete_catalogue,
    get_catalogue,
    list_catalogues,
    publish_catalogue,
    unpublish_catalogue,
    update_catalogue,
)
from app.shared.i18n import _


catalogue_bp = Blueprint("catalogues", __name__, url_prefix="/api")


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@catalogue_bp.get("/businesses/<business_id>/catalogues")
@jwt_required()
def get_business_catalogues(business_id):
    result, status_code = list_catalogues(get_jwt_identity(), business_id)
    return jsonify(result), status_code


@catalogue_bp.post("/businesses/<business_id>/catalogues")
@jwt_required()
def new_catalogue(business_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400

    result, status_code = create_catalogue(
        get_jwt_identity(),
        business_id,
        data,
    )
    return jsonify(result), status_code


@catalogue_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>")
@jwt_required()
def get_business_catalogue(business_id, catalogue_id):
    result, status_code = get_catalogue(
        get_jwt_identity(),
        business_id,
        catalogue_id,
    )
    return jsonify(result), status_code


@catalogue_bp.patch("/businesses/<business_id>/catalogues/<catalogue_id>")
@jwt_required()
def edit_catalogue(business_id, catalogue_id):
    data = _json_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400

    result, status_code = update_catalogue(
        get_jwt_identity(),
        business_id,
        catalogue_id,
        data,
    )
    return jsonify(result), status_code


@catalogue_bp.delete("/businesses/<business_id>/catalogues/<catalogue_id>")
@jwt_required()
def remove_catalogue(business_id, catalogue_id):
    result, status_code = delete_catalogue(
        get_jwt_identity(),
        business_id,
        catalogue_id,
    )
    return jsonify(result), status_code


@catalogue_bp.post("/businesses/<business_id>/catalogues/<catalogue_id>/publish")
@jwt_required()
def publish_business_catalogue(business_id, catalogue_id):
    result, status_code = publish_catalogue(
        get_jwt_identity(),
        business_id,
        catalogue_id,
    )
    return jsonify(result), status_code


@catalogue_bp.post("/businesses/<business_id>/catalogues/<catalogue_id>/unpublish")
@jwt_required()
def unpublish_business_catalogue(business_id, catalogue_id):
    result, status_code = unpublish_catalogue(
        get_jwt_identity(),
        business_id,
        catalogue_id,
    )
    return jsonify(result), status_code

