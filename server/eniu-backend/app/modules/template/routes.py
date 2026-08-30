import json

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import storage
from .services import get_background, get_cover, get_splash, get_template, update_template
from app.shared.i18n import _


template_bp = Blueprint("templates", __name__, url_prefix="/api")


@template_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/template")
@jwt_required()
def catalogue_template(business_id, catalogue_id):
    result, status = get_template(get_jwt_identity(), business_id, catalogue_id)
    return jsonify(result), status


@template_bp.patch("/businesses/<business_id>/catalogues/<catalogue_id>/template")
@jwt_required()
def edit_catalogue_template(business_id, catalogue_id):
    cover = None
    background = None
    splash = None
    if request.mimetype == "multipart/form-data":
        try:
            data = {"theme": json.loads(request.form.get("theme", "{}"))}
            if "splash" in request.form:
                data["splash"] = json.loads(request.form["splash"])
            if "template_key" in request.form:
                data["template_key"] = request.form["template_key"]
            if "remove_cover" in request.form:
                data["remove_cover"] = request.form["remove_cover"].lower() in {"true", "1"}
            if "remove_background" in request.form:
                data["remove_background"] = request.form["remove_background"].lower() in {"true", "1"}
            if "remove_splash" in request.form:
                data["remove_splash"] = request.form["remove_splash"].lower() in {"true", "1"}
        except json.JSONDecodeError:
            return jsonify({"message": _("La configuración visual no es válida")}), 400
        cover = request.files.get("cover")
        background = request.files.get("background")
        splash = request.files.get("splash")
    else:
        data = request.get_json(silent=True)
    result, status = update_template(
        get_jwt_identity(), business_id, catalogue_id, data, cover, background, splash
    )
    return jsonify(result), status


@template_bp.get("/catalogues/<catalogue_id>/cover")
@jwt_required()
def catalogue_cover(catalogue_id):
    filename = get_cover(get_jwt_identity(), catalogue_id)
    if not filename:
        return jsonify({"message": _("Portada no encontrada")}), 404
    return storage.serve_file(current_app.config["CATALOGUE_COVER_FOLDER"], filename, private=True)


@template_bp.get("/catalogues/<catalogue_id>/background")
@jwt_required()
def catalogue_background(catalogue_id):
    filename = get_background(get_jwt_identity(), catalogue_id)
    if not filename:
        return jsonify({"message": _("Fondo no encontrado")}), 404
    return storage.serve_file(current_app.config["CATALOGUE_BACKGROUND_FOLDER"], filename, private=True)


@template_bp.get("/catalogues/<catalogue_id>/splash")
@jwt_required()
def catalogue_splash(catalogue_id):
    filename = get_splash(get_jwt_identity(), catalogue_id)
    if not filename:
        return jsonify({"message": _("Bienvenida no encontrada")}), 404
    return storage.serve_file(current_app.config["CATALOGUE_SPLASH_FOLDER"], filename, private=True)
