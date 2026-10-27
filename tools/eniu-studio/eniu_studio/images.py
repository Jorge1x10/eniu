"""Fotos de platillos, portadas y logos dibujados con Pillow.

Estilo de foto cenital (vista desde arriba) sobre una superficie: madera,
lino o piedra, plato con sombra suave, comida y algún acompañamiento. Sirven
para que un menú de demostración se vea completo sin depender de fotos de
stock; para las capturas definitivas se pueden cambiar por fotos reales en el
archivo de la demo.

Todo se dibuja al doble de tamaño y se reduce al final: así los bordes salen
suaves sin antialiasing manual.
"""

import io
import math
import random
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SS = 2  # supermuestreo

KINDS = ("taco", "burger", "pizza", "soup", "salad", "guac", "dessert", "drink", "coffee", "fries", "plate")
KEYWORDS = [
    ("coffee", ("cafe", "coffee", "latte", "capuch", "espresso", "americano", "mocha")),
    ("drink", ("agua", "jugo", "limonada", "naranjada", "drink", "juice", "horchata", "jamaica", "soda", "refresco",
               "cerveza", "beer", "coctel", "cocktail", "margarita", "michelada", "smoothie", "malteada", "shake", "te")),
    ("taco", ("taco", "birria", "quesa", "pastor", "carnitas", "gringa", "burrito", "tostada", "enchilada")),
    ("burger", ("burger", "hamburguesa")),
    ("pizza", ("pizza",)),
    ("soup", ("sopa", "soup", "caldo", "pozole", "ramen", "consome", "crema de", "menudo")),
    ("salad", ("ensalada", "salad", "bowl", "poke")),
    ("guac", ("guacamole", "guac", "nachos", "totopos", "chilaquiles", "dip")),
    ("fries", ("papas", "fries", "frita", "aros de cebolla", "onion rings")),
    ("dessert", ("flan", "postre", "dessert", "pastel", "cake", "pay", "tarta", "brownie", "helado", "ice cream",
                 "churro", "cheesecake", "tres leches", "pan de")),
]


def _plain(text):
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in text if not unicodedata.combining(ch)) + " "


def _position(word, plain, tokens):
    """Índice de la primera palabra del nombre que coincide con `word`, o None."""
    if " " in word:  # frase: "crema de", "pan de", "tres leches"
        at = f" {plain}".find(f" {word} ")
        return None if at < 0 else len(plain[:at].split())
    for index, token in enumerate(tokens):
        # Palabras cortas sólo completas ("te" no es "elote"); las demás como
        # raíz, para aceptar plurales ("tacos", "hamburguesas").
        if (token == word) if len(word) <= 3 else token.startswith(word):
            return index
    return None


def guess_kind(name):
    """Tipo de platillo por su nombre. En español el tipo suele ir primero
    ("Pizza margarita", "Té helado"), así que gana la palabra más temprana."""
    plain = _plain(name)
    tokens = re.findall(r"[a-z]+", plain)
    best = None
    for order, (kind, words) in enumerate(KEYWORDS):
        found = [p for p in (_position(word, plain, tokens) for word in words) if p is not None]
        if found and (best is None or (min(found), order) < best[0]):
            best = ((min(found), order), kind)
    return best[1] if best else "plate"


SAUCES = (
    (("verde", "green", "tomatillo"), (96, 142, 58)),
    (("mole",), (78, 38, 26)),
    (("roja", "red", "birria", "pastor", "adobo", "chipotle"), (150, 64, 40)),
    (("queso", "cheese", "suiza", "crema"), (236, 214, 160)),
)


def sauce_for(name, default=(150, 64, 40)):
    plain = _plain(name)
    for words, color in SAUCES:
        if any(word in plain for word in words):
            return color
    return default


def _rng(seed_text):
    return random.Random(seed_text)


def _rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def _shade(color, factor):
    return tuple(max(0, min(255, round(c * factor))) for c in color)


def _mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


