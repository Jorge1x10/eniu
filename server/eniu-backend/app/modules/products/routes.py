from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import storage
from .services import (
    create_product,
    delete_product,
    get_product,
    get_product_image,
    list_products,
    update_product,
)
from app.shared.i18n import _


product_bp = Blueprint("products", __name__, url_prefix="/api")


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _request_body():
    if request.mimetype != "multipart/form-data":
        return _json_body(), []
    data = request.form.to_dict()
    for field in ("price", "category_id"):
        if field in data and data[field] == "":
            data[field] = None
    if "is_available" in data:
        normalized = data["is_available"].lower()
        if normalized in {"true", "1"}:
            data["is_available"] = True
        elif normalized in {"false", "0"}:
            data["is_available"] = False
    return data, request.files.getlist("images")


@product_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/products")
@jwt_required()
def get_catalogue_products(business_id, catalogue_id):
    result, status_code = list_products(
        get_jwt_identity(),
        business_id,
        catalogue_id,
        request.args.get("category_id"),
    )
    return jsonify(result), status_code


@product_bp.post("/businesses/<business_id>/catalogues/<catalogue_id>/products")
@jwt_required()
def new_product(business_id, catalogue_id):
    data, images = _request_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    result, status_code = create_product(
        get_jwt_identity(), business_id, catalogue_id, data, images
    )
    return jsonify(result), status_code


@product_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/products/<product_id>")
@jwt_required()
def get_catalogue_product(business_id, catalogue_id, product_id):
    result, status_code = get_product(
        get_jwt_identity(), business_id, catalogue_id, product_id
    )
    return jsonify(result), status_code


@product_bp.patch("/businesses/<business_id>/catalogues/<catalogue_id>/products/<product_id>")
@jwt_required()
def edit_product(business_id, catalogue_id, product_id):
    data, images = _request_body()
    if data is None:
        return jsonify({"message": _("Debes enviar información en formato JSON")}), 400
    result, status_code = update_product(
        get_jwt_identity(), business_id, catalogue_id, product_id, data, images
    )
    return jsonify(result), status_code


@product_bp.delete("/businesses/<business_id>/catalogues/<catalogue_id>/products/<product_id>")
@jwt_required()
def remove_product(business_id, catalogue_id, product_id):
    result, status_code = delete_product(
        get_jwt_identity(), business_id, catalogue_id, product_id
    )
    return jsonify(result), status_code


@product_bp.get("/products/<product_id>/images/<filename>")
def product_image(product_id, filename):
    stored_filename = get_product_image(product_id, filename)
    if not stored_filename:
        return jsonify({"message": _("Imagen no encontrada")}), 404
    return storage.serve_file(
        current_app.config["PRODUCT_UPLOAD_FOLDER"], stored_filename, immutable=True
    )
