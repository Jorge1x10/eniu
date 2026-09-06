from datetime import date as date_cls, datetime
from uuid import UUID

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.db import db
from app.modules.catalogue.services import catalogue_access
from app.modules.category.model import Category
from app.modules.products.model import Product
from app.modules.promotion.model import Promotion
from app.shared.i18n import _

# Nunca hay precio promocional aquí a propósito: eso implicaría validar
# montos, mostrar el precio tachado de forma consistente en cada plantilla y
# reconciliar con lo que ya hay guardado por producto — una función aparte,
# más grande, que puede llegar después. Esta primera versión sólo resalta.
EDITABLE_FIELDS = {
    "name", "badge_label", "is_active", "days_of_week",
    "start_date", "end_date", "product_ids", "category_ids",
}
MAX_NAME_LENGTH = 64
MAX_BADGE_LENGTH = 24


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
            raise ValueError(_("El nombre de la promoción es obligatorio"))
        return None, False
    value = data.get("name")
    if not isinstance(value, str):
        raise ValueError(_("El nombre de la promoción no es válido"))
    value = value.strip()
    if not value:
        raise ValueError(_("El nombre de la promoción es obligatorio"))
    if len(value) > MAX_NAME_LENGTH:
        raise ValueError(_("El nombre no puede superar {limit} caracteres", limit=MAX_NAME_LENGTH))
    return value, True


def _badge_label(data):
    if "badge_label" not in data:
        return None, False
    value = data.get("badge_label")
    if value is None:
        return None, True
    if not isinstance(value, str):
        raise ValueError(_("La etiqueta no es válida"))
    value = value.strip()
    if len(value) > MAX_BADGE_LENGTH:
        raise ValueError(_("La etiqueta no puede superar {limit} caracteres", limit=MAX_BADGE_LENGTH))
    return value or None, True


def _is_active(data):
    if "is_active" not in data:
        return None, False
    value = data.get("is_active")
    if not isinstance(value, bool):
        raise ValueError(_("is_active debe ser verdadero o falso"))
    return value, True


def _days_of_week(data):
    if "days_of_week" not in data:
        return None, False
    value = data.get("days_of_week")
    if not isinstance(value, list):
        raise ValueError(_("Los días de la semana no son válidos"))
    normalized = set()
    for entry in value:
        if not isinstance(entry, int) or isinstance(entry, bool) or entry < 0 or entry > 6:
            raise ValueError(_("Los días de la semana deben ser números del 0 (lunes) al 6 (domingo)"))
        normalized.add(entry)
    return sorted(normalized), True


def _date(data, field, label):
    if field not in data:
        return None, False
    value = data.get(field)
    if value is None:
        return None, True
    if not isinstance(value, str):
        raise ValueError(f"{label} no es válida")
    try:
        return datetime.strptime(value, "%Y-%m-%d").date(), True
    except ValueError as error:
        raise ValueError(f"{label} debe tener el formato AAAA-MM-DD") from error


def _resolve_products(catalogue_id, data):
    if "product_ids" not in data:
        return None, False
    raw_ids = data.get("product_ids")
    if not isinstance(raw_ids, list):
        raise ValueError(_("Los productos seleccionados no son válidos"))
    uuids = [_uuid(value) for value in raw_ids]
    if any(value is None for value in uuids):
        raise ValueError(_("Los productos seleccionados no son válidos"))
    products = Product.query.filter(Product.catalogue_id == catalogue_id, Product.id.in_(uuids)).all() if uuids else []
    if len(products) != len(set(uuids)):
        raise ValueError(_("Alguno de los productos seleccionados no existe en este menú"))
    return products, True


def _resolve_categories(catalogue_id, data):
    if "category_ids" not in data:
        return None, False
    raw_ids = data.get("category_ids")
    if not isinstance(raw_ids, list):
        raise ValueError(_("Las categorías seleccionadas no son válidas"))
    uuids = [_uuid(value) for value in raw_ids]
    if any(value is None for value in uuids):
        raise ValueError(_("Las categorías seleccionadas no son válidas"))
    categories = Category.query.filter(Category.catalogue_id == catalogue_id, Category.id.in_(uuids)).all() if uuids else []
    if len(categories) != len(set(uuids)):
        raise ValueError(_("Alguna de las categorías seleccionadas no existe en este menú"))
    return categories, True


def _promotion_for_catalogue(catalogue_id, promotion_id):
    promotion_uuid = _uuid(promotion_id)
    if not promotion_uuid:
        return None
    return Promotion.query.filter_by(id=promotion_uuid, catalogue_id=catalogue_id).first()


