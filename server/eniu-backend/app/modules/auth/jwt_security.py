from uuid import UUID

from flask import jsonify

from app.database.db import db
from app.extensions import jwt
from app.modules.users.model import User
from app.shared.i18n import _


def _get_user(identity):
    try:
        return db.session.get(User, UUID(str(identity)))
    except (TypeError, ValueError):
        return None


def configure_jwt_security():
    @jwt.additional_claims_loader
    def add_auth_version(identity):
        user = _get_user(identity)
        return {"auth_version": user.auth_version if user else -1}

    @jwt.token_in_blocklist_loader
    def reject_revoked_version(_header, payload):
        user = _get_user(payload.get("sub"))
        return not user or payload.get("auth_version") != user.auth_version

    @jwt.revoked_token_loader
    def revoked_token(_header, _payload):
        return jsonify({"message": _("La sesión ya no es válida")}), 401

    @jwt.invalid_token_loader
    def invalid_token(_reason):
        return jsonify({"message": _("La sesión no es válida")}), 401
