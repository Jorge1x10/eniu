from decimal import Decimal, InvalidOperation
import json
from uuid import UUID, uuid4

from flask import current_app
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app import images, storage
from app.database.db import db
from app.modules.billing.guards import ensure_can_create_product
from app.modules.catalogue.services import catalogue_access
from app.modules.category.model import Category
from app.modules.products.model import Product
from werkzeug.utils import secure_filename
from app.shared.i18n import _


CREATE_FIELDS = {"name", "description", "price", "category_id", "is_available"}
UPDATE_FIELDS = CREATE_FIELDS
MAX_PRICE = Decimal("99999999.99")
CENT = Decimal("0.01")
MAX_IMAGES = 5
MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}


class ProductValidationError(ValueError):
    """Error de validación con un código estable además del mensaje.

    Los clientes no deben decidir nada mirando el texto del mensaje: desde que
    la API responde en dos idiomas, una comprobación como
    `message.includes("no pertenece")` deja de funcionar en cuanto quien la
    recibe no lee español. El código no cambia con el idioma.
    """

    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


def _validation_payload(error):
    """Respuesta de un error de validación, con su código si lo lleva."""
    payload = {"message": str(error)}
    code = getattr(error, "code", None)
    if code:
        payload["code"] = code
    return payload


def _uuid(value):
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


def _validate_fields(data, allowed_fields):
    invalid_fields = sorted(set(data) - allowed_fields)
    if invalid_fields:
        raise ValueError(f"Campos no permitidos: {', '.join(invalid_fields)}")


def _name(data, required=False):
    if "name" not in data:
        if required:
            raise ValueError(_("El nombre del producto es obligatorio"))
        return None, False

    value = data.get("name")
    if not isinstance(value, str):
        raise ValueError(_("El nombre del producto no es válido"))
    value = value.strip()
    if not value:
        raise ValueError(_("El nombre del producto es obligatorio"))
    if len(value) > 64:
        raise ValueError(_("El nombre del producto no puede superar 64 caracteres"))
    return value, True


def _description(data):
    if "description" not in data:
        return None, False
    value = data.get("description")
    if value is None:
        return None, True
    if not isinstance(value, str):
        raise ValueError(_("La descripción no es válida"))
    return value.strip() or None, True


def _price(data):
    if "price" not in data:
        return None, False
    value = data.get("price")
    if value is None:
        return None, True
    if isinstance(value, bool):
        raise ValueError(_("El precio no es válido"))

    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(_("El precio no es válido")) from None

    if not decimal_value.is_finite():
        raise ValueError(_("El precio no es válido"))
    if decimal_value < 0:
        raise ValueError(_("El precio no puede ser negativo"))
    if decimal_value > MAX_PRICE:
        raise ValueError(_("El precio supera el máximo permitido"))
    if decimal_value.quantize(CENT) != decimal_value:
        raise ValueError(_("El precio puede tener máximo dos decimales"))

    return decimal_value.quantize(CENT), True


def _category(data, catalogue_id):
    if "category_id" not in data:
        return None, False
    value = data.get("category_id")
    if value is None:
        return None, True

    category_uuid = _uuid(value)
    if not category_uuid:
        raise ValueError(_("category_id no es un UUID válido"))

    category = Category.query.filter_by(
        id=category_uuid,
        catalogue_id=catalogue_id,
    ).first()
    if not category:
        raise ProductValidationError(
            _("La categoría no pertenece a este catálogo"),
            code="category_not_in_catalogue",
        )
    return category, True


def _availability(data):
    if "is_available" not in data:
        return None, False
    value = data.get("is_available")
    if not isinstance(value, bool):
        raise ValueError(_("is_available debe ser verdadero o falso"))
    return value, True


def _product_for_catalogue(catalogue_id, product_id):
    product_uuid = _uuid(product_id)
    if not product_uuid:
        return None
    return Product.query.filter_by(
        id=product_uuid,
        catalogue_id=catalogue_id,
    ).first()


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


