import re
import unicodedata
from uuid import uuid4

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.db import db
from app.database.basemodel import utc_now
from app.modules.catalogue.model import Catalogue
from app.modules.catalogue.services import catalogue_access
from app.modules.publication.serializer import serialize_public_menu


def _slugify(value):
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug[:96].rstrip("-") or "menu"


def _available_slug(catalogue):
    base = _slugify(f"{catalogue.business.name}-{catalogue.name}")
    if not Catalogue.query.filter_by(public_slug=base).first():
        return base
    for _ in range(10):
        candidate = f"{base}-{uuid4().hex[:6]}"
        if not Catalogue.query.filter_by(public_slug=candidate).first():
            return candidate
    return None


def publication_payload(catalogue):
    public_url = (
        f"{current_app.config['PUBLIC_WEB_BASE_URL']}/m/{catalogue.public_slug}"
        if catalogue.public_slug else None
    )
    return {
        "is_published": catalogue.is_published,
        "public_slug": catalogue.public_slug,
        "public_url": public_url,
        "published_at": catalogue.published_at.isoformat() if catalogue.published_at else None,
    }


def get_publication(owner_id, business_id, catalogue_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        return {"publication": publication_payload(catalogue)}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": "No fue posible consultar la publicación"}, 500


def change_publication(owner_id, business_id, catalogue_id, is_published):
    if not isinstance(is_published, bool):
        return {"message": "is_published debe ser verdadero o falso"}, 400
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        if is_published:
            if not catalogue.public_slug:
                catalogue.public_slug = _available_slug(catalogue)
                if not catalogue.public_slug:
                    return {"message": "No fue posible generar una URL única"}, 409
            if not catalogue.is_published:
                catalogue.is_published = True
                catalogue.published_at = utc_now()
        elif catalogue.is_published:
            catalogue.is_published = False
            catalogue.published_at = None
        db.session.commit()
        return {"publication": publication_payload(catalogue)}, 200
    except IntegrityError:
        db.session.rollback()
        return {"message": "No fue posible generar una URL única"}, 409
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": "No fue posible actualizar la publicación"}, 500


def get_preview(owner_id, business_id, catalogue_id):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        return {"menu": serialize_public_menu(catalogue)}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": "No fue posible cargar la vista previa"}, 500


def get_public_menu(public_slug):
    try:
        catalogue = Catalogue.query.filter_by(public_slug=public_slug, is_published=True).first()
        if not catalogue:
            return {"message": "Este menú no está disponible"}, 404
        return {"menu": serialize_public_menu(catalogue)}, 200
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": "No fue posible cargar el menú"}, 500


def get_public_cover(public_slug):
    catalogue = Catalogue.query.filter_by(public_slug=public_slug, is_published=True).first()
    if not catalogue or not catalogue.template_config:
        return None
    return catalogue.template_config.cover_filename


def get_public_background(public_slug):
    catalogue = Catalogue.query.filter_by(public_slug=public_slug, is_published=True).first()
    if not catalogue or not catalogue.template_config:
        return None
    return catalogue.template_config.background_filename


def get_public_splash(public_slug):
    catalogue = Catalogue.query.filter_by(public_slug=public_slug, is_published=True).first()
    if not catalogue or not catalogue.template_config:
        return None
    return catalogue.template_config.splash_filename


def get_public_product_image(public_slug, section_index, product_index):
    catalogue = Catalogue.query.filter_by(public_slug=public_slug, is_published=True).first()
    if not catalogue:
        return None
    categories = sorted(
        (category for category in catalogue.categories if category.is_visible),
        key=lambda category: (category.display_order, category.created_at),
    )
    products = sorted(catalogue.products, key=lambda product: (product.display_order, product.created_at))
    if section_index < len(categories):
        section_products = [product for product in products if product.category_id == categories[section_index].id]
    elif section_index == len(categories):
        section_products = [product for product in products if product.category_id is None]
    else:
        return None
    if product_index < 0 or product_index >= len(section_products):
        return None
    pictures = section_products[product_index].picture_metadata()
    picture = next((item for item in pictures if item.get("is_default")), pictures[0] if pictures else None)
    return picture.get("filename") if picture else None
