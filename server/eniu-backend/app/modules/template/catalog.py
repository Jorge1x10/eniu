"""Catálogo de layouts, paletas y tokens de plantilla.

Única fuente de verdad de "qué plantillas y qué colores existen": antes esta
lista vivía duplicada a mano en el backend (dos veces), en el dashboard web y
en la app móvil, y ya estaban desincronizadas entre sí (p. ej. el selector web
solo tenía miniatura propia para 3 de las 8 claves). `template/services.py`,
`billing/plans.py` y el endpoint `GET /api/templates` leen de aquí; los
clientes dejan de cablear su propia copia y consultan ese endpoint.

Sin dependencia de base de datos ni del resto de la app — se puede importar
desde servicios, rutas o migraciones sin riesgo de import circular.

"Plantilla" son dos ejes independientes que se combinan al leer:
- `layout_key`: composición estructural (qué tan comprimido va el header, si
  hay 1 o 2 columnas, dónde va la imagen y el precio, forma de la tarjeta).
- Color: una paleta curada (`color_preset_key`) más overrides sueltos
  opcionales (`theme_overrides`) para quien quiera tocar un token a mano.
"""

DEFAULT_LAYOUT_KEY = "modern"
DEFAULT_PALETTE_KEY = "classic"
DEFAULT_FONT_KEY = "inter"

# Los primeros 4 son los que ya existían como columnas planas
# (`background_color`, etc.); el resto son nuevos. Mantener este orden ayuda a
# leer el resto del módulo, pero no es significativo para el código.
COLOR_TOKENS = [
    {"key": "background", "label": "Fondo", "hint": "El lienzo de todo el menú"},
    {"key": "primary", "label": "Principal", "hint": "Botones, filtros y portada"},
    {"key": "accent", "label": "Acento", "hint": "Bordes y separadores"},
    {"key": "text", "label": "Texto", "hint": "Títulos y descripciones"},
    {"key": "surface", "label": "Superficie", "hint": "Fondo de las tarjetas de producto"},
    {"key": "muted", "label": "Texto secundario", "hint": "Descripciones de menor peso"},
    {"key": "price", "label": "Precio", "hint": "Color del precio de cada producto"},
    {"key": "category_title", "label": "Título de categoría", "hint": "Encabezado de cada sección"},
    {"key": "nav_chip_bg", "label": "Filtro activo (fondo)", "hint": "Chip de categoría seleccionado"},
    {"key": "nav_chip_text", "label": "Filtro activo (texto)", "hint": "Texto sobre el chip seleccionado"},
]
COLOR_TOKEN_KEYS = {token["key"] for token in COLOR_TOKENS}

# Tokens que ya existían como columnas propias (`background_color`, etc.) y
# siguen siendo la fuente autoritativa de esos 4 valores; el resto sólo vive
# en `theme_overrides`/paletas.
CORE_COLOR_KEYS = {"background", "primary", "accent", "text"}
EXTRA_COLOR_KEYS = COLOR_TOKEN_KEYS - CORE_COLOR_KEYS

FONTS = {
    "inter": {"name": "Inter"},
    "poppins": {"name": "Poppins"},
    "montserrat": {"name": "Montserrat"},
    "playfair": {"name": "Playfair Display"},
    "lora": {"name": "Lora"},
}

