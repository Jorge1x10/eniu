import re
from uuid import UUID, uuid4

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.utils import secure_filename

from app import storage
from app.database.db import db
from app.modules.billing.guards import ensure_template_allowed
from app.modules.catalogue.services import catalogue_access
from app.modules.template.model import CatalogueTemplate
from app.modules.catalogue.model import Catalogue
from app.modules.business.model import Business


TEMPLATE_KEYS = {
    "modern", "minimal", "elegant", "bistro", "bold", "natural",
    "retro", "luxury",
}
FONT_KEYS = {"inter", "poppins", "montserrat", "playfair", "lora"}
THEME_FIELDS = {
    "background_color", "primary_color", "accent_color", "text_color",
    "font_key", "show_cover", "show_product_images", "background_opacity",
}
# La pantalla de bienvenida del menú público. La duración se acota para que
# nadie deje a sus comensales cinco segundos mirando un logo.
SPLASH_FIELDS = {"enabled", "duration"}
MIN_SPLASH_SECONDS = 1.0
MAX_SPLASH_SECONDS = 4.0
DEFAULT_SPLASH = {"enabled": False, "duration": 2.5, "image_url": None}
DEFAULT_THEME = {
    "background_color": "#FFFDF5",
    "primary_color": "#FFE05A",
    "accent_color": "#E8C93D",
    "text_color": "#111111",
    "font_key": "inter",
    "show_cover": True,
    "show_product_images": True,
    "cover_image_url": None,
    "background_image_url": None,
    "background_opacity": 0.2,
}
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
HEX_PATTERN = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def default_configuration():
    return {"template_key": "modern", "theme": dict(DEFAULT_THEME), "splash": dict(DEFAULT_SPLASH)}


def _normalize_hex(value):
    if not isinstance(value, str) or not HEX_PATTERN.fullmatch(value):
        raise ValueError("Los colores deben usar el formato #RGB o #RRGGBB")
    value = value.upper()
    if len(value) == 4:
        value = "#" + "".join(character * 2 for character in value[1:])
    return value