# --- Superficie y luz -----------------------------------------------------------------

SURFACES = {
    "wood": ((160, 112, 74), (128, 86, 54)),
    "walnut": ((96, 66, 46), (74, 50, 34)),
    "linen": ((232, 224, 210), (214, 204, 188)),
    "stone": ((198, 196, 190), (172, 170, 165)),
    "terracotta": ((196, 120, 86), (170, 98, 68)),
    "slate": ((62, 66, 70), (48, 51, 55)),
}


def _surface(size, style, rng):
    w, h = size
    base, dark = SURFACES[style]
    img = Image.new("RGB", size, base)
    draw = ImageDraw.Draw(img, "RGBA")
    if style in {"wood", "walnut"}:
        plank = h // rng.choice((4, 5))
        for y in range(0, h, plank):
            tone = _mix(base, dark, rng.uniform(0, 0.6))
            draw.rectangle([0, y, w, y + plank], fill=tone)
            for _ in range(int(w / 9)):
                gy = y + rng.uniform(0, plank)
                x0 = rng.uniform(-w * 0.2, w)
                draw.line([(x0, gy), (x0 + rng.uniform(w * 0.1, w * 0.5), gy + rng.uniform(-6, 6))],
                          fill=(*_shade(tone, rng.uniform(0.78, 0.95)), 70), width=rng.randint(1, 3) * SS)
            draw.line([(0, y), (w, y)], fill=(*_shade(dark, 0.7), 160), width=3 * SS)
    else:
        for _ in range(int(w * h / 900)):
            x, y = rng.uniform(0, w), rng.uniform(0, h)
            r = rng.uniform(0.5, 2.2) * SS
            draw.ellipse([x - r, y - r, x + r, y + r], fill=(*_shade(base, rng.uniform(0.86, 1.1)), 60))
        if style == "linen":
            for x in range(0, w, 7 * SS):
                draw.line([(x, 0), (x, h)], fill=(*dark, 18), width=SS)
            for y in range(0, h, 7 * SS):
                draw.line([(0, y), (w, y)], fill=(*dark, 14), width=SS)
    return img


def _vignette(img, strength=0.32):
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse([-w * 0.25, -h * 0.25, w * 1.25, h * 1.25], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(w * 0.12))
    dark = Image.new("RGB", (w, h), (20, 14, 10))
    return Image.composite(img, Image.blend(img, dark, strength), mask)


def _shadow(img, box, blur=18, opacity=110, offset=(14, 22), shape="ellipse"):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    dx, dy = offset[0] * SS, offset[1] * SS
    draw = ImageDraw.Draw(layer)
    if shape == "ellipse":
        draw.ellipse([x0 + dx, y0 + dy, x1 + dx, y1 + dy], fill=(0, 0, 0, opacity))
    else:
        draw.rounded_rectangle([x0 + dx, y0 + dy, x1 + dx, y1 + dy], radius=(x1 - x0) * 0.08, fill=(0, 0, 0, opacity))
    layer = layer.filter(ImageFilter.GaussianBlur(blur * SS))
    img.paste(layer, (0, 0), layer)


def _disc(draw, c, r, fill, outline=None, width=0):
    draw.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=fill, outline=outline, width=width)


def _plate(img, c, r, color=(250, 248, 243), rim=(232, 228, 220)):
    _shadow(img, (c[0] - r, c[1] - r, c[0] + r, c[1] + r))
    draw = ImageDraw.Draw(img, "RGBA")
    _disc(draw, c, r, rim)
    _disc(draw, c, r * 0.97, _shade(rim, 1.03))
    _disc(draw, c, r * 0.78, _shade(color, 0.97))
    _disc(draw, c, r * 0.74, color)
    # Brillo de la loza.
    draw.arc([c[0] - r * 0.9, c[1] - r * 0.9, c[0] + r * 0.9, c[1] + r * 0.9], 200, 250, fill=(255, 255, 255, 150), width=int(r * 0.03))
    return draw


