import hashlib
import hmac

from flask import current_app


def _secret():
    value = current_app.config.get("ANALYTICS_TOKEN_SECRET") or current_app.config.get("SECRET_KEY")
    if not value:
        raise RuntimeError("ANALYTICS_TOKEN_SECRET is required")
    return str(value).encode("utf-8")


def protected_value(context, value):
    message = f"{context}:{value}".encode("utf-8")
    return hmac.new(_secret(), message, hashlib.sha256).hexdigest()


def tracking_key(catalogue_id, entity_type, entity_id):
    return protected_value("tracking", f"{catalogue_id}:{entity_type}:{entity_id}")


def secure_equal(left, right):
    return bool(left and right and hmac.compare_digest(left, right))
