"""Traducción de los mensajes que la API devuelve al usuario.

El catálogo usa el texto en español como clave, igual que gettext: así los
mensajes se leen tal cual en el código que los produce y, si a una cadena le
falta traducción, sale en español en lugar de romperse o mostrar una clave.

El idioma sale, en este orden, de la preferencia guardada en la cuenta, de la
cabecera `Accept-Language` y del idioma por omisión. La preferencia de la
cuenta manda porque es la que el usuario eligió a propósito: su teléfono puede
estar en inglés y aun así querer Eniu en español.
"""

from flask import g, has_request_context, request

from app.shared.translations import CATALOGS

DEFAULT_LANGUAGE = "es"
SUPPORTED_LANGUAGES = ("es", "en")

_REQUEST_CACHE_KEY = "eniu_language"


def normalize_language(value):
    """Reduce una etiqueta de idioma a un código soportado, o None.

    Acepta lo que llega de un navegador o de un dispositivo (`en-US`, `es_MX`)
    y se queda con la parte que nos importa.
    """
    if not isinstance(value, str):
        return None
    code = value.strip().replace("_", "-").split("-")[0].lower()
    return code if code in SUPPORTED_LANGUAGES else None


def _language_from_header():
    if not has_request_context():
        return None
    header = request.headers.get("Accept-Language")
    if not header:
        return None
    # `es-MX,es;q=0.9,en;q=0.8` -> se respeta el orden de preferencia del
    # cliente y se toma el primero que sepamos hablar.
    for chunk in header.split(","):
        language = normalize_language(chunk.split(";")[0])
        if language:
            return language
    return None


def _language_from_session():
    """Idioma de la cuenta autenticada, si la petición trae un token válido.

    Se verifica el JWT de forma opcional porque esto corre también en rutas
    públicas y en respuestas de error que se emiten antes de autenticar.
    """
    if not has_request_context():
        return None
    try:
        from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if not identity:
            return None

        from uuid import UUID

        from app.database.db import db
        from app.modules.users.model import User

        user = db.session.get(User, UUID(str(identity)))
        return normalize_language(user.language) if user else None
    except Exception:
        # Un token vencido, revocado o mal formado no debe impedir que se
        # responda: el idioma es lo de menos cuando la sesión ya falló.
        return None


def resolve_language():
    """Idioma de la petición en curso, resuelto una sola vez por petición."""
    if not has_request_context():
        return DEFAULT_LANGUAGE

    cached = getattr(g, _REQUEST_CACHE_KEY, None)
    if cached:
        return cached

    language = _language_from_session() or _language_from_header() or DEFAULT_LANGUAGE
    setattr(g, _REQUEST_CACHE_KEY, language)
    return language


def set_language(language):
    """Fija el idioma de la petición, saltándose la resolución automática.

    Sirve cuando ya se sabe a quién se le habla y no hay sesión de la que
    deducirlo, como al redactar un correo desde una tarea de fondo.
    """
    normalized = normalize_language(language)
    if normalized and has_request_context():
        setattr(g, _REQUEST_CACHE_KEY, normalized)
    return normalized or DEFAULT_LANGUAGE


def translate(message, language=None, **params):
    """Traduce `message` y le aplica `params` con `str.format`.

    `message` es el texto en español: es la clave del catálogo y también el
    respaldo si falta la traducción.
    """
    target = normalize_language(language) or resolve_language()
    text = CATALOGS.get(target, {}).get(message, message)
    if params:
        try:
            return text.format(**params)
        except (IndexError, KeyError):
            # Una traducción con marcadores que no cuadran no debe tumbar la
            # respuesta; se cae al español, que sí los tiene bien.
            return message.format(**params)
    return text


# Alias corto, por convención de gettext, para no ensuciar los sitios de uso.
_ = translate