def _bowl(img, c, r, outer=(244, 240, 232), inner=None, rim_width=0.12):
    _shadow(img, (c[0] - r, c[1] - r, c[0] + r, c[1] + r), blur=16, opacity=120)
    draw = ImageDraw.Draw(img, "RGBA")
    _disc(draw, c, r, outer)
    _disc(draw, c, r * (1 - rim_width), inner or _shade(outer, 0.9))
    draw.arc([c[0] - r * 0.93, c[1] - r * 0.93, c[0] + r * 0.93, c[1] + r * 0.93], 200, 245, fill=(255, 255, 255, 120), width=int(r * 0.04))
    return draw


def _leaf(draw, c, length, angle, color):
    a = math.radians(angle)
    dx, dy = math.cos(a) * length / 2, math.sin(a) * length / 2
    nx, ny = -dy * 0.45, dx * 0.45
    points = [(c[0] - dx, c[1] - dy), (c[0] + nx, c[1] + ny), (c[0] + dx, c[1] + dy), (c[0] - nx, c[1] - ny)]
    draw.polygon(points, fill=color)
    draw.line([points[0], points[2]], fill=(*_shade(color[:3], 0.75), 150), width=max(1, int(length * 0.06)))


def _herbs(draw, rng, c, spread, count, color=(62, 140, 70)):
    for _ in range(count):
        p = (c[0] + rng.uniform(-spread, spread), c[1] + rng.uniform(-spread, spread))
        _leaf(draw, p, rng.uniform(0.04, 0.07) * spread * 4, rng.uniform(0, 360), (*_shade(color, rng.uniform(0.85, 1.15)), 255))


def _lime(img, c, r, rng):
    draw = ImageDraw.Draw(img, "RGBA")
    _shadow(img, (c[0] - r, c[1] - r, c[0] + r, c[1] + r), blur=8, opacity=90, offset=(6, 10))
    start = rng.uniform(0, 360)
    draw.pieslice([c[0] - r, c[1] - r, c[0] + r, c[1] + r], start, start + 180, fill=(92, 156, 52))
    draw.pieslice([c[0] - r * 0.86, c[1] - r * 0.86, c[0] + r * 0.86, c[1] + r * 0.86], start, start + 180, fill=(196, 226, 120))
    for k in range(1, 4):
        a = math.radians(start + k * 45)
        draw.line([c, (c[0] + math.cos(a) * r * 0.8, c[1] + math.sin(a) * r * 0.8)], fill=(150, 196, 82), width=max(1, int(r * 0.06)))


def _sauce_cup(img, c, r, color):
    draw = _bowl(img, c, r, outer=(236, 232, 224), rim_width=0.18)
    _disc(draw, c, r * 0.78, color)
    draw.arc([c[0] - r * 0.6, c[1] - r * 0.6, c[0] + r * 0.6, c[1] + r * 0.6], 210, 260, fill=(255, 255, 255, 110), width=int(r * 0.1))


# --- Platillos -------------------------------------------------------------------------------

