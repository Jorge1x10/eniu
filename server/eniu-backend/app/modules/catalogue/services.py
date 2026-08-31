from uuid import UUID

from flask import current_app
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.db import db
from app.modules.billing.guards import ensure_can_create_catalogue
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.shared.i18n import _


def _uuid(value):
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


def _business_access(owner_id, business_id):
    owner_uuid = _uuid(owner_id)
    business_uuid = _uuid(business_id)

    if not owner_uuid:
        return None, ({"message": _("El identificador del usuario no es válido")}, 400)
    if not business_uuid:
        return None, ({"message": _("Negocio no encontrado")}, 404)

    business = db.session.get(Business, business_uuid)
    if not business:
        return None, ({"message": _("Negocio no encontrado")}, 404)
    if business.owner_id != owner_uuid:
        return None, ({"message": _("No tienes acceso a este negocio")}, 403)

    return business, None


def _catalogue_for_business(business_id, catalogue_id):
    catalogue_uuid = _uuid(catalogue_id)
    if not catalogue_uuid:
        return None

    return Catalogue.query.filter_by(
        id=catalogue_uuid,
        business_id=business_id,
    ).first()


def catalogue_access(owner_id, business_id, catalogue_id):
    business, error = _business_access(owner_id, business_id)
    if error:
        return None, error

    catalogue = _catalogue_for_business(business.id, catalogue_id)
    if not catalogue:
        return None, ({"message": _("Catálogo no encontrado")}, 404)

    return catalogue, None


def _name(data, required=False):
    if "name" not in data:
        if required:
            raise ValueError(_("El nombre del catálogo es obligatorio"))
        return None, False

    value = data.get("name")
    if not isinstance(value, str):
        raise ValueError(_("El nombre del catálogo no es válido"))

    value = value.strip()
    if not value:
        raise ValueError(_("El nombre del catálogo es obligatorio"))
    if len(value) > 64:
        raise ValueError(_("El nombre del catálogo no puede superar 64 caracteres"))

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


def _template_id(data):
    if "template_id" not in data:
        return None, False

    value = data.get("template_id")
    if value is None:
        return None, True
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(_("template_id debe ser un entero positivo o null"))

    return value, True


def _duplicate_name(business_id, name, exclude_id=None):
    query = Catalogue.query.filter(
        Catalogue.business_id == business_id,
        func.lower(Catalogue.name) == name.lower(),
    )
    if exclude_id:
        query = query.filter(Catalogue.id != exclude_id)
    return query.first() is not None


def list_catalogues(owner_id, business_id):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error

        catalogues = (
            Catalogue.query
            .filter_by(business_id=business.id)
            .order_by(Catalogue.created_at.desc())
            .all()
        )
        return {"catalogues": [catalogue.to_dict() for catalogue in catalogues]}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible consultar los catálogos")}, 500


def create_catalogue(owner_id, business_id, data):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error

        blocked = ensure_can_create_catalogue(owner_id, business.id)
        if blocked:
            return blocked

        name, _ignored_error = _name(data, required=True)
        description, _ignored_error = _description(data)
        template_id, _ignored_error = _template_id(data)

        if _duplicate_name(business.id, name):
            return {"message": _("Ya existe un catálogo con ese nombre")}, 409

        catalogue = Catalogue(
            business_id=business.id,
            name=name,
            description=description,
            template_id=template_id,
            is_published=False,
            published_at=None,
        )
        db.session.add(catalogue)
        db.session.commit()
        return {
            "message": "Catálogo creado correctamente",
            "catalogue": catalogue.to_dict(),
        }, 201
    except ValueError as error:
        return {"message": str(error)}, 400
    except IntegrityError:
        db.session.rollback()
        return {"message": _("Ya existe un catálogo con ese nombre")}, 409
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible crear el catálogo")}, 500


def get_catalogue(owner_id, business_id, catalogue_id):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error

        catalogue = _catalogue_for_business(business.id, catalogue_id)
        if not catalogue:
            return {"message": _("Catálogo no encontrado")}, 404

        return {"catalogue": catalogue.to_dict()}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible consultar el catálogo")}, 500


def update_catalogue(owner_id, business_id, catalogue_id, data):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error

        catalogue = _catalogue_for_business(business.id, catalogue_id)
        if not catalogue:
            return {"message": _("Catálogo no encontrado")}, 404

        name, has_name = _name(data)
        description, has_description = _description(data)
        template_id, has_template_id = _template_id(data)

        if not any((has_name, has_description, has_template_id)):
            return {"message": _("No se enviaron campos editables")}, 400

        if has_name:
            if _duplicate_name(business.id, name, exclude_id=catalogue.id):
                return {"message": _("Ya existe un catálogo con ese nombre")}, 409
            catalogue.name = name
        if has_description:
            catalogue.description = description
        if has_template_id:
            catalogue.template_id = template_id

        db.session.commit()
        return {
            "message": "Catálogo actualizado correctamente",
            "catalogue": catalogue.to_dict(),
        }, 200
    except ValueError as error:
        return {"message": str(error)}, 400
    except IntegrityError:
        db.session.rollback()
        return {"message": _("Ya existe un catálogo con ese nombre")}, 409
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible actualizar el catálogo")}, 500


def delete_catalogue(owner_id, business_id, catalogue_id):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error

        catalogue = _catalogue_for_business(business.id, catalogue_id)
        if not catalogue:
            return {"message": _("Catálogo no encontrado")}, 404

        product_pictures = [
            picture
            for product in catalogue.products
            for picture in product.picture_metadata()
        ]
        cover_filename = (
            catalogue.template_config.cover_filename
            if catalogue.template_config else None
        )
        db.session.delete(catalogue)
        db.session.commit()
        if product_pictures:
            from app.modules.products.services import _delete_images
            _delete_images(product_pictures)
        if cover_filename:
            from app.modules.template.services import _delete_cover
            _delete_cover(cover_filename)
        return {"message": _("Catálogo eliminado correctamente")}, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible eliminar el catálogo")}, 500


def publish_catalogue(owner_id, business_id, catalogue_id):
    from app.modules.publication.services import change_publication
    result, status = change_publication(owner_id, business_id, catalogue_id, True)
    if status != 200:
        return result, status
    catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
    if error:
        return error
    return {"message": "Catálogo publicado correctamente", "catalogue": catalogue.to_dict()}, 200


def unpublish_catalogue(owner_id, business_id, catalogue_id):
    from app.modules.publication.services import change_publication
    result, status = change_publication(owner_id, business_id, catalogue_id, False)
    if status != 200:
        return result, status
    catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
    if error:
        return error
    return {"message": _("Catálogo despublicado correctamente"), "catalogue": catalogue.to_dict()}, 200