def _luminance(color):
    channels = [int(color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    adjusted = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
    return 0.2126 * adjusted[0] + 0.7152 * adjusted[1] + 0.0722 * adjusted[2]


def _contrast(first, second):
    light, dark = sorted((_luminance(first), _luminance(second)), reverse=True)
    return (light + 0.05) / (dark + 0.05)


def _validate_theme(theme, current):
    if not isinstance(theme, dict):
        raise ValueError("La configuración visual no es válida")
    unknown = set(theme) - THEME_FIELDS
    if unknown:
        raise ValueError(f"Campos de tema no permitidos: {', '.join(sorted(unknown))}")
    normalized = dict(current)
    for field in ("background_color", "primary_color", "accent_color", "text_color"):
        if field in theme:
            normalized[field] = _normalize_hex(theme[field])
    if "font_key" in theme:
        if theme["font_key"] not in FONT_KEYS:
            raise ValueError("La tipografía seleccionada no está permitida")
        normalized["font_key"] = theme["font_key"]
    for field in ("show_cover", "show_product_images"):
        if field in theme:
            if not isinstance(theme[field], bool):
                raise ValueError(f"{field} debe ser verdadero o falso")
            normalized[field] = theme[field]
    if "background_opacity" in theme:
        value = theme["background_opacity"]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("La opacidad del fondo debe ser un número")
        if value < 0 or value > 1:
            raise ValueError("La opacidad del fondo debe estar entre 0 y 1")
        normalized["background_opacity"] = round(float(value), 2)
    if _contrast(normalized["text_color"], normalized["background_color"]) < 4.5:
        raise ValueError("El texto no tiene suficiente contraste con el fondo")
    if _contrast(normalized["text_color"], normalized["primary_color"]) < 4.5:
        raise ValueError("El texto no tiene suficiente contraste con el color principal")
    return normalized


def _validate_splash(splash, current):
    if not isinstance(splash, dict):
        raise ValueError("La pantalla de bienvenida no es válida")
    unknown = set(splash) - SPLASH_FIELDS
    if unknown:
        raise ValueError(f"Campos de bienvenida no permitidos: {', '.join(sorted(unknown))}")
    normalized = {"enabled": current["enabled"], "duration": current["duration"]}
    if "enabled" in splash:
        if not isinstance(splash["enabled"], bool):
            raise ValueError("enabled debe ser verdadero o falso")
        normalized["enabled"] = splash["enabled"]
    if "duration" in splash:
        value = splash["duration"]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("La duración de la bienvenida debe ser un número")
        if value < MIN_SPLASH_SECONDS or value > MAX_SPLASH_SECONDS:
            raise ValueError(f"La duración de la bienvenida debe estar entre {MIN_SPLASH_SECONDS:g} y {MAX_SPLASH_SECONDS:g} segundos")
        normalized["duration"] = round(float(value), 1)
    return normalized


def _image_size(image):
    position = image.stream.tell()
    image.stream.seek(0, 2)
    size = image.stream.tell()
    image.stream.seek(position)
    return size


def _detected_image_type(image):
    position = image.stream.tell()
    image.stream.seek(0)
    header = image.stream.read(12)
    image.stream.seek(position)
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if header.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "webp"
    return None


def _validate_image(image, label):
    safe_name = secure_filename(image.filename)
    extension = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    if extension not in ALLOWED_IMAGE_EXTENSIONS or image.mimetype not in ALLOWED_IMAGE_MIMETYPES:
        raise ValueError(f"{label} debe ser JPG, PNG o WebP")
    normalized_extension = "jpeg" if extension in {"jpg", "jpeg"} else extension
    if _detected_image_type(image) != normalized_extension:
        raise ValueError(f"{label} no contiene una imagen válida")
    if _image_size(image) > MAX_IMAGE_BYTES:
        raise ValueError(f"{label} puede pesar máximo 5 MB")
    return extension


def _delete_cover(filename):
    if not filename:
        return
    storage.delete_file(current_app.config["CATALOGUE_COVER_FOLDER"], filename)


def _delete_background(filename):
    if not filename:
        return
    storage.delete_file(current_app.config["CATALOGUE_BACKGROUND_FOLDER"], filename)


def _delete_splash(filename):
    if not filename:
        return
    storage.delete_file(current_app.config["CATALOGUE_SPLASH_FOLDER"], filename)


def get_template(owner_id, business_id, catalogue_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        config = CatalogueTemplate.query.filter_by(catalogue_id=catalogue.id).first()
        return {"template": config.to_dict() if config else default_configuration()}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": "No fue posible consultar la plantilla"}, 500


def update_template(owner_id, business_id, catalogue_id, data, cover=None, background=None, splash=None):
    new_filename = None
    new_background_filename = None
    new_splash_filename = None
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        if not isinstance(data, dict):
            return {"message": "La configuración no es válida"}, 400
        unknown = set(data) - {"template_key", "theme", "splash", "remove_cover", "remove_background", "remove_splash"}
        if unknown:
            return {"message": f"Campos no permitidos: {', '.join(sorted(unknown))}"}, 400
        if "remove_cover" in data and not isinstance(data["remove_cover"], bool):
            return {"message": "remove_cover debe ser verdadero o falso"}, 400
        if "remove_background" in data and not isinstance(data["remove_background"], bool):
            return {"message": "remove_background debe ser verdadero o falso"}, 400
        if "remove_splash" in data and not isinstance(data["remove_splash"], bool):
            return {"message": "remove_splash debe ser verdadero o falso"}, 400

        config = CatalogueTemplate.query.filter_by(catalogue_id=catalogue.id).first()
        current = config.to_dict() if config else default_configuration()
        template_key = data.get("template_key", current["template_key"])
        if template_key not in TEMPLATE_KEYS:
            return {"message": "La plantilla seleccionada no está permitida"}, 400
        blocked = ensure_template_allowed(
            owner_id,
            template_key=data.get("template_key"),
            theme=data.get("theme"),
            cover_upload=bool(cover and cover.filename),
            background_upload=bool(background and background.filename),
            splash=data.get("splash"),
            splash_upload=bool(splash and splash.filename),
            current=current,
        )
        if blocked:
            return blocked
        theme = _validate_theme(data.get("theme", {}), current["theme"])
        splash_config = _validate_splash(data.get("splash", {}), current.get("splash", DEFAULT_SPLASH))

        if not config:
            config = CatalogueTemplate(catalogue_id=catalogue.id)
            db.session.add(config)
        old_filename = config.cover_filename
        old_background_filename = config.background_filename
        old_splash_filename = config.splash_filename
        config.template_key = template_key
        for field in THEME_FIELDS:
            setattr(config, field, theme[field])
        config.splash_enabled = splash_config["enabled"]
        config.splash_duration = splash_config["duration"]

        if cover and cover.filename:
            extension = _validate_image(cover, "La portada")
            new_filename = f"{uuid4().hex}.{extension}"
            storage.save_file(current_app.config["CATALOGUE_COVER_FOLDER"], new_filename, cover)
            config.cover_filename = new_filename
        elif data.get("remove_cover") is True:
            config.cover_filename = None

        if background and background.filename:
            extension = _validate_image(background, "El fondo")
            new_background_filename = f"{uuid4().hex}.{extension}"
            storage.save_file(current_app.config["CATALOGUE_BACKGROUND_FOLDER"], new_background_filename, background)
            config.background_filename = new_background_filename
        elif data.get("remove_background") is True:
            config.background_filename = None

        if splash and splash.filename:
            extension = _validate_image(splash, "La pantalla de bienvenida")
            new_splash_filename = f"{uuid4().hex}.{extension}"
            storage.save_file(current_app.config["CATALOGUE_SPLASH_FOLDER"], new_splash_filename, splash)
            config.splash_filename = new_splash_filename
        elif data.get("remove_splash") is True:
            config.splash_filename = None

        db.session.commit()
        if old_filename != config.cover_filename:
            _delete_cover(old_filename)
        if old_background_filename != config.background_filename:
            _delete_background(old_background_filename)
        if old_splash_filename != config.splash_filename:
            _delete_splash(old_splash_filename)
        return {"message": "Plantilla actualizada correctamente", "template": config.to_dict()}, 200
    except ValueError as error:
        db.session.rollback()
        _delete_cover(new_filename)
        _delete_background(new_background_filename)
        _delete_splash(new_splash_filename)
        return {"message": str(error)}, 400
    except IntegrityError:
        db.session.rollback()
        _delete_cover(new_filename)
        _delete_background(new_background_filename)
        _delete_splash(new_splash_filename)
        return {"message": "No fue posible guardar la plantilla"}, 409
    except SQLAlchemyError as error:
        db.session.rollback()
        _delete_cover(new_filename)
        _delete_background(new_background_filename)
        _delete_splash(new_splash_filename)
        current_app.logger.exception(error)
        return {"message": "No fue posible guardar la plantilla"}, 500


def _get_private_asset(owner_id, catalogue_id, field):
    try:
        owner_uuid = UUID(str(owner_id))
        catalogue_uuid = UUID(str(catalogue_id))
    except (ValueError, TypeError, AttributeError):
        return None
    config = (
        CatalogueTemplate.query
        .join(Catalogue, Catalogue.id == CatalogueTemplate.catalogue_id)
        .join(Business, Business.id == Catalogue.business_id)
        .filter(CatalogueTemplate.catalogue_id == catalogue_uuid, Business.owner_id == owner_uuid)
        .first()
    )
    return getattr(config, field) if config else None


def get_cover(owner_id, catalogue_id):
    return _get_private_asset(owner_id, catalogue_id, "cover_filename")


def get_splash(owner_id, catalogue_id):
    return _get_private_asset(owner_id, catalogue_id, "splash_filename")


def get_background(owner_id, catalogue_id):
    return _get_private_asset(owner_id, catalogue_id, "background_filename")
