from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import limiter
from .services import get_analytics, record_events


analytics_bp = Blueprint("analytics", __name__, url_prefix="/api")


@analytics_bp.post("/public/menus/<public_slug>/analytics/events")
@limiter.limit("60 per minute")
def public_events(public_slug):
    if request.content_length and request.content_length > 32 * 1024:
        return jsonify({"message": "El lote de eventos es demasiado grande"}), 413
    result, status = record_events(public_slug, request.get_json(silent=True))
    return ("", 204) if status == 204 else (jsonify(result), status)


@analytics_bp.get("/businesses/<business_id>/catalogues/<catalogue_id>/analytics")
@jwt_required()
def catalogue_analytics(business_id, catalogue_id):
    unknown = set(request.args) - {"from", "to", "timezone"}
    if unknown:
        return jsonify({"message": "La consulta contiene parámetros no permitidos"}), 400
    result, status = get_analytics(get_jwt_identity(), business_id, catalogue_id, request.args)
    return jsonify(result), status