def _taco(img, c, s, rng, sauce=(150, 64, 40)):
    draw = _plate(img, c, s * 0.46)
    for k, dx in enumerate((-0.2, 0, 0.2)):
        cx, cy = c[0] + dx * s, c[1] + (0.02 if k == 1 else -0.01) * s
        tw, th = s * 0.15, s * 0.36
        angle = rng.uniform(-8, 8)
        shell = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shell)
        sd.ellipse([cx - tw, cy - th, cx + tw, cy + th], fill=(232, 182, 92, 255))
        sd.ellipse([cx - tw * 0.8, cy - th * 0.9, cx + tw * 0.8, cy + th * 0.9], fill=(*sauce, 255))
        for _ in range(26):
            px, py = cx + rng.uniform(-tw * 0.6, tw * 0.6), cy + rng.uniform(-th * 0.8, th * 0.8)
            rr = rng.uniform(0.012, 0.022) * s
            sd.ellipse([px - rr, py - rr, px + rr, py + rr], fill=(*_shade(_shade(sauce, 0.8), rng.uniform(0.8, 1.3)), 255))
        for _ in range(14):
            px, py = cx + rng.uniform(-tw * 0.55, tw * 0.55), cy + rng.uniform(-th * 0.75, th * 0.75)
            rr = rng.uniform(0.008, 0.013) * s
            sd.rectangle([px - rr, py - rr, px + rr, py + rr], fill=(248, 244, 236, 255))
        _herbs(sd, rng, (cx, cy), tw * 0.6, 10)
        shell = shell.rotate(angle, center=(cx, cy), resample=Image.BICUBIC)
        _shadow(img, (cx - tw, cy - th, cx + tw, cy + th), blur=8, opacity=80, offset=(5, 8))
        img.paste(shell, (0, 0), shell)
    _lime(img, (c[0] + s * 0.38, c[1] - s * 0.33), s * 0.07, rng)
    _sauce_cup(img, (c[0] - s * 0.4, c[1] + s * 0.34), s * 0.09, (176, 42, 30))


def _burger(img, c, s, rng):
    _plate(img, (c[0] - s * 0.05, c[1]), s * 0.46, color=(248, 246, 240))
    draw = ImageDraw.Draw(img, "RGBA")
    bc = (c[0] - s * 0.12, c[1] - s * 0.02)
    r = s * 0.23
    # Lechuga que asoma bajo el pan.
    for k in range(28):
        a = math.radians(k * 360 / 28)
        p = (bc[0] + math.cos(a) * r * 1.02, bc[1] + math.sin(a) * r * 1.02)
        _disc(draw, p, r * 0.13, (106, 170, 66))
    _shadow(img, (bc[0] - r, bc[1] - r, bc[0] + r, bc[1] + r), blur=10, opacity=90, offset=(6, 10))
    draw = ImageDraw.Draw(img, "RGBA")
    for k in range(10):  # domo dorado con degradado
        t = k / 9
        _disc(draw, (bc[0] - r * 0.08 * t, bc[1] - r * 0.1 * t), r * (1 - 0.55 * t), _mix((196, 120, 50), (236, 178, 92), t))
    for _ in range(40):
        a, d = rng.uniform(0, 6.283), rng.uniform(0, r * 0.82)
        p = (bc[0] + math.cos(a) * d, bc[1] + math.sin(a) * d)
        draw.ellipse([p[0] - s * 0.008, p[1] - s * 0.004, p[0] + s * 0.008, p[1] + s * 0.004], fill=(250, 240, 214))
    # Papas a un lado.
    for _ in range(18):
        x, y = c[0] + s * rng.uniform(0.12, 0.3), c[1] + s * rng.uniform(-0.2, 0.22)
        length, ang = s * rng.uniform(0.12, 0.2), rng.uniform(0, 3.14)
        x1, y1 = x + math.cos(ang) * length, y + math.sin(ang) * length
        draw.line([(x, y), (x1, y1)], fill=(232, 176, 70), width=int(s * 0.03))
        draw.line([(x, y), (x1, y1)], fill=(246, 206, 110), width=int(s * 0.016))
    _sauce_cup(img, (c[0] + s * 0.36, c[1] + s * 0.33), s * 0.08, (196, 40, 30))