# Los 8 layouts reproducen la composición visual que ya tenían las 8 plantillas
# de hoy (ver `client/eniu/src/modules/Templates/templates/*.jsx`, que es lo
# que de verdad ve el cliente) — migrarlos no debe cambiar cómo se ve ningún
# menú publicado.
LAYOUTS = {
    "modern": {
        "name": "Moderna",
        "description": "Tarjetas visuales, portada amplia y navegación redondeada.",
        "blocks": {
            "header": {"align": "left", "eyebrow": "business", "title_weight": "black", "title_style": "normal"},
            "cover": {"compact": False},
            "nav": {"style": "pill"},
            "card": {"shape": "rounded", "border": "soft", "shadow": "soft"},
            "grid": {"columns": 2},
            "image": {"position": "top", "size": "large"},
            "price": {"position": "below"},
        },
    },
    "minimal": {
        "name": "Minimalista",
        "description": "Lectura rápida, filas limpias y pocas sombras.",
        "blocks": {
            "header": {"align": "left", "eyebrow": "business", "title_weight": "semibold", "title_style": "normal"},
            "cover": {"compact": True},
            "nav": {"style": "underline"},
            "card": {"shape": "row", "border": "bottom", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "side", "size": "small"},
            "price": {"position": "inline"},
        },
    },
    "elegant": {
        "name": "Elegante",
        "description": "Composición editorial, marcos sutiles y mayor espacio.",
        "blocks": {
            "header": {"align": "center", "eyebrow": "business", "title_weight": "normal", "title_style": "italic"},
            "cover": {"compact": False},
            "nav": {"style": "underline"},
            "card": {"shape": "bordered", "border": "uniform", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "top", "size": "large"},
            "price": {"position": "bordered"},
        },
    },
    "bistro": {
        "name": "Bistró",
        "description": "Carta cálida con acentos laterales y lectura relajada.",
        "blocks": {
            "header": {"align": "left", "eyebrow": "fixed:Selección de la casa", "title_weight": "black", "title_style": "normal"},
            "cover": {"compact": False},
            "nav": {"style": "pill"},
            "card": {"shape": "rounded-sm", "border": "left-accent", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "top", "size": "medium"},
            "price": {"position": "inline"},
        },
    },
    "bold": {
        "name": "Impactante",
        "description": "Bloques fuertes, bordes marcados y mucha personalidad.",
        "blocks": {
            "header": {"align": "left", "eyebrow": "fixed:Sabor sin límites", "title_weight": "black", "title_style": "uppercase"},
            "cover": {"compact": False},
            "nav": {"style": "pill"},
            "card": {"shape": "square", "border": "thick", "shadow": "offset"},
            "grid": {"columns": 2},
            "image": {"position": "top", "size": "medium"},
            "price": {"position": "below"},
        },
    },
    "natural": {
        "name": "Natural",
        "description": "Formas orgánicas, aire fresco y tarjetas suaves.",
        "blocks": {
            "header": {"align": "center", "eyebrow": "fixed:Ingredientes y origen", "title_weight": "extrabold", "title_style": "normal"},
            "cover": {"compact": False},
            "nav": {"style": "pill"},
            "card": {"shape": "organic", "border": "soft", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "top", "size": "medium"},
            "price": {"position": "below"},
        },
    },
    "retro": {
        "name": "Retro",
        "description": "Composición nostálgica con marcos punteados.",
        "blocks": {
            "header": {"align": "center", "eyebrow": "fixed:Clásicos favoritos", "title_weight": "black", "title_style": "uppercase-wide"},
            "cover": {"compact": False},
            "nav": {"style": "pill"},
            "card": {"shape": "rounded", "border": "dashed", "shadow": "none"},
            "grid": {"columns": 2},
            "image": {"position": "top", "size": "medium"},
            "price": {"position": "below"},
        },
    },
    "luxury": {
        "name": "Lujo",
        "description": "Presentación sobria con jerarquía editorial premium.",
        "blocks": {
            "header": {"align": "center", "eyebrow": "business", "title_weight": "bold", "title_style": "serif"},
            "cover": {"compact": False},
            "nav": {"style": "underline"},
            "card": {"shape": "row", "border": "top-bottom", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "top", "size": "large"},
            "price": {"position": "bordered"},
        },
    },
}

