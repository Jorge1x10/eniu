from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.modules.billing.guards import ensure_can_create_business
from app.modules.business.model import Business
from flask import current_app
from uuid import UUID, uuid4
from app import images, storage
from app.database.db import db
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.utils import secure_filename
from app.shared.i18n import _


ALLOWED_PHOTO_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_PHOTO_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024

DEFAULT_CURRENCY = "MXN"
DEFAULT_TIMEZONE = "America/Mexico_City"


def _clean_currency(value):
    """Normaliza un código de moneda, o devuelve None si no lo es.

    ISO 4217 son tres letras y se escriben en mayúsculas. No se valida contra
    una lista cerrada a propósito: la lista cambia (monedas que nacen, países
    que redenominan) y quedarse corto le impediría publicar precios a un
    negocio cuya moneda es perfectamente real. Quien elige de la lista del
    cliente nunca llega aquí con algo raro; esto sólo ataja lo imposible.
    """
    if not value:
        return None
    code = value.strip().upper()
    return code if len(code) == 3 and code.isalpha() else None


def _clean_timezone(value):
    """Comprueba que la zona horaria existe en la base de datos IANA.

    Sin esto se puede guardar cualquier cadena de hasta 64 caracteres, y el
    error no sale al guardar sino después: las analíticas resuelven la zona
    para cortar los días y responden 400 con el panel entero ya cargado.
    """
    if not value:
        return None
    name = value.strip()
    if name == "UTC":
        return name
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return None
    return name


def _photo_size(photo):
    position = photo.stream.tell()
    photo.stream.seek(0, 2)
    size = photo.stream.tell()
    photo.stream.seek(position)
    return size


def _detected_photo_type(photo):
    position = photo.stream.tell()
    photo.stream.seek(0)
    header = photo.stream.read(12)
    photo.stream.seek(position)
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if header.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "webp"
    return None

def create_business(owner_id, data):
    name = data["name"].strip()

    if not name:
        return {
            "message": _("El nombre del negocio es obligatorio")
        }, 400

    blocked = ensure_can_create_business(owner_id)
    if blocked:
        return blocked

    existing_business = Business.query.filter_by(
        owner_id=UUID(owner_id),
        name=name
    ).first()

    if existing_business:
        return {
            "message": _("Ya tienes un negocio con ese nombre")
        }, 409

    # La moneda y la zona horaria llegan del alta: el cliente las propone a
    # partir del dispositivo y el usuario las confirma. Sin ellas el negocio
    # nacería en pesos mexicanos y en el huso de Ciudad de México, que es
    # correcto donde nació Eniu y falso en todos los demás sitios.
    currency = _clean_currency(data.get("currency"))
    if data.get("currency") and not currency:
        return {"message": _("La moneda debe tener un código de 3 letras")}, 400

    timezone_name = _clean_timezone(data.get("timezone"))
    if data.get("timezone") and not timezone_name:
        return {"message": _("La zona horaria no es válida")}, 400

    business = Business(
        name = name,
        owner_id = UUID(owner_id),
        currency = currency or DEFAULT_CURRENCY,
        timezone = timezone_name or DEFAULT_TIMEZONE,
    )
    try:
        db.session.add(business)
        db.session.commit()

        return {
            "message": _("Negocio registrado correctamente"),
            "business": business.to_dict()
        }, 201

    except SQLAlchemyError:
        db.session.rollback()

        return {
            "message": _("No fue posible registrar el negocio")
        }, 500

def get_businesses_by_owner(owner_id):
    try:
        businesses = (
            Business.query
            .filter_by(owner_id=UUID(owner_id))
            .order_by(Business.created_at.desc())
            .all()
        )

        return {
            "businesses": [
                business.to_dict()
                for business in businesses
            ]
        }, 200

    except (ValueError, TypeError):
        return {
            "message": _("El identificador del usuario no es válido")
        }, 400

    except SQLAlchemyError:
        return {
            "message": _("No fue posible consultar los negocios")
        }, 500


def get_business_by_id(business_id):
    try:
        return db.session.get(Business, UUID(business_id))
    except (ValueError, TypeError):
        return None


