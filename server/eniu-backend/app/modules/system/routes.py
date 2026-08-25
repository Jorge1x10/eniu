from flask import Blueprint, jsonify


system_bp = Blueprint("system", __name__, url_prefix="/api")


@system_bp.get("/health")
def health():
    return jsonify({"status": "ok", "service": "eniu-api"}), 200
