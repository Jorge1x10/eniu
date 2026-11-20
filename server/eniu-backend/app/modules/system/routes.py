from flask import Blueprint, jsonify, request

from app.shared.i18n import _
from .client_version import (
    MOBILE_PLATFORMS,
    format_version,
    normalize_platform,
    parse_version,
    platform_policy,
    version_status,
)


system_bp = Blueprint("system", __name__, url_prefix="/api")


@system_bp.get("/health")
def health():
    return jsonify({"status": "ok", "service": "eniu-api"}), 200


@system_bp.get("/app/version")
def app_version():
    """Dice a la app si su versión sigue admitida.

    La app lo consulta al abrirse y al volver del segundo plano. No requiere
    sesión: tiene que poder responder antes de iniciarla.
    """
    platform = normalize_platform(request.args.get("platform"))
    if not platform:
        return jsonify({
            "message": _("Plataforma no válida"),
            "platforms": list(MOBILE_PLATFORMS),
        }), 400

    version = parse_version(request.args.get("version"))
    policy = platform_policy(platform)
    response = jsonify({
        "status": version_status(platform, version),
        "platform": platform,
        "version": format_version(version),
        "min_version": format_version(policy["min_version"]),
        "latest_version": format_version(policy["latest_version"]),
        "store_url": policy["store_url"],
    })
    # Corto a propósito: subir la versión mínima tiene que notarse pronto.
    response.headers["Cache-Control"] = "public, max-age=300"
    return response, 200