def _validate_images(images, existing_count=0):
    images = [image for image in (images or []) if image and image.filename]
    if existing_count + len(images) > MAX_IMAGES:
        raise ValueError(_("Un producto puede tener máximo 5 imágenes"))
    for image in images:
        safe_name = secure_filename(image.filename)
        extension = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
        if (
            extension not in ALLOWED_IMAGE_EXTENSIONS
            or image.mimetype not in ALLOWED_IMAGE_MIMETYPES
        ):
            raise ValueError(_("Las imágenes deben ser JPG, PNG o WebP"))
        expected_type = "jpeg" if extension in {"jpg", "jpeg"} else extension
        if _detected_image_type(image) != expected_type:
            raise ValueError(_("El archivo no contiene una imagen válida"))
        if _image_size(image) > MAX_IMAGE_BYTES:
            raise ValueError(_("Cada imagen puede pesar máximo 5 MB"))
    return images


def _save_images(uploads):
    upload_folder = current_app.config["PRODUCT_UPLOAD_FOLDER"]
    saved = []
    for upload in uploads:
        # La extensión sale de lo que se va a escribir, no de lo que llegó: la
        # optimización reencodifica y el nombre tiene que describir el archivo
        # real, porque es lo que se sirve después.
        optimized, extension = images.optimize(upload)
        image_id = uuid4().hex
        filename = f"{image_id}.{extension}"
        storage.save_file(upload_folder, filename, optimized)
        saved.append({"id": image_id, "filename": filename, "is_default": False})
    return saved


def _delete_images(pictures):
    upload_folder = current_app.config["PRODUCT_UPLOAD_FOLDER"]
    for picture in pictures:
        filename = picture.get("filename")
        if not filename:
            continue
        storage.delete_file(upload_folder, filename)


def _set_default(pictures, default_key=None):
    if not pictures:
        return
    selected = next((item for item in pictures if item["id"] == default_key), None)
    if not selected:
        selected = next((item for item in pictures if item.get("is_default")), pictures[0])
    for item in pictures:
        item["is_default"] = item["id"] == selected["id"]


def _new_picture_data(images, default_index=None):
    validated = _validate_images(images)
    normalized_index = None
    if default_index is not None:
        try:
            normalized_index = int(default_index)
        except (ValueError, TypeError):
            raise ValueError(_("La imagen principal seleccionada no es válida")) from None
        if normalized_index < 0 or normalized_index >= len(validated):
            raise ValueError(_("La imagen principal seleccionada no es válida"))
    pictures = _save_images(validated)
    default_key = None
    if normalized_index is not None:
        default_key = pictures[normalized_index]["id"]
    _set_default(pictures, default_key)
    return pictures


def get_product_image(product_id, filename):
    product_uuid = _uuid(product_id)
    if not product_uuid:
        return None
    product = db.session.get(Product, product_uuid)
    if not product:
        return None
    return next((
        picture.get("filename")
        for picture in product.picture_metadata()
        if picture.get("filename") == filename
    ), None)


def list_products(owner_id, business_id, catalogue_id, category_id=None):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error

        query = Product.query.filter_by(catalogue_id=catalogue.id)
        if category_id is not None:
            category_uuid = _uuid(category_id)
            if not category_uuid:
                return {"message": _("category_id no es un UUID válido")}, 400
            category = Category.query.filter_by(
                id=category_uuid,
                catalogue_id=catalogue.id,
            ).first()
            if not category:
                return {
                    "message": _("La categoría no pertenece a este catálogo"),
                    "code": "category_not_in_catalogue",
                }, 400
            query = query.filter(Product.category_id == category.id)

        products = query.order_by(
            Product.display_order.asc(),
            Product.created_at.asc(),
        ).all()
        return {"products": [product.to_dict() for product in products]}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible consultar los productos")}, 500


def create_product(owner_id, business_id, catalogue_id, data, images=None):
    saved_pictures = []
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        blocked = ensure_can_create_product(owner_id, catalogue.id)
        if blocked:
            return blocked
        content_data = {key: value for key, value in data.items() if key in CREATE_FIELDS}
        invalid_fields = set(data) - CREATE_FIELDS - {"default_image_index"}
        if invalid_fields:
            _validate_fields(data, CREATE_FIELDS | {"default_image_index"})

        name, _ignored_error = _name(content_data, required=True)
        description, _ignored_error = _description(content_data)
        price, _ignored_error = _price(content_data)
        category, _ignored_error = _category(content_data, catalogue.id)
        availability, has_availability = _availability(content_data)
        saved_pictures = _new_picture_data(images, data.get("default_image_index"))
        next_order = (
            db.session.query(func.coalesce(func.max(Product.display_order), -1))
            .filter(Product.catalogue_id == catalogue.id)
            .scalar()
        ) + 1

        product = Product(
            catalogue_id=catalogue.id,
            category_id=category.id if category else None,
            name=name,
            description=description,
            price=price,
            display_order=next_order,
            is_available=availability if has_availability else True,
            pictures=json.dumps(saved_pictures) if saved_pictures else None,
        )
        db.session.add(product)
        db.session.commit()
        return {
            "message": _("Producto creado correctamente"),
            "product": product.to_dict(),
        }, 201
    except ValueError as error:
        _delete_images(saved_pictures)
        return _validation_payload(error), 400
    except IntegrityError:
        db.session.rollback()
        _delete_images(saved_pictures)
        return {"message": _("La información del producto no es válida")}, 400
    except SQLAlchemyError as error:
        db.session.rollback()
        _delete_images(saved_pictures)
        current_app.logger.exception(error)
        return {"message": _("No fue posible crear el producto")}, 500


