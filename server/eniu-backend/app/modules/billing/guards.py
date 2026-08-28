"""Aplicación de los límites de plan sobre los recursos del usuario.

Todas las funciones devuelven `None` cuando la operación está permitida, o la
tupla `(payload, status)` que los servicios ya saben propagar. Los mensajes se
mantienen neutros a propósito: no nombran precios ni invitan a comprar, porque
la app de iOS no puede ofrecer una compra fuera de las reglas de Apple. Cada
cliente decide cómo presentar el aviso.
"""
from uuid import UUID

from app.database.db import db
from app.modules.billing import plans
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.products.model import Product
from app.modules.users.model import User


def _blocked(message, limit=None):
    payload = {"message": message, "code": "plan_limit"}
    if limit is not None:
        payload["limit"] = limit
    return payload, 403


def user_for(owner_id):
    try:
        return db.session.get(User, UUID(str(owner_id)))
    except (TypeError, ValueError):
        return None


def plan_key_for(owner_id):
    """Plan efectivo del dueño; gratuito si no se puede resolver el usuario."""
    user = user_for(owner_id)
    return plans.effective_plan_key(user) if user else plans.FREE


def limits_for_owner(owner_id):
    return plans.limits_for(plan_key_for(owner_id))


def ensure_can_create_business(owner_id):
    limits = limits_for_owner(owner_id)
    maximum = limits["max_businesses"]
    current = Business.query.filter_by(owner_id=UUID(str(owner_id))).count()
    if plans.within_limit(current, maximum):
        return None
    return _blocked(
        f"Tu plan actual permite {maximum} negocio."
        if maximum == 1 else
        f"Tu plan actual permite hasta {maximum} negocios.",
        maximum,
    )


def ensure_can_create_catalogue(owner_id, business_id):
    limits = limits_for_owner(owner_id)
    maximum = limits["max_catalogues_per_business"]
    current = Catalogue.query.filter_by(business_id=business_id).count()
    if plans.within_limit(current, maximum):
        return None
    return _blocked(
        f"Tu plan actual permite {maximum} menú por negocio."
        if maximum == 1 else
        f"Tu plan actual permite hasta {maximum} menús por negocio.",
        maximum,
    )


def ensure_can_create_product(owner_id, catalogue_id):
    limits = limits_for_owner(owner_id)
    maximum = limits["max_products_per_catalogue"]
    current = Product.query.filter_by(catalogue_id=catalogue_id).count()
    if plans.within_limit(current, maximum):
        return None
    return _blocked(f"Tu plan actual permite hasta {maximum} productos por menú.", maximum)


def ensure_analytics_access(owner_id):
    if limits_for_owner(owner_id)["allow_analytics"]:
        return None
    return _blocked("Tu plan actual no incluye analíticas.")


def ensure_template_allowed(owner_id, template_key=None, theme=None, cover_upload=False,
                            background_upload=False):
    """Valida los cambios de plantilla que el plan permite.

    Sólo se revisan los campos que el cliente mandó, no el tema ya guardado:
    alguien que bajó de plan conservando una tipografía de pago debe poder
    seguir cambiando sus colores sin toparse con un bloqueo.
    """
    plan_key = plan_key_for(owner_id)
    limits = plans.limits_for(plan_key)
    theme = theme if isinstance(theme, dict) else {}

    if template_key is not None and not plans.allows_template(plan_key, template_key):
        return _blocked("Tu plan actual sólo incluye la plantilla básica.")

    font_key = theme.get("font_key")
    if font_key is not None and not plans.allows_font(plan_key, font_key):
        return _blocked("Tu plan actual sólo incluye la tipografía básica.")

    if not limits["allow_cover"]:
        if cover_upload:
            return _blocked("Tu plan actual no incluye portada en el menú.")
        if theme.get("show_cover") is True:
            return _blocked("Tu plan actual no incluye portada en el menú.")

    if not limits["allow_background"]:
        if background_upload:
            return _blocked("Tu plan actual no incluye imagen de fondo en el menú.")
        if "background_opacity" in theme:
            return _blocked("Tu plan actual no incluye la personalización del fondo.")

    return None


def plan_key_for_owner_id(owner_id):
    """Plan efectivo resolviendo una sola consulta.

    Se usa al dibujar menús públicos, que es la ruta más caliente del backend:
    cargar el usuario completo con su suscripción costaría dos consultas por
    visita.
    """
    from app.modules.billing.model import ACCESS_STATUSES, BillingSubscription

    row = (
        db.session.query(BillingSubscription.plan_key, BillingSubscription.status)
        .filter(BillingSubscription.user_id == owner_id)
        .first()
    )
    if not row or row.status not in ACCESS_STATUSES or row.plan_key not in plans.PLANS:
        return plans.FREE
    return row.plan_key