def list_promotions(owner_id, business_id, catalogue_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        promotions = (
            Promotion.query
            .filter_by(catalogue_id=catalogue.id)
            .order_by(Promotion.created_at.asc())
            .all()
        )
        return {"promotions": [promotion.to_dict() for promotion in promotions]}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible consultar las promociones")}, 500


def create_promotion(owner_id, business_id, catalogue_id, data):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        if not isinstance(data, dict):
            return {"message": _("La configuración no es válida")}, 400
        _validate_fields(data, EDITABLE_FIELDS)

        name, _has_name = _name(data, required=True)
        badge_label, _has_badge = _badge_label(data)
        is_active, has_active = _is_active(data)
        days_of_week, _has_days = _days_of_week(data)
        start_date, _has_start = _date(data, "start_date", _("La fecha de inicio"))
        end_date, _has_end = _date(data, "end_date", _("La fecha de fin"))
        if start_date and end_date and start_date > end_date:
            return {"message": _("La fecha de inicio no puede ser posterior a la de fin")}, 400
        products, _has_products = _resolve_products(catalogue.id, data)
        categories, _has_categories = _resolve_categories(catalogue.id, data)

        promotion = Promotion(
            catalogue_id=catalogue.id,
            name=name,
            badge_label=badge_label,
            is_active=is_active if has_active else True,
            days_of_week=days_of_week or [],
            start_date=start_date,
            end_date=end_date,
            products=products or [],
            categories=categories or [],
        )
        db.session.add(promotion)
        db.session.commit()
        return {"message": _("Promoción creada correctamente"), "promotion": promotion.to_dict()}, 201
    except ValueError as error:
        db.session.rollback()
        return {"message": str(error)}, 400
    except IntegrityError:
        db.session.rollback()
        return {"message": _("No fue posible crear la promoción")}, 409
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible crear la promoción")}, 500


def update_promotion(owner_id, business_id, catalogue_id, promotion_id, data):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        promotion = _promotion_for_catalogue(catalogue.id, promotion_id)
        if not promotion:
            return {"message": _("Promoción no encontrada")}, 404
        if not isinstance(data, dict):
            return {"message": _("La configuración no es válida")}, 400
        _validate_fields(data, EDITABLE_FIELDS)

        name, has_name = _name(data)
        badge_label, has_badge = _badge_label(data)
        is_active, has_active = _is_active(data)
        days_of_week, has_days = _days_of_week(data)
        start_date, has_start = _date(data, "start_date", _("La fecha de inicio"))
        end_date, has_end = _date(data, "end_date", _("La fecha de fin"))
        products, has_products = _resolve_products(catalogue.id, data)
        categories, has_categories = _resolve_categories(catalogue.id, data)

        effective_start = start_date if has_start else promotion.start_date
        effective_end = end_date if has_end else promotion.end_date
        if effective_start and effective_end and effective_start > effective_end:
            return {"message": _("La fecha de inicio no puede ser posterior a la de fin")}, 400

        if has_name:
            promotion.name = name
        if has_badge:
            promotion.badge_label = badge_label
        if has_active:
            promotion.is_active = is_active
        if has_days:
            promotion.days_of_week = days_of_week or []
        if has_start:
            promotion.start_date = start_date
        if has_end:
            promotion.end_date = end_date
        if has_products:
            promotion.products = products or []
        if has_categories:
            promotion.categories = categories or []

        db.session.commit()
        return {"message": _("Promoción actualizada correctamente"), "promotion": promotion.to_dict()}, 200
    except ValueError as error:
        db.session.rollback()
        return {"message": str(error)}, 400
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar la promoción")}, 500


def delete_promotion(owner_id, business_id, catalogue_id, promotion_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        promotion = _promotion_for_catalogue(catalogue.id, promotion_id)
        if not promotion:
            return {"message": _("Promoción no encontrada")}, 404
        db.session.delete(promotion)
        db.session.commit()
        return {"message": _("Promoción eliminada correctamente")}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible eliminar la promoción")}, 500


def active_product_ids_today(catalogue_id, today=None):
    """Ids de producto resaltados hoy, con la etiqueta que le corresponde a cada uno.

    Usado por `publication/serializer.py` al armar el menú público: recorre
    las promociones activas de este catálogo y junta, por producto, la
    primera etiqueta que aplique (si dos promociones coinciden en un
    producto el mismo día, gana la que se creó primero).
    """
    today = today or date_cls.today()
    promotions = Promotion.query.filter_by(catalogue_id=catalogue_id, is_active=True).order_by(Promotion.created_at.asc()).all()
    labels = {}
    for promotion in promotions:
        if not promotion.is_active_on(today):
            continue
        product_ids = {product.id for product in promotion.products}
        for category in promotion.categories:
            product_ids.update(product.id for product in category.products)
        for product_id in product_ids:
            labels.setdefault(product_id, promotion.badge_label or promotion.name)
    return labels