def _pizza(img, c, s, rng):
    r = s * 0.44
    _shadow(img, (c[0] - r, c[1] - r, c[0] + r, c[1] + r))
    draw = ImageDraw.Draw(img, "RGBA")
    _disc(draw, c, r * 1.04, (120, 84, 52))  # tabla
    _disc(draw, c, r * 0.95, (214, 150, 78))
    _disc(draw, c, r * 0.84, (192, 52, 34))
    for _ in range(46):
        a, d = rng.uniform(0, 6.283), rng.uniform(0, r * 0.76)
        p = (c[0] + math.cos(a) * d, c[1] + math.sin(a) * d)
        _disc(draw, p, r * rng.uniform(0.06, 0.12), (250, 226, 160, 235))
    for _ in range(11):
        a, d = rng.uniform(0, 6.283), rng.uniform(r * 0.15, r * 0.7)
        p = (c[0] + math.cos(a) * d, c[1] + math.sin(a) * d)
        _disc(draw, p, r * 0.085, (168, 38, 30))
        _disc(draw, (p[0] - r * 0.02, p[1] - r * 0.02), r * 0.03, (200, 70, 52, 160))
    _herbs(draw, rng, c, r * 0.6, 9, color=(46, 120, 52))
    for k in range(4):
        a = math.radians(k * 45 + 10)
        draw.line([(c[0] - math.cos(a) * r * 0.95, c[1] - math.sin(a) * r * 0.95), (c[0] + math.cos(a) * r * 0.95, c[1] + math.sin(a) * r * 0.95)],
                  fill=(150, 90, 50, 150), width=int(s * 0.006))


def _soup(img, c, s, rng, sauce=(196, 72, 40)):
    broth = sauce
    r = s * 0.4
    draw = _bowl(img, c, r, outer=(238, 232, 220))
    _disc(draw, c, r * 0.84, broth)
    _disc(draw, (c[0] - r * 0.2, c[1] - r * 0.25), r * 0.3, (*_shade(broth, 1.12), 120))
    for _ in range(14):  # tiras de tortilla
        x, y = c[0] + rng.uniform(-r * 0.5, r * 0.5), c[1] + rng.uniform(-r * 0.5, r * 0.5)
        a = rng.uniform(0, 3.14)
        draw.line([(x, y), (x + math.cos(a) * r * 0.28, y + math.sin(a) * r * 0.28)], fill=(240, 196, 92), width=int(r * 0.07))
    for _ in range(8):  # aguacate
        x, y = c[0] + rng.uniform(-r * 0.45, r * 0.45), c[1] + rng.uniform(-r * 0.45, r * 0.45)
        draw.rectangle([x, y, x + r * 0.1, y + r * 0.1], fill=(140, 186, 72))
    _disc(draw, (c[0] + r * 0.15, c[1] + r * 0.1), r * 0.14, (250, 246, 236))  # crema
    _herbs(draw, rng, c, r * 0.5, 7)
    _lime(img, (c[0] + s * 0.4, c[1] - s * 0.32), s * 0.07, rng)