def _optional_text(data, field, max_length=None):
    if field not in data:
        return None, False

    value = (data.get(field) or "").strip() or None
    if value and max_length and len(value) > max_length:
        raise ValueError(f"{field} supera el máximo de {max_length} caracteres")

    return value, True


def _delete_photo(filename):
    if not filename:
        return

    storage.delete_file(current_app.config["BUSINESS_UPLOAD_FOLDER"], filename)


def update_business(owner_id, business_id, data, photo=None):
    try:
        owner_uuid = UUID(owner_id)
        business_uuid = UUID(business_id)
    except (ValueError, TypeError):
        return {"message": _("El identificador del negocio no es válido")}, 400

    business = Business.query.filter_by(
        id=business_uuid,
        owner_id=owner_uuid,
    ).first()

    if not business:
        return {"message": _("Negocio no encontrado")}, 404

    new_photo_filename = None
    old_photo_filename = business.photo_filename

    try:
        name, has_name = _optional_text(data, "name", 64)
        if has_name:
            if not name:
                return {"message": _("El nombre del negocio es obligatorio")}, 400

            duplicate = Business.query.filter(
                Business.owner_id == owner_uuid,
                Business.name == name,
                Business.id != business_uuid,
            ).first()
            if duplicate:
                return {"message": _("Ya tienes un negocio con ese nombre")}, 409
            business.name = name

        field_lengths = {
            "address": 500,
            "description": 2000,
            "website": 500,
            "phone": 20,
            "whatsapp": 20,
            "timezone": 64,
        }
        for field, max_length in field_lengths.items():
            value, was_sent = _optional_text(data, field, max_length)
            if was_sent:
                if field == "timezone":
                    if not value:
                        return {"message": _("La zona horaria es obligatoria")}, 400
                    value = _clean_timezone(value)
                    if not value:
                        return {"message": _("La zona horaria no es válida")}, 400
                setattr(business, field, value)

        raw_currency, has_currency = _optional_text(data, "currency", 3)
        if has_currency:
            currency = _clean_currency(raw_currency) if raw_currency else DEFAULT_CURRENCY
            if not currency:
                return {"message": _("La moneda debe tener un código de 3 letras")}, 400
            business.currency = currency

        if "is_active" in data:
            business.is_active = str(data["is_active"]).lower() in {
                "true", "1", "yes", "on"
            }

        if photo and photo.filename:
            safe_name = secure_filename(photo.filename)
            extension = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
            if (
                extension not in ALLOWED_PHOTO_EXTENSIONS
                or photo.mimetype not in ALLOWED_PHOTO_MIMETYPES
            ):
                return {
                    "message": _("La foto debe ser JPG, PNG o WebP")
                }, 400
            expected_type = "jpeg" if extension in {"jpg", "jpeg"} else extension
            if _detected_photo_type(photo) != expected_type:
                return {"message": _("El archivo no contiene una foto válida")}, 400
            if _photo_size(photo) > MAX_PHOTO_BYTES:
                return {"message": _("La foto puede pesar máximo 5 MB")}, 400

            try:
                optimized, extension = images.optimize(photo)
            except images.InvalidImage as error:
                return {"message": str(error)}, 400
            new_photo_filename = f"{uuid4().hex}.{extension}"
            storage.save_file(current_app.config["BUSINESS_UPLOAD_FOLDER"], new_photo_filename, optimized)
            business.photo_filename = new_photo_filename
        elif str(data.get("remove_photo", "false")).lower() in {
            "true", "1", "yes", "on"
        }:
            business.photo_filename = None

        db.session.commit()

        if old_photo_filename != business.photo_filename:
            _delete_photo(old_photo_filename)

        return {
            "message": _("Negocio actualizado correctamente"),
            "business": business.to_dict(),
        }, 200

    except ValueError as error:
        db.session.rollback()
        _delete_photo(new_photo_filename)
        return {"message": str(error)}, 400
    except SQLAlchemyError as error:
        db.session.rollback()
        _delete_photo(new_photo_filename)
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar el negocio")}, 500
