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
from app.shared.i18n import _


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
        _("Tu plan actual permite {limit} negocio.", limit=maximum)
        if maximum == 1 else
        _("Tu plan actual permite hasta {limit} negocios.", limit=maximum),
        maximum,
    )


def ensure_can_create_catalogue(owner_id, business_id):
    limits = limits_for_owner(owner_id)
    maximum = limits["max_catalogues_per_business"]
    current = Catalogue.query.filter_by(business_id=business_id).count()
    if plans.within_limit(current, maximum):
        return None
    return _blocked(
        _("Tu plan actual permite {limit} menú por negocio.", limit=maximum)
        if maximum == 1 else
        _("Tu plan actual permite hasta {limit} menús por negocio.", limit=maximum),
        maximum,
    )


def ensure_can_create_product(owner_id, catalogue_id):
    limits = limits_for_owner(owner_id)
    maximum = limits["max_products_per_catalogue"]
    current = Product.query.filter_by(catalogue_id=catalogue_id).count()
    if plans.within_limit(current, maximum):
        return None
    return _blocked(
        _("Tu plan actual permite hasta {limit} productos por menú.", limit=maximum),
        maximum,
    )


def ensure_analytics_access(owner_id):
    if limits_for_owner(owner_id)["allow_analytics"]:
        return None
    return _blocked(_("Tu plan actual no incluye analíticas."))


def ensure_template_allowed(owner_id, layout_key=None, theme=None, cover_upload=False,
                            background_upload=False, splash=None, splash_upload=False,
                            current=None):
    """Valida los cambios de plantilla que el plan permite.

    Se compara contra la configuración guardada y sólo se rechaza el cambio que
    **enciende** una función de pago. Los clientes reenvían la plantilla
    completa en cada guardado, así que juzgar por el valor recibido dejaba sin
    guardar a quien no intentaba nada: alguien en plan gratuito con la portada
    activada no podía ni cambiar sus colores. Apagar una función siempre se
    permite, venga del plan que venga.
    """
    plan_key = plan_key_for(owner_id)
    limits = plans.limits_for(plan_key)
    theme = theme if isinstance(theme, dict) else {}
    current = current or {}
    current_theme = current.get("theme") or {}
    current_splash = current.get("splash") or {}
    requested_splash = splash if isinstance(splash, dict) else {}

    def changed(value, stored):
        return value is not None and value != stored

    # Subir una imagen sí es siempre un intento de usar la función.
    if cover_upload and not limits["allow_cover"]:
        return _blocked(_("Tu plan actual no incluye portada en el menú."))
    if background_upload and not limits["allow_background"]:
        return _blocked(_("Tu plan actual no incluye imagen de fondo en el menú."))
    if splash_upload and not limits["allow_splash"]:
        return _blocked(_("Tu plan actual no incluye la pantalla de bienvenida del menú."))

    # Se compara contra `template_key`, no `layout_key`: es el campo que
    # siempre estuvo poblado de forma confiable (incluye filas creadas antes
    # de que `layout_key` existiera). Ambos representan hoy el mismo catálogo
    # de 8 claves, así que no cambia a qué se le aplica el límite.
    if changed(layout_key, current.get("template_key")) and not plans.allows_layout(plan_key, layout_key):
        return _blocked(_("Tu plan actual sólo incluye la plantilla básica."))

    font_key = theme.get("font_key")
    if changed(font_key, current_theme.get("font_key")) and not plans.allows_font(plan_key, font_key):
        return _blocked(_("Tu plan actual sólo incluye la tipografía básica."))

    if not limits["allow_cover"] and theme.get("show_cover") is True and current_theme.get("show_cover") is not True:
        return _blocked(_("Tu plan actual no incluye portada en el menú."))

    if not limits["allow_background"] and changed(theme.get("background_opacity"), current_theme.get("background_opacity")):
        return _blocked(_("Tu plan actual no incluye la personalización del fondo."))

    if not limits["allow_splash"]:
        turning_on = requested_splash.get("enabled") is True and current_splash.get("enabled") is not True
        if turning_on or changed(requested_splash.get("duration"), current_splash.get("duration")):
            return _blocked(_("Tu plan actual no incluye la pantalla de bienvenida del menú."))

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
