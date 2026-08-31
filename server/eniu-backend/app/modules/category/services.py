from uuid import UUID

from flask import current_app
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.db import db
from app.modules.catalogue.services import catalogue_access
from app.modules.category.model import Category
from app.shared.i18n import _


EDITABLE_FIELDS = {"name", "description"}


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
            raise ValueError(_("El nombre de la categoría es obligatorio"))
        return None, False

    value = data.get("name")
    if not isinstance(value, str):
        raise ValueError(_("El nombre de la categoría no es válido"))

    value = value.strip()
    if not value:
        raise ValueError(_("El nombre de la categoría es obligatorio"))
    if len(value) > 64:
        raise ValueError(_("El nombre de la categoría no puede superar 64 caracteres"))
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


def _category_for_catalogue(catalogue_id, category_id):
    category_uuid = _uuid(category_id)
    if not category_uuid:
        return None
    return Category.query.filter_by(
        id=category_uuid,
        catalogue_id=catalogue_id,
    ).first()


def _duplicate_name(catalogue_id, name, exclude_id=None):
    query = Category.query.filter_by(catalogue_id=catalogue_id, name=name)
    if exclude_id:
        query = query.filter(Category.id != exclude_id)
    return query.first() is not None


def list_categories(owner_id, business_id, catalogue_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error

        categories = (
            Category.query
            .filter_by(catalogue_id=catalogue.id)
            .order_by(Category.display_order.asc(), Category.created_at.asc())
            .all()
        )
        return {"categories": [category.to_dict() for category in categories]}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible consultar las categorías")}, 500


def create_category(owner_id, business_id, catalogue_id, data):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        _validate_fields(data, EDITABLE_FIELDS)

        name, _ignored_error = _name(data, required=True)
        description, _ignored_error = _description(data)
        if _duplicate_name(catalogue.id, name):
            return {"message": _("Ya existe una categoría con ese nombre")}, 409

        next_order = (
            db.session.query(func.coalesce(func.max(Category.display_order), -1))
            .filter(Category.catalogue_id == catalogue.id)
            .scalar()
        ) + 1
        category = Category(
            catalogue_id=catalogue.id,
            name=name,
            description=description,
            is_visible=True,
            display_order=next_order,
        )
        db.session.add(category)
        db.session.commit()
        return {
            "message": _("Categoría creada correctamente"),
            "category": category.to_dict(),
        }, 201
    except ValueError as error:
        return {"message": str(error)}, 400
    except IntegrityError:
        db.session.rollback()
        return {"message": _("Ya existe una categoría con ese nombre")}, 409
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible crear la categoría")}, 500


def get_category(owner_id, business_id, catalogue_id, category_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error

        category = _category_for_catalogue(catalogue.id, category_id)
        if not category:
            return {"message": _("Categoría no encontrada")}, 404
        return {"category": category.to_dict()}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible consultar la categoría")}, 500


def update_category(owner_id, business_id, catalogue_id, category_id, data):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        _validate_fields(data, EDITABLE_FIELDS)

        category = _category_for_catalogue(catalogue.id, category_id)
        if not category:
            return {"message": _("Categoría no encontrada")}, 404

        name, has_name = _name(data)
        description, has_description = _description(data)
        if not any((has_name, has_description)):
            return {"message": _("No se enviaron campos editables")}, 400

        if has_name:
            if _duplicate_name(catalogue.id, name, exclude_id=category.id):
                return {"message": _("Ya existe una categoría con ese nombre")}, 409
            category.name = name
        if has_description:
            category.description = description

        db.session.commit()
        return {
            "message": _("Categoría actualizada correctamente"),
            "category": category.to_dict(),
        }, 200
    except ValueError as error:
        return {"message": str(error)}, 400
    except IntegrityError:
        db.session.rollback()
        return {"message": _("Ya existe una categoría con ese nombre")}, 409
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar la categoría")}, 500


def delete_category(owner_id, business_id, catalogue_id, category_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error

        category = _category_for_catalogue(catalogue.id, category_id)
        if not category:
            return {"message": _("Categoría no encontrada")}, 404

        db.session.delete(category)
        db.session.commit()
        return {"message": _("Categoría eliminada correctamente")}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible eliminar la categoría")}, 500