# 3 paletas para arrancar (ampliable después). "classic" reproduce el default
# de siempre (`DEFAULT_THEME` en `template/services.py`) para que sea, en los
# hechos, un no-op para cualquiera que nunca haya tocado sus colores.
PALETTES = {
    "classic": {
        "name": "Clásico Eniu",
        "tokens": {
            "background": "#FFFDF5", "primary": "#FFE05A", "accent": "#E8C93D", "text": "#111111",
            "surface": "#FFFFFF", "muted": "#6B6B6B", "price": "#111111", "category_title": "#111111",
            "nav_chip_bg": "#FFE05A", "nav_chip_text": "#111111",
        },
    },
    "midnight": {
        "name": "Oscura/Nocturna",
        "tokens": {
            "background": "#18140D", "primary": "#FFE05A", "accent": "#E8C93D", "text": "#F5F1E4",
            "surface": "#221C11", "muted": "#B7AC90", "price": "#FFE05A", "category_title": "#F5F1E4",
            "nav_chip_bg": "#FFE05A", "nav_chip_text": "#18140D",
        },
    },
    "vineyard": {
        "name": "Elegante/Vino",
        "tokens": {
            "background": "#FAF3EA", "primary": "#7A1F2B", "accent": "#C9A227", "text": "#241012",
            "surface": "#FFFFFF", "muted": "#8C6F63", "price": "#7A1F2B", "category_title": "#241012",
            "nav_chip_bg": "#7A1F2B", "nav_chip_text": "#FAF3EA",
        },
    },
}


def _to_rgb(hex_color):
    value = hex_color.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def _mix(hex_a, hex_b, weight):
    """Combina dos colores; `weight` es qué tanto pesa `hex_a` (0-1)."""
    a, b = _to_rgb(hex_a), _to_rgb(hex_b)
    mixed = tuple(round(a[index] * weight + b[index] * (1 - weight)) for index in range(3))
    return "#%02X%02X%02X" % mixed


def derive_tokens(background, primary, accent, text):
    """Deriva los 6 tokens nuevos a partir de los 4 colores planos de hoy.

    Se usa tanto en la migración (backfill de filas existentes) como al
    guardar por el contrato viejo (`theme` con 4 colores, sin paleta): en
    ambos casos hay que producirle a alguien que nunca vio el concepto de
    "paleta" un resultado que se vea igual a lo que ya tenía. Los valores
    replican el uso que cada uno ya tenía en el render actual: la tarjeta usa
    el fondo general, el precio y el título de categoría usan el color de
    texto, y el chip activo usa el color principal como fondo con el mismo
    texto general (ver `menu-preview.tsx`/`AdditionalMenuTemplates.jsx`).
    """
    return {
        "surface": background,
        "muted": _mix(text, background, 0.65),
        "price": text,
        "category_title": text,
        "nav_chip_bg": primary,
        "nav_chip_text": text,
    }


def resolve_layout(layout_key):
    return LAYOUTS.get(layout_key, LAYOUTS[DEFAULT_LAYOUT_KEY])


def resolve_theme(core_colors, color_preset_key=None, overrides=None):
    """Arma el set completo de 10 tokens para un catálogo dado.

    `core_colors` (background/primary/accent/text) es siempre autoritativo —
    son las columnas planas que ya existían. El resto sale de la paleta
    elegida (o de `classic` si no hay ninguna) y luego de `overrides` sueltos
    encima, para quien esté en modo avanzado.
    """
    base = dict(PALETTES.get(color_preset_key, PALETTES[DEFAULT_PALETTE_KEY])["tokens"])
    base.update({key: value for key, value in core_colors.items() if key in CORE_COLOR_KEYS})
    for key, value in (overrides or {}).items():
        if key in EXTRA_COLOR_KEYS:
            base[key] = value
    return base


def public_catalog():
    """Forma en la que `GET /api/templates` sirve el catálogo a los clientes."""
    return {
        "layouts": [
            {"key": key, "name": layout["name"], "description": layout["description"], "blocks": layout["blocks"]}
            for key, layout in LAYOUTS.items()
        ],
        "palettes": [
            {"key": key, "name": palette["name"], "tokens": palette["tokens"]}
            for key, palette in PALETTES.items()
        ],
        "fonts": [{"key": key, "name": font["name"]} for key, font in FONTS.items()],
        "color_tokens": COLOR_TOKENS,
    }