def _salad(img, c, s, rng):
    r = s * 0.42
    draw = _bowl(img, c, r, outer=(240, 236, 228))
    greens = [(92, 156, 62), (120, 182, 76), (68, 128, 56), (150, 196, 92)]
    for _ in range(70):
        p = (c[0] + rng.uniform(-r * 0.7, r * 0.7), c[1] + rng.uniform(-r * 0.7, r * 0.7))
        if (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 < (r * 0.76) ** 2:
            _leaf(draw, p, r * rng.uniform(0.22, 0.36), rng.uniform(0, 360), (*rng.choice(greens), 255))
    for _ in range(7):
        p = (c[0] + rng.uniform(-r * 0.5, r * 0.5), c[1] + rng.uniform(-r * 0.5, r * 0.5))
        _disc(draw, p, r * 0.09, (210, 52, 40))
        _disc(draw, (p[0] - r * 0.025, p[1] - r * 0.025), r * 0.03, (240, 120, 100))
    for _ in range(8):
        p = (c[0] + rng.uniform(-r * 0.5, r * 0.5), c[1] + rng.uniform(-r * 0.5, r * 0.5))
        draw.rectangle([p[0], p[1], p[0] + r * 0.09, p[1] + r * 0.09], fill=(250, 246, 232))


def _guac(img, c, s, rng):
    r = s * 0.36
    draw = _bowl(img, c, r, outer=(70, 66, 62), inner=(58, 54, 50), rim_width=0.16)  # molcajete
    _disc(draw, c, r * 0.8, (122, 168, 64))
    for _ in range(90):
        p = (c[0] + rng.uniform(-r * 0.7, r * 0.7), c[1] + rng.uniform(-r * 0.7, r * 0.7))
        if (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 < (r * 0.74) ** 2:
            _disc(draw, p, r * rng.uniform(0.02, 0.05), (*_shade((122, 168, 64), rng.uniform(0.8, 1.2)), 200))
    for _ in range(9):
        p = (c[0] + rng.uniform(-r * 0.45, r * 0.45), c[1] + rng.uniform(-r * 0.45, r * 0.45))
        draw.rectangle([p[0], p[1], p[0] + r * 0.07, p[1] + r * 0.07], fill=rng.choice([(214, 60, 44), (250, 246, 236)]))
    _herbs(draw, rng, c, r * 0.4, 6)
    for k in range(9):  # totopos alrededor
        a = math.radians(k * 40 + rng.uniform(-10, 10))
        p = (c[0] + math.cos(a) * r * 1.25, c[1] + math.sin(a) * r * 1.2)
        size = r * 0.32
        tri = [(p[0] + math.cos(a + d) * size, p[1] + math.sin(a + d) * size) for d in (0, 2.2, 4.1)]
        draw.polygon(tri, fill=(232, 184, 86))
        draw.line(tri + [tri[0]], fill=(204, 146, 60), width=int(s * 0.004))


def _dessert(img, c, s, rng):
    draw = _plate(img, c, s * 0.42)
    r = s * 0.2
    _disc(draw, (c[0] + r * 0.15, c[1] + r * 0.2), r * 1.5, (156, 74, 22, 200))  # caramelo
    _shadow(img, (c[0] - r, c[1] - r, c[0] + r, c[1] + r), blur=8, opacity=90, offset=(5, 8))
    draw = ImageDraw.Draw(img, "RGBA")
    for k in range(8):
        t = k / 7
        _disc(draw, (c[0] - r * 0.1 * t, c[1] - r * 0.12 * t), r * (1 - 0.35 * t), _mix((168, 82, 24), (216, 138, 50), t))
    _disc(draw, (c[0] - r * 0.35, c[1] - r * 0.4), r * 0.18, (255, 236, 200, 170))
    for _ in range(5):  # frutos rojos
        p = (c[0] + s * rng.uniform(0.12, 0.28), c[1] + s * rng.uniform(-0.25, -0.1))
        _disc(draw, p, s * 0.025, (150, 20, 40))
    _herbs(draw, rng, (c[0] + s * 0.2, c[1] - s * 0.2), s * 0.05, 3, color=(70, 150, 80))


def _drink(img, c, s, rng, liquid=None):
    liquid = liquid or rng.choice([(196, 40, 70), (236, 220, 190), (246, 190, 60), (130, 190, 80)])
    r = s * 0.3
    _shadow(img, (c[0] - r, c[1] - r, c[0] + r, c[1] + r), blur=12, opacity=80)
    draw = ImageDraw.Draw(img, "RGBA")
    _disc(draw, c, r, (226, 236, 238))
    _disc(draw, c, r * 0.9, liquid)
    _disc(draw, (c[0] - r * 0.3, c[1] - r * 0.3), r * 0.35, (*_shade(liquid, 1.2), 110))
    for _ in range(5):  # hielos
        p = (c[0] + rng.uniform(-r * 0.45, r * 0.45), c[1] + rng.uniform(-r * 0.45, r * 0.45))
        q = r * 0.17
        draw.rounded_rectangle([p[0] - q, p[1] - q, p[0] + q, p[1] + q], radius=q * 0.35, fill=(255, 255, 255, 110), outline=(255, 255, 255, 170), width=SS)
    draw.line([(c[0] + r * 0.1, c[1] - r * 0.1), (c[0] + r * 1.3, c[1] - r * 1.1)], fill=(30, 30, 30), width=int(s * 0.022))
    _lime(img, (c[0] - r * 0.95, c[1] + r * 0.9), s * 0.07, rng)


def _coffee(img, c, s, rng):
    draw = _plate(img, c, s * 0.36, color=(246, 244, 240))
    r = s * 0.22
    _shadow(img, (c[0] - r, c[1] - r, c[0] + r, c[1] + r), blur=8, opacity=90, offset=(5, 8))
    draw = ImageDraw.Draw(img, "RGBA")
    _disc(draw, c, r, (250, 250, 248))
    draw.rounded_rectangle([c[0] + r * 0.9, c[1] - r * 0.15, c[0] + r * 1.45, c[1] + r * 0.15], radius=r * 0.15, fill=(244, 244, 240))
    _disc(draw, c, r * 0.82, (110, 66, 38))
    _disc(draw, c, r * 0.7, (196, 140, 92))
    # Corazón de arte latte.
    _disc(draw, (c[0] - r * 0.18, c[1] - r * 0.08), r * 0.22, (250, 238, 220))
    _disc(draw, (c[0] + r * 0.18, c[1] - r * 0.08), r * 0.22, (250, 238, 220))
    draw.polygon([(c[0] - r * 0.38, c[1]), (c[0] + r * 0.38, c[1]), (c[0], c[1] + r * 0.4)], fill=(250, 238, 220))


def _fries(img, c, s, rng):
    draw = _plate(img, c, s * 0.42)
    for _ in range(60):
        x, y = c[0] + rng.uniform(-s * 0.24, s * 0.24), c[1] + rng.uniform(-s * 0.24, s * 0.24)
        length, ang = s * rng.uniform(0.12, 0.22), rng.uniform(0, 3.14)
        x1, y1 = x + math.cos(ang) * length, y + math.sin(ang) * length
        draw.line([(x, y), (x1, y1)], fill=(222, 164, 62), width=int(s * 0.034))
        draw.line([(x, y), (x1, y1)], fill=(246, 204, 108), width=int(s * 0.018))
    _sauce_cup(img, (c[0] + s * 0.38, c[1] + s * 0.32), s * 0.09, (196, 40, 30))


def _plate_food(img, c, s, rng):
    draw = _plate(img, c, s * 0.44)
    # Arroz, guiso y frijoles: un plato fuerte genérico.
    for _ in range(80):
        p = (c[0] - s * 0.14 + rng.uniform(-s * 0.12, s * 0.12), c[1] + s * 0.08 + rng.uniform(-s * 0.1, s * 0.1))
        _disc(draw, p, s * 0.012, (246, 236, 214))
    _disc(draw, (c[0] + s * 0.12, c[1] - s * 0.06), s * 0.17, (130, 56, 34))
    for _ in range(18):
        p = (c[0] + s * 0.12 + rng.uniform(-s * 0.12, s * 0.12), c[1] - s * 0.06 + rng.uniform(-s * 0.12, s * 0.12))
        _disc(draw, p, s * rng.uniform(0.02, 0.035), _shade((110, 44, 26), rng.uniform(0.8, 1.3)))
    _disc(draw, (c[0] - s * 0.1, c[1] - s * 0.18), s * 0.1, (70, 40, 32))
    _herbs(draw, rng, (c[0] + s * 0.1, c[1] - s * 0.1), s * 0.1, 8)


DRAWERS = {
    "taco": _taco, "burger": _burger, "pizza": _pizza, "soup": _soup, "salad": _salad, "guac": _guac,
    "dessert": _dessert, "drink": _drink, "coffee": _coffee, "fries": _fries, "plate": _plate_food,
}
SURFACE_FOR = {
    "taco": ("wood", "terracotta", "linen"), "burger": ("walnut", "slate", "wood"), "pizza": ("stone", "linen", "slate"),
    "soup": ("terracotta", "wood", "linen"), "salad": ("linen", "stone", "wood"), "guac": ("wood", "terracotta"),
    "dessert": ("linen", "stone", "walnut"), "drink": ("linen", "stone", "terracotta"), "coffee": ("walnut", "wood", "linen"),
    "fries": ("slate", "wood"), "plate": ("wood", "linen", "stone"),
}


def _encode(img, size, quality=88):
    img = img.resize(size, Image.LANCZOS).convert("RGB")
    out = io.BytesIO()
    img.save(out, "JPEG", quality=quality, optimize=True)
    return out.getvalue()


def _slug(text):
    return re.sub(r"[^a-z0-9]+", "-", _plain(text)).strip("-") or "imagen"


def food_photo(name, kind=None, size=(1200, 900)):
    """Foto cenital del platillo. Devuelve (nombre de archivo, bytes, mimetype)."""
    kind = kind or guess_kind(name)
    rng = _rng(f"{kind}:{name}")
    w, h = size[0] * SS, size[1] * SS
    img = _surface((w, h), rng.choice(SURFACE_FOR[kind]), rng)
    s = min(w, h) * 0.98
    center = (w / 2 + rng.uniform(-0.03, 0.03) * w, h / 2 + rng.uniform(-0.03, 0.03) * h)
    if kind == "taco":
        _taco(img, center, s, rng, sauce=sauce_for(name))
    elif kind == "soup":
        _soup(img, center, s, rng, sauce=sauce_for(name, default=(196, 72, 40)))
    else:
        DRAWERS[kind](img, center, s, rng)
    img = _vignette(img)
    return f"{_slug(name)}.jpg", _encode(img, size), "image/jpeg"


def cover_photo(title, kinds=("taco", "soup", "drink", "guac", "dessert"), size=(1600, 900)):
    """Portada tipo "mesa servida": varios platillos vistos desde arriba."""
    rng = _rng(f"cover:{title}")
    w, h = size[0] * SS, size[1] * SS
    img = _surface((w, h), "wood", rng)
    spots = [(0.2, 0.32, 0.5), (0.52, 0.62, 0.62), (0.84, 0.3, 0.42), (0.86, 0.82, 0.4), (0.16, 0.86, 0.38)]
    for kind, (fx, fy, fs) in zip(kinds, spots):
        DRAWERS[kind](img, (fx * w, fy * h), h * fs, rng)
    img = _vignette(img, 0.4)
    return f"portada-{_slug(title)}.jpg", _encode(img, size), "image/jpeg"


def _font(size, bold=True):
    candidates = ["georgiab.ttf", "georgia.ttf", "seguisb.ttf", "arialbd.ttf"] if bold else ["georgia.ttf", "segoeui.ttf", "arial.ttf"]
    for name in candidates:
        for folder in (Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/dejavu"), Path("/Library/Fonts")):
            path = folder / name
            if path.exists():
                return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def logo(name, background="#1F3D2B", foreground="#F6E7C1", size=800):
    """Logo circular con las iniciales del negocio."""
    words = [w for w in re.split(r"\s+", name.strip()) if w]
    initials = "".join(w[0] for w in words[:2]).upper() or "E"
    s = size * SS
    img = Image.new("RGB", (s, s), _rgb(background))
    draw = ImageDraw.Draw(img)
    fg = _rgb(foreground)
    draw.ellipse([s * 0.07, s * 0.07, s * 0.93, s * 0.93], outline=fg, width=int(s * 0.012))
    font = _font(int(s * 0.36))
    box = draw.textbbox((0, 0), initials, font=font)
    draw.text(((s - (box[2] - box[0])) / 2 - box[0], (s - (box[3] - box[1])) / 2 - box[1] - s * 0.03), initials, font=font, fill=fg)
    small = _font(int(s * 0.055), bold=False)
    label = " ".join(words).upper()
    box = draw.textbbox((0, 0), label, font=small)
    draw.text(((s - (box[2] - box[0])) / 2, s * 0.72), label, font=small, fill=fg)
    out = io.BytesIO()
    img.resize((size, size), Image.LANCZOS).save(out, "PNG", optimize=True)
    return f"logo-{_slug(name)}.png", out.getvalue(), "image/png"
