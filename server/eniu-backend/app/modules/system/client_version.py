"""Versión de la app móvil que hace cada petición, y versión mínima admitida.

La app manda dos cabeceras en cada llamada a la API:

    X-Eniu-Platform: ios | android
    X-Eniu-App-Version: 2.3.0

Con ellas el backend puede:

- **Obligar a actualizar.** Si la versión es menor que la mínima de su
  plataforma, la petición recibe `426 Upgrade Required` con
  `code: "app_update_required"` y el enlace a la tienda. La app lo detecta y
  muestra una pantalla de bloqueo en vez de fallar a medias.
- **Mantener compatibilidad a propósito.** `client_version()` deja a una ruta
  responder distinto a una versión vieja mientras siga admitida, en lugar de
  romperla sin saberlo (ver `docs/API_VERSIONING.md`).

Lo que no puede hacer: las versiones publicadas antes de este cambio (2.2.0 y
anteriores) no mandan las cabeceras, y una petición sin ellas no se bloquea
nunca, porque también es lo que manda el panel web, el menú público o un
webhook. Por eso conviene publicar esto en las tiendas *antes* de cualquier
cambio incompatible: cuantos más usuarios tengan una versión que lo entienda,
más se podrá controlar después.
"""

import re

from flask import current_app, g, has_request_context, jsonify, request

from app.shared.i18n import _

PLATFORM_HEADER = "X-Eniu-Platform"
VERSION_HEADER = "X-Eniu-App-Version"
MOBILE_PLATFORMS = ("ios", "android")

# Siempre accesibles: la propia comprobación de versión y el monitoreo.
_EXEMPT_PATHS = {"/api/app/version", "/api/health"}

_VERSION_RE = re.compile(r"^\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?")


def parse_version(value):
    """`"2.3.1"` -> `(2, 3, 1)`. Acepta `"3"`, `"3.1"` y sufijos como `"3.0.0-beta.2"`.

    Devuelve None si no empieza por un número: una versión ilegible no se
    compara con nada, para no bloquear a nadie por un error de formato.
    """
    if not isinstance(value, str):
        return None
    match = _VERSION_RE.match(value)
    if not match:
        return None
    return tuple(int(part or 0) for part in match.groups())


def format_version(version):
    return ".".join(str(part) for part in version) if version else None


def normalize_platform(value):
    if not isinstance(value, str):
        return None
    value = value.strip().lower()
    return value if value in MOBILE_PLATFORMS else None


def platform_policy(platform):
    """Versión mínima, última publicada y enlace de tienda de una plataforma."""
    config = current_app.config
    suffix = platform.upper()
    minimum = parse_version(
        config.get(f"MOBILE_MIN_VERSION_{suffix}") or config.get("MOBILE_MIN_VERSION")
    )
    latest = parse_version(
        config.get(f"MOBILE_LATEST_VERSION_{suffix}") or config.get("MOBILE_LATEST_VERSION")
    )
    return {
        "min_version": minimum,
        "latest_version": latest,
        "store_url": config.get(f"MOBILE_STORE_URL_{suffix}"),
    }


def version_status(platform, version):
    """`"update_required"`, `"update_available"` u `"ok"`."""
    policy = platform_policy(platform)
    if version and policy["min_version"] and version < policy["min_version"]:
        return "update_required"
    if version and policy["latest_version"] and version < policy["latest_version"]:
        return "update_available"
    return "ok"


def client_version():
    """`(platform, version)` de la app que hace la petición, o None.

    None significa "no es la app móvil o es anterior a las cabeceras": el
    panel web, el menú público, un webhook o la app 2.2.0 y anteriores.
    """
    if not has_request_context():
        return None
    if "eniu_client" not in g:
        platform = normalize_platform(request.headers.get(PLATFORM_HEADER))
        version = parse_version(request.headers.get(VERSION_HEADER))
        g.eniu_client = (platform, version) if platform and version else None
    return g.eniu_client


def update_required_response(platform, version):
    policy = platform_policy(platform)
    return jsonify({
        "message": _("Hay una versión nueva de Eniu. Actualiza la app para seguir usándola."),
        "code": "app_update_required",
        "platform": platform,
        "version": format_version(version),
        "min_version": format_version(policy["min_version"]),
        "store_url": policy["store_url"],
    }), 426


def enforce_minimum_version():
    """`before_request`: corta las peticiones de una app más vieja que la mínima."""
    if request.method == "OPTIONS" or not request.path.startswith("/api/"):
        return None
    if request.path in _EXEMPT_PATHS:
        return None
    client = client_version()
    if not client:
        return None
    platform, version = client
    if version_status(platform, version) == "update_required":
        return update_required_response(platform, version)
    return None
