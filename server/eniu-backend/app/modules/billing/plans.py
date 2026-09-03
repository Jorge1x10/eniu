"""Límites y funciones incluidas en cada plan de Eniu.

Este módulo es la única fuente de verdad de los planes. El backend los aplica
y los expone en la API para que el dashboard web y la app móvil los lean en
lugar de cablearlos: así cambiar un límite no obliga a publicar una versión
nueva en las tiendas.
"""

from app.modules.template import catalog
from app.shared.i18n import _

FREE = "free"
ESSENTIAL = "essential"
PRO = "pro"

# Un límite en None significa "sin tope".
UNLIMITED = None

DEFAULT_LAYOUT_KEY = catalog.DEFAULT_LAYOUT_KEY
DEFAULT_FONT_KEY = catalog.DEFAULT_FONT_KEY


PLANS = {
    FREE: {
        "name": "Plan gratuito",
        "max_businesses": 1,
        "max_catalogues_per_business": 1,
        "max_products_per_catalogue": 15,
        "layout_keys": {DEFAULT_LAYOUT_KEY},
        "font_keys": {DEFAULT_FONT_KEY},
        # El color nunca fue una función de pago: el gratuito siempre pudo
        # elegir cualquier color, y sigue pudiendo elegir cualquier paleta
        # curada o entrar en modo avanzado igual que un plan pago.
        "allow_cover": False,
        "allow_background": False,
        "allow_product_images": True,
        "allow_analytics": False,
        "allow_splash": False,
        "show_eniu_badge": True,
    },
    ESSENTIAL: {
        "name": "Plan Esencial",
        "max_businesses": 3,
        "max_catalogues_per_business": 5,
        "max_products_per_catalogue": UNLIMITED,
        "layout_keys": None,  # None = todas las plantillas disponibles
        "font_keys": None,    # None = todas las tipografías disponibles
        "allow_cover": True,
        "allow_background": True,
        "allow_product_images": True,
        "allow_analytics": True,
        "allow_splash": True,
        "show_eniu_badge": False,
    },
}

# Pro todavía no tiene funciones propias: hereda Esencial para poder venderlo
# mientras se construye lo que lo diferencia.
PLANS[PRO] = {**PLANS[ESSENTIAL], "name": "Plan Pro"}

PAID_PLAN_KEYS = (ESSENTIAL, PRO)


def limits_for(plan_key):
    """Devuelve los límites del plan; cae a gratuito si la clave no existe."""
    return PLANS.get(plan_key, PLANS[FREE])


def effective_plan_key(user):
    """Plan que realmente aplica a un usuario.

    Una suscripción vencida o con el pago rechazado conserva su `plan_key` en
    la base para poder reactivarla, pero mientras no tenga acceso el usuario
    vive bajo las reglas del plan gratuito.
    """
    subscription = getattr(user, "billing_subscription", None)
    if not subscription or not subscription.has_access:
        return FREE
    return subscription.plan_key if subscription.plan_key in PLANS else FREE


def allows_layout(plan_key, layout_key):
    allowed = limits_for(plan_key)["layout_keys"]
    return allowed is None or layout_key in allowed


def allows_font(plan_key, font_key):
    allowed = limits_for(plan_key)["font_keys"]
    return allowed is None or font_key in allowed


def within_limit(count, limit):
    """True si todavía cabe un elemento más bajo ese límite."""
    return limit is UNLIMITED or count < limit


def to_public_dict(plan_key):
    """Forma en la que los límites viajan a los clientes."""
    limits = limits_for(plan_key)
    return {
        "max_businesses": limits["max_businesses"],
        "max_catalogues_per_business": limits["max_catalogues_per_business"],
        "max_products_per_catalogue": limits["max_products_per_catalogue"],
        "layout_keys": sorted(limits["layout_keys"]) if limits["layout_keys"] else None,
        # Alias: clientes que todavía no leen `layout_keys` (app/web sin
        # actualizar) siguen encontrando el campo con el nombre de siempre.
        "template_keys": sorted(limits["layout_keys"]) if limits["layout_keys"] else None,
        "font_keys": sorted(limits["font_keys"]) if limits["font_keys"] else None,
        "allow_cover": limits["allow_cover"],
        "allow_background": limits["allow_background"],
        "allow_product_images": limits["allow_product_images"],
        "allow_analytics": limits["allow_analytics"],
        "allow_splash": limits["allow_splash"],
        "show_eniu_badge": limits["show_eniu_badge"],
    }


def plan_payload(plan_key, effective_key=None, status="inactive", has_access=False,
                 cancel_at_period_end=False, current_period_end=None):
    """Plan tal como lo consumen el dashboard web y la app móvil.

    `plan_key` es lo que el usuario contrató y `effective_key` lo que
    realmente aplica hoy: alguien con el pago rechazado sigue viendo "Plan
    Esencial" en pantalla, pero con los límites del gratuito.
    """
    effective_key = effective_key or plan_key
    return {
        "key": plan_key,
        # El nombre se traduce aquí y no en `PLANS` porque ese diccionario es la
        # fuente en español que sirve de clave del catálogo. Los clientes
        # también reciben `key`, por si prefieren rotularlo ellos mismos.
        "name": _(limits_for(plan_key)["name"]),
        "status": status,
        "has_access": has_access,
        "cancel_at_period_end": cancel_at_period_end,
        "current_period_end": current_period_end,
        "effective_key": effective_key,
        "limits": to_public_dict(effective_key),
    }


DEFAULT_BACKGROUND_OPACITY = 0.2


def sanitize_public_splash(plan_key, splash):
    """Apaga la pantalla de bienvenida en los planes que no la incluyen."""
    if limits_for(plan_key)["allow_splash"]:
        return dict(splash)
    return {**splash, "enabled": False, "image_url": None}


def sanitize_public_theme(plan_key, layout_key, theme):
    """Ajusta la plantilla de un menú público a lo que el plan permite.

    Se aplica al dibujar, no al guardar. Un usuario que baja de plan conserva
    intacta su configuración en la base y ve el menú con la plantilla básica;
    al volver a pagar recupera su diseño sin haber perdido nada. El color
    nunca se degrada aquí: nunca fue una función de pago.
    """
    limits = limits_for(plan_key)
    theme = dict(theme)

    if not allows_layout(plan_key, layout_key):
        layout_key = DEFAULT_LAYOUT_KEY
    if not allows_font(plan_key, theme.get("font_key")):
        theme["font_key"] = DEFAULT_FONT_KEY
    if not limits["allow_cover"]:
        theme["show_cover"] = False
        theme["cover_image_url"] = None
    if not limits["allow_background"]:
        theme["background_image_url"] = None
        theme["background_opacity"] = DEFAULT_BACKGROUND_OPACITY
    if not limits["allow_product_images"]:
        theme["show_product_images"] = False

    return layout_key, theme