def get_product(owner_id, business_id, catalogue_id, product_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error

        product = _product_for_catalogue(catalogue.id, product_id)
        if not product:
            return {"message": _("Producto no encontrado")}, 404
        return {"product": product.to_dict()}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible consultar el producto")}, 500


def update_product(owner_id, business_id, catalogue_id, product_id, data, images=None):
    saved_pictures = []
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        image_fields = {"keep_image_ids", "default_image_key"}
        _validate_fields(data, UPDATE_FIELDS | image_fields)
        content_data = {key: value for key, value in data.items() if key in UPDATE_FIELDS}

        product = _product_for_catalogue(catalogue.id, product_id)
        if not product:
            return {"message": _("Producto no encontrado")}, 404

        name, has_name = _name(content_data)
        description, has_description = _description(content_data)
        price, has_price = _price(content_data)
        category, has_category = _category(content_data, catalogue.id)
        is_available, has_availability = _availability(content_data)
        manages_images = bool(images) or "keep_image_ids" in data or "default_image_key" in data
        if not any((
            has_name,
            has_description,
            has_price,
            has_category,
            has_availability,
            manages_images,
        )):
            return {"message": _("No se enviaron campos editables")}, 400

        if has_name:
            product.name = name
        if has_description:
            product.description = description
        if has_price:
            product.price = price
        if has_category:
            product.category_id = category.id if category else None
        if has_availability:
            product.is_available = is_available

        removed_pictures = []
        if manages_images:
            existing = product.picture_metadata()
            try:
                keep_ids = json.loads(data.get("keep_image_ids", "[]"))
            except (TypeError, json.JSONDecodeError):
                raise ValueError(_("La selección de imágenes no es válida")) from None
            if not isinstance(keep_ids, list):
                raise ValueError(_("La selección de imágenes no es válida"))
            retained = [item for item in existing if item.get("id") in keep_ids]
            removed_pictures = [item for item in existing if item.get("id") not in keep_ids]
            validated = _validate_images(images, len(retained))
            saved_pictures = _save_images(validated)
            pictures = retained + saved_pictures
            default_key = data.get("default_image_key")
            if isinstance(default_key, str) and default_key.startswith("new:"):
                try:
                    default_key = saved_pictures[int(default_key.split(":", 1)[1])]["id"]
                except (ValueError, IndexError):
                    raise ValueError(_("La imagen principal seleccionada no es válida")) from None
            _set_default(pictures, default_key)
            product.pictures = json.dumps(pictures) if pictures else None

        db.session.commit()
        if manages_images:
            _delete_images(removed_pictures)
        return {
            "message": _("Producto actualizado correctamente"),
            "product": product.to_dict(),
        }, 200
    except ValueError as error:
        db.session.rollback()
        _delete_images(saved_pictures)
        return _validation_payload(error), 400
    except IntegrityError:
        db.session.rollback()
        _delete_images(saved_pictures)
        return {"message": _("La información del producto no es válida")}, 400
    except SQLAlchemyError as error:
        db.session.rollback()
        _delete_images(saved_pictures)
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar el producto")}, 500


def delete_product(owner_id, business_id, catalogue_id, product_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error

        product = _product_for_catalogue(catalogue.id, product_id)
        if not product:
            return {"message": _("Producto no encontrado")}, 404

        pictures = product.picture_metadata()
        db.session.delete(product)
        db.session.commit()
        _delete_images(pictures)
        return {"message": _("Producto eliminado correctamente")}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible eliminar el producto")}, 500
