from uuid import UUID

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app import storage
from app.database.db import db
from app.extensions import bcrypt
from app.modules.billing.services import cancel_subscription_for_user
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.products.model import Product
from app.modules.template.model import CatalogueTemplate
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

CONFIRMATION_WORD = "ELIMINAR"


def _stored_files(user):
    """Archivos subidos por el usuario, con la carpeta donde vive cada uno.

    Se recogen antes de borrar las filas: las cascadas de la base limpian los
    registros pero no tocan el almacenamiento, y sin esto las fotos seguirían
    ocupando espacio para siempre sin nadie que las reclame.
    """
    config = current_app.config
    businesses = Business.query.filter_by(owner_id=user.id).all()
    business_ids = [business.id for business in businesses]
    files = [
        (config["BUSINESS_UPLOAD_FOLDER"], business.photo_filename)
        for business in businesses if business.photo_filename
    ]
    if not business_ids:
        return files

    catalogues = Catalogue.query.filter(Catalogue.business_id.in_(business_ids)).all()
    catalogue_ids = [catalogue.id for catalogue in catalogues]
    if not catalogue_ids:
        return files

    for config_row in CatalogueTemplate.query.filter(CatalogueTemplate.catalogue_id.in_(catalogue_ids)).all():
        files.append((config["CATALOGUE_COVER_FOLDER"], config_row.cover_filename))
        files.append((config["CATALOGUE_BACKGROUND_FOLDER"], config_row.background_filename))
        files.append((config["CATALOGUE_SPLASH_FOLDER"], config_row.splash_filename))

    for product in Product.query.filter(Product.catalogue_id.in_(catalogue_ids)).all():
        for picture in product.picture_metadata():
            files.append((config["PRODUCT_UPLOAD_FOLDER"], picture.get("filename")))

    return [(folder, filename) for folder, filename in files if filename]


def delete_current_user(user_id, password=None, confirmation=None):
    """Elimina la cuenta y todo lo que cuelga de ella, sin vuelta atrás."""
    try:
        user = db.session.get(User, UUID(str(user_id)))
    except (TypeError, ValueError):
        return {"message": "El identificador del usuario no es válido"}, 400
    if not user:
        return {"message": "Usuario no encontrado"}, 404

    # Quien entró con Google o Apple no tiene contraseña; exigirla lo dejaría
    # sin poder borrar su cuenta, que es justo lo que no puede pasar.
    if user.password:
        if not isinstance(password, str) or not bcrypt.check_password_hash(user.password, password):
            return {"message": "La contraseña no es correcta"}, 403
    elif not isinstance(confirmation, str) or confirmation.strip().upper() != CONFIRMATION_WORD:
        return {"message": f"Escribe {CONFIRMATION_WORD} para confirmar"}, 400

    cancelled, detail = cancel_subscription_for_user(user)
    if not cancelled:
        current_app.logger.warning("No se pudo cancelar la suscripción al borrar la cuenta: %s", detail)
        return {"message": "No fue posible cancelar tu suscripción. Inténtalo de nuevo en unos minutos."}, 502

    try:
        files = _stored_files(user)
        db.session.delete(user)
        db.session.commit()
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": "No fue posible eliminar la cuenta"}, 500

    # Los archivos se borran después de confirmar la transacción: si el
    # almacenamiento falla preferimos dejar huérfano un archivo antes que
    # revivir una cuenta que el usuario ya dio por eliminada.
    for folder, filename in files:
        try:
            storage.delete_file(folder, filename)
        except OSError as error:
            current_app.logger.warning("No se pudo borrar %s: %s", filename, error)

    return {"message": "Tu cuenta y todos sus datos se eliminaron correctamente"}, 200
