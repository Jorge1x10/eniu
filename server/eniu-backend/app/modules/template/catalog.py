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
    # Sans-serif adicionales — misma familia visual que las 3 de arriba, para
    # quien quiera variar sin salirse de "letra limpia".
    "roboto": {"name": "Roboto"},
    "open_sans": {"name": "Open Sans"},
    "nunito": {"name": "Nunito"},
    "raleway": {"name": "Raleway"},
    "work_sans": {"name": "Work Sans"},
    "rubik": {"name": "Rubik"},
    "karla": {"name": "Karla"},
    "manrope": {"name": "Manrope"},
    "sora": {"name": "Sora"},
    "space_grotesk": {"name": "Space Grotesk"},
    "barlow": {"name": "Barlow"},
    "archivo": {"name": "Archivo"},
    # Serif — tono editorial/elegante, en la misma línea que Playfair/Lora.
    "merriweather": {"name": "Merriweather"},
    "libre_baskerville": {"name": "Libre Baskerville"},
    "crimson_text": {"name": "Crimson Text"},
    "pt_serif": {"name": "PT Serif"},
    "cormorant": {"name": "Cormorant"},
    "fraunces": {"name": "Fraunces"},
    "dm_serif_display": {"name": "DM Serif Display"},
    "bitter": {"name": "Bitter"},
    # Display — titulares con mucha personalidad, para portadas y encabezados.
    "bebas_neue": {"name": "Bebas Neue"},
    "oswald": {"name": "Oswald"},
    "anton": {"name": "Anton"},
    "abril_fatface": {"name": "Abril Fatface"},
    "righteous": {"name": "Righteous"},
    # Manuscrita — el toque "hecho a mano" que le falta a la plantilla Pizarra.
    "pacifico": {"name": "Pacifico"},
    "dancing_script": {"name": "Dancing Script"},
    "caveat": {"name": "Caveat"},
    # Monoespaciada — el aire de recibo/ticket que pide la plantilla Recibo.
    "jetbrains_mono": {"name": "JetBrains Mono"},
    "space_mono": {"name": "Space Mono"},
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
    # Los siguientes 5 se diseñaron a partir de referencias reales de menús
    # digitales (pizarra/chalkboard, editorial de revista, navegación
    # lateral, formato recibo, tarjetas narrativas) — cada uno cambia la
    # composición, no sólo el estilo, de los 8 anteriores.
    "chalkboard": {
        "name": "Pizarra",
        "description": "Título manuscrito, marco punteado y aire de café de barrio.",
        "blocks": {
            "header": {"align": "center", "eyebrow": "business", "title_weight": "black", "title_style": "handwritten"},
            "cover": {"compact": True},
            "nav": {"style": "pill"},
            "card": {"shape": "sketched", "border": "dashed-thick", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "none", "size": "none"},
            "price": {"position": "handwritten"},
        },
    },
    "magazine": {
        "name": "Revista",
        "description": "Un producto destacado arriba en grande, luego cuadrícula editorial.",
        "blocks": {
            "header": {"align": "left", "eyebrow": "fixed:Edición del chef", "title_weight": "black", "title_style": "condensed"},
            "cover": {"compact": False},
            "nav": {"style": "pill"},
            "card": {"shape": "rounded", "border": "none", "shadow": "soft"},
            "grid": {"columns": 2, "featured_first": True},
            "image": {"position": "top", "size": "hero"},
            "price": {"position": "below"},
        },
    },
    "sidebar": {
        "name": "Columnas",
        "description": "Categorías fijas a un lado, como una carta de restaurante formal.",
        "blocks": {
            "header": {"align": "left", "eyebrow": "business", "title_weight": "semibold", "title_style": "normal"},
            "cover": {"compact": True},
            "nav": {"style": "sidebar"},
            "card": {"shape": "row", "border": "bottom", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "side", "size": "small"},
            "price": {"position": "inline"},
        },
    },
    "receipt": {
        "name": "Recibo",
        "description": "Lista compacta sin imágenes, precio con línea punteada — ideal para cartas largas.",
        "blocks": {
            "header": {"align": "left", "eyebrow": "fixed:Ticket del día", "title_weight": "semibold", "title_style": "monospace"},
            "cover": {"compact": True},
            "nav": {"style": "none"},
            "card": {"shape": "row", "border": "dotted-leader", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "none", "size": "none"},
            "price": {"position": "leader"},
        },
    },
    "story": {
        "name": "Historia",
        "description": "Cada plato con una nota del chef, para cartas con pocos productos y mucha personalidad.",
        "blocks": {
            "header": {"align": "center", "eyebrow": "fixed:Nuestra historia", "title_weight": "normal", "title_style": "italic"},
            "cover": {"compact": False},
            "nav": {"style": "underline"},
            "card": {"shape": "unbordered", "border": "none", "shadow": "none"},
            "grid": {"columns": 1},
            "image": {"position": "side", "size": "medium"},
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
            # `surface` = `background`: antes de que "superficie de tarjeta"
            # existiera como concepto, cada plantilla ya rellenaba sus tarjetas
            # con `background_color` — mantenerlos iguales aquí es lo que hace
            # que activar esta paleta en un menú existente no mueva un píxel.
            "surface": "#FFFDF5", "muted": "#6B6B6B", "price": "#111111", "category_title": "#111111",
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


# Fondos prediseñados: no son imágenes (no hay que subir ni servir ningún
# archivo) — son patrones CSS descritos como datos, pintados con
# `currentColor` para que se adapten solos a cualquier paleta sin que este
# catálogo tenga que saber de colores. La misma opacidad que ya controla el
# fondo con imagen propia (`background_opacity`) sirve para atenuarlos.
BACKGROUNDS = {
    "paper": {
        "name": "Papel",
        "description": "Rayado diagonal fino, casi imperceptible.",
        "css": "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 12px)",
        "size": "12px 12px",
    },
    "dots": {
        "name": "Puntos",
        "description": "Puntitos regulares, estilo papel picado.",
        "css": "radial-gradient(currentColor 1.5px, transparent 1.5px)",
        "size": "16px 16px",
    },
    "grid": {
        "name": "Cuadrícula",
        "description": "Líneas finas tipo hoja cuadriculada.",
        "css": (
            "linear-gradient(currentColor 1px, transparent 1px), "
            "linear-gradient(90deg, currentColor 1px, transparent 1px)"
        ),
        "size": "24px 24px",
    },
    "stripes": {
        "name": "Rayas",
        "description": "Franjas diagonales con más presencia.",
        "css": "repeating-linear-gradient(-45deg, currentColor 0, currentColor 2px, transparent 2px, transparent 16px)",
        "size": "16px 16px",
    },
    "crosshatch": {
        "name": "Trama cruzada",
        "description": "Dos rayados diagonales que se cruzan, como tela.",
        "css": (
            "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 10px), "
            "repeating-linear-gradient(-45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 10px)"
        ),
        "size": "10px 10px",
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
        "backgrounds": [
            {"key": key, "name": bg["name"], "description": bg["description"], "css": bg["css"], "size": bg["size"]}
            for key, bg in BACKGROUNDS.items()
        ],
    }
