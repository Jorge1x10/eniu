from uuid import UUID

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.db import db
from app.modules.users.model import User


PROFILE_FIELDS = {"name", "username", "phone_number"}


def _clean_optional(value, field, max_length):
    if value is not None and not isinstance(value, str):
        raise ValueError(f"{field} debe ser texto")
    cleaned = " ".join((value or "").strip().split()) or None
    if cleaned and len(cleaned) > max_length:
        raise ValueError(f"{field} no puede superar {max_length} caracteres")
    return cleaned


def update_current_user(user_id, data):
    unknown = set(data) - PROFILE_FIELDS
    if unknown:
        return {"message": "Se enviaron campos no permitidos", "fields": sorted(unknown)}, 400

    try:
        user = db.session.get(User, UUID(str(user_id)))
    except (TypeError, ValueError):
        user = None
    if not user:
        return {"message": "Usuario no encontrado"}, 404

    try:
        if "name" in data:
            user.name = _clean_optional(data["name"], "El nombre", 50)

        if "username" in data:
            username = _clean_optional(data["username"], "El nombre de usuario", 50)
            if username and len(username) < 4:
                return {"message": "El nombre de usuario debe tener al menos 4 caracteres"}, 400
            if username and not all(character.isalnum() or character in "._" for character in username):
                return {"message": "El nombre de usuario contiene caracteres no permitidos"}, 400
            duplicate = User.query.filter(
                db.func.lower(User.username) == username.lower(),
                User.id != user.id,
            ).first() if username else None
            if duplicate:
                return {"message": "El nombre de usuario ya está registrado"}, 409
            user.username = username

        if "phone_number" in data:
            phone = _clean_optional(data["phone_number"], "El teléfono", 20)
            duplicate = User.query.filter(
                User.phone_number == phone,
                User.id != user.id,
            ).first() if phone else None
            if duplicate:
                return {"message": "El teléfono ya está registrado"}, 409
            user.phone_number = phone

        db.session.commit()
        return {"message": "Perfil actualizado correctamente", "user": user.to_dict()}, 200
    except ValueError as error:
        db.session.rollback()
        return {"message": str(error)}, 400
    except IntegrityError:
        db.session.rollback()
        return {"message": "El nombre de usuario o teléfono ya está registrado"}, 409
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": "No fue posible actualizar el perfil"}, 500
