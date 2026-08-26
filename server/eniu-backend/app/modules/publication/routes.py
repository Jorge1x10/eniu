from flask import Blueprint, current_app, jsonify, make_response, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import storage
from app.extensions import cache
from config import Config
from .services import (
    change_publication,
    get_preview,
    get_public_cover,
    get_public_background,
    get_public_menu,
    get_public_product_image,
    get_publication,
)


publication_bp = Blueprint("publication", __name__, url_prefix="/api")


@publication_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/publication")
@jwt_required()
def publication_status(business_id, catalogue_id):
    result, status = get_publication(get_jwt_identity(), business_id, catalogue_id)
    return jsonify(result), status


@publication_bp.patch("/businesses/<business_id>/catalogues/<catalogue_id>/publication")
@jwt_required()
def update_publication(business_id, catalogue_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) != {"is_published"}:
        return jsonify({"message": "Debes enviar únicamente is_published"}), 400
    result, status = change_publication(
        get_jwt_identity(), business_id, catalogue_id, data["is_published"]
    )
    return jsonify(result), status


@publication_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/preview")
@jwt_required()
def catalogue_preview(business_id, catalogue_id):
    result, status = get_preview(get_jwt_identity(), business_id, catalogue_id)
    response = make_response(jsonify(result), status)
    response.headers["Cache-Control"] = "no-cache"
    return response


@publication_bp.get("/public/menus/<public_slug>")
@cache.cached(timeout=Config.PUBLIC_MENU_CACHE_SECONDS)
def public_menu(public_slug):
    result, status = get_public_menu(public_slug)
    response = make_response(jsonify(result), status)
    response.headers["Cache-Control"] = f"public, max-age={Config.PUBLIC_MENU_CACHE_SECONDS}"
    return response


@publication_bp.get("/public/menus/<public_slug>/cover")
def public_cover(public_slug):
    filename = get_public_cover(public_slug)
    if not filename:
        return jsonify({"message": "Imagen no encontrada"}), 404
    return storage.serve_file(current_app.config["CATALOGUE_COVER_FOLDER"], filename)


@publication_bp.get("/public/menus/<public_slug>/background")
def public_background(public_slug):
    filename = get_public_background(public_slug)
    if not filename:
        return jsonify({"message": "Imagen no encontrada"}), 404
    return storage.serve_file(current_app.config["CATALOGUE_BACKGROUND_FOLDER"], filename)


@publication_bp.get("/public/menus/<public_slug>/product-images/<int:section_index>/<int:product_index>")
def public_product_image(public_slug, section_index, product_index):
    filename = get_public_product_image(public_slug, section_index, product_index)
    if not filename:
        return jsonify({"message": "Imagen no encontrada"}), 404
    return storage.serve_file(current_app.config["PRODUCT_UPLOAD_FOLDER"], filename)
