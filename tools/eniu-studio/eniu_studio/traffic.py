"""Tráfico de analíticas creíble para menús de demostración.

Genera los mismos eventos que manda un menú público real (`menu_view`,
`product_view`, `category_select`) para que la pantalla de Analíticas tenga
historia que enseñar en capturas y anuncios:

- Las horas son locales del negocio (pico de comida y de cena en su zona
  horaria, no en UTC), y los viernes y sábados se llenan más.
- El tráfico crece a lo largo del periodo, así la comparación contra el
  periodo anterior sale al alza.
- Una parte de las visitas son de clientes habituales (visitantes únicos <
  visitas), y la proporción se mantiene estable de un periodo a otro.
- Los productos tienen popularidad desigual: siempre hay uno claramente más
  visto, como en un restaurante de verdad.

Las claves de producto y categoría (`tracking_key`) se leen del menú público
que sirve la API, no se recalculan: así sirven igual en local que en
producción sin conocer el secreto del servidor.

Cada evento sembrado lleva `dedup_key` con el prefijo `seed:`; eso permite
volver a sembrar o limpiar sólo lo sembrado sin tocar visitas reales.

`generate_for_screenshots` además garantiza lo que se ve en una captura:
comparaciones de 7 y 30 días al alza y el platillo estrella arriba.
"""

import math
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

SEED_PREFIX = "seed:"

DEFAULT_SOURCES = {"qr": 52, "direct": 18, "social": 16, "copied_link": 9, "referral": 5}
DEFAULT_DEVICES = {"mobile": 84, "desktop": 10, "tablet": 6}
# Visitas por hora local: desayuno ligero, pico de comida (13-15 h) y de cena (19-21 h).
HOUR_WEIGHTS = {
    0: 1, 1: 0.5, 7: 1, 8: 2, 9: 3, 10: 3, 11: 4, 12: 7, 13: 11, 14: 12, 15: 8, 16: 4,
    17: 4, 18: 6, 19: 9, 20: 11, 21: 8, 22: 4, 23: 2,
}
# Lunes a domingo (0 = lunes, como en Python y en los días de las promociones).
WEEKDAY_FACTOR = (0.82, 0.86, 0.92, 1.0, 1.32, 1.45, 1.12)


@dataclass
class Traffic:
    days: int = 60
    daily_views: float = 40.0  # visitas en un jueves normal al inicio del periodo
    growth: float = 0.6  # crecimiento de principio a fin del periodo (0.6 = +60 %)
    returning: float = 0.28  # fracción de visitas de clientes habituales
    products_per_visit: float = 1.9
    category_rate: float = 0.5  # fracción de visitas que tocan un filtro de categoría
    sources: dict = field(default_factory=lambda: dict(DEFAULT_SOURCES))
    devices: dict = field(default_factory=lambda: dict(DEFAULT_DEVICES))
    seed: int | None = None
    # Días completos después de hoy: las pantallas piden datos hasta "hoy", así
    # que no se ven, pero si las capturas se toman pasada la medianoche del
    # negocio (Londres cambia de día a media tarde en México) siguen saliendo bien.
    ahead: int = 1


@dataclass
class Target:
    """Un producto o una categoría del menú público, con su peso de popularidad."""

    key: str
    name: str
    weight: float = 1.0


def targets_from_public_menu(menu, popularity=None):
    """Productos y categorías visibles del payload de `/public/menus/<slug>`.

    `popularity` ({nombre: peso}) permite decidir quién gana; sin él, el
    orden del menú marca la popularidad (los primeros platillos de cada
    sección se ven más), con algo de azar para que no salga una escalera.
    """
    popularity = popularity or {}
    payload = menu.get("menu", menu)
    sections = payload.get("categories") or []
    loose = payload.get("uncategorized_products") or payload.get("products") or []
    rng = random.Random(len(sections) * 7919 + len(loose))

    products, categories = [], []
    for section in sections:
        section_products = [_product_target(product, rank, popularity, rng) for rank, product in enumerate(section.get("products") or [])]
        products += section_products
        # Una categoría se filtra tanto como se antojan sus platillos.
        weight = popularity.get(section["name"], 0.5 + sum(p.weight for p in section_products))
        categories.append(Target(section["tracking_key"], section["name"], weight))
    for rank, product in enumerate(loose):
        products.append(_product_target(product, rank + 2, popularity, rng))
    return products, categories


def _product_target(product, rank, popularity, rng):
    if product["name"] in popularity:
        weight = float(popularity[product["name"]])
    else:
        weight = (1 / (rank + 1) ** 0.9) * rng.uniform(0.75, 1.3)
    if not product.get("is_available", True):
        weight *= 0.4  # un platillo agotado se sigue mirando, pero menos
    return Target(product["tracking_key"], product["name"], weight)


def _weighted(rng, mapping):
    keys = list(mapping)
    return rng.choices(keys, weights=[mapping[key] for key in keys], k=1)[0]


def _sample(rng, targets, count):
    """Muestra ponderada sin repetición (Efraimidis-Spirakis)."""
    keyed = sorted(targets, key=lambda target: rng.random() ** (1 / max(target.weight, 1e-6)), reverse=True)
    return keyed[:count]


def _poisson(rng, lam):
    limit, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limit:
            return k
        k += 1


def generate(catalogue_id, traffic, products, categories, timezone_name="UTC", now=None, until_now=False):
    """Lista de eventos (dicts listos para insertar en `analytics_event`).

    Por defecto hoy (y los `ahead` días siguientes) se generan completos:
    comparar "hoy a medias" contra días enteros haría que la semana actual
    saliera a la baja en la captura. Por lo mismo, hoy y los días siguientes
    nunca bajan respecto al día anterior: el inicio de la app enseña "vistas
    hoy" contra ayer, y un lunes siempre perdería contra el domingo.
    """
    rng = random.Random(traffic.seed)
    zone = ZoneInfo(timezone_name or "UTC")
    now = now or datetime.now(timezone.utc)
    today = now.astimezone(zone).date()
    last_day = today + timedelta(days=0 if until_now else traffic.ahead)
    limit = now if until_now else datetime.combine(last_day, time(23, 59, 59), zone).astimezone(timezone.utc)
    hours, hour_weights = list(HOUR_WEIGHTS), list(HOUR_WEIGHTS.values())
    # Clientela habitual desde el principio: si los habituales salieran sólo de
    # quien ya visitó, al inicio del periodo serían pocos y se repetirían mucho,
    # y los visitantes únicos "crecerían" más que las visitas.
    regulars = [uuid.UUID(int=rng.getrandbits(128)).hex for _ in range(max(15, round(traffic.daily_views * 8)))]
    events = []

    def event(event_type, at, visitor, session, source, device, target_type=None, target_key=None):
        events.append({
            "catalogue_id": catalogue_id,
            "event_type": event_type,
            "occurred_at": at,
            "visitor_hash": visitor,
            "session_hash": session,
            "target_type": target_type,
            "target_key": target_key,
            "source": source,
            "device_type": device,
            "dedup_key": f"{SEED_PREFIX}{uuid.uuid4().hex}",
        })

    previous = None
    for offset in range(traffic.days, -(last_day - today).days - 1, -1):
        day = today - timedelta(days=offset)
        progress = 1 - offset / traffic.days if traffic.days else 1.0
        mean = traffic.daily_views * (1 + traffic.growth * progress) * WEEKDAY_FACTOR[day.weekday()]
        count = max(0, round(mean * rng.lognormvariate(0, 0.1)))
        if offset <= 0 and previous is not None:
            count = max(count, round(previous * rng.uniform(1.04, 1.15)))
        previous = count
        for _ in range(count):
            hour = rng.choices(hours, weights=hour_weights, k=1)[0]
            at = datetime.combine(day, time(hour, rng.randrange(60), rng.randrange(60)), zone).astimezone(timezone.utc)
            if at > limit:
                continue
            if rng.random() < traffic.returning:
                visitor = rng.choice(regulars)
            else:
                visitor = uuid.UUID(int=rng.getrandbits(128)).hex
                if rng.random() < 0.12:  # algunos clientes nuevos se vuelven habituales
                    regulars.append(visitor)
            session = uuid.UUID(int=rng.getrandbits(128)).hex
            source = _weighted(rng, traffic.sources)
            device = _weighted(rng, traffic.devices)
            event("menu_view", at, visitor, session, source, device)

            if categories and rng.random() < traffic.category_rate:
                category = _sample(rng, categories, 1)[0]
                category_at = at + timedelta(seconds=rng.randint(2, 20))
                if category_at <= limit:
                    event("category_select", category_at, visitor, session, source, device, "category", category.key)

            moment = at
            for product in _sample(rng, products, min(len(products), _poisson(rng, traffic.products_per_visit))):
                moment += timedelta(seconds=rng.randint(4, 75))
                if moment <= limit:
                    event("product_view", moment, visitor, session, source, device, "product", product.key)
    return events


def _views_by_day(events, zone):
    days = {}
    for e in events:
        if e["event_type"] == "menu_view":
            day = e["occurred_at"].astimezone(zone).date()
            days[day] = days.get(day, 0) + 1
    return days


def growth(events, timezone_name, days, now=None):
    """Cambio % de visitas de los últimos `days` días contra los `days` anteriores,
    como lo calcula la pantalla de Analíticas."""
    zone = ZoneInfo(timezone_name or "UTC")
    today = (now or datetime.now(timezone.utc)).astimezone(zone).date()
    by_day = _views_by_day(events, zone)
    current = sum(by_day.get(today - timedelta(days=k), 0) for k in range(days))
    previous = sum(by_day.get(today - timedelta(days=days + k), 0) for k in range(days))
    return (current - previous) * 100 / previous if previous else 0.0


def top_product(events):
    counts = {}
    for e in events:
        if e["event_type"] == "product_view":
            counts[e["target_key"]] = counts.get(e["target_key"], 0) + 1
    return max(counts, key=counts.get) if counts else None


def generate_for_screenshots(catalogue_id, traffic, products, categories, timezone_name="UTC", now=None, attempts=60, min_weekly=8, min_monthly=12):
    """Como `generate`, pero repite con otra semilla hasta que lo que sale en una
    captura cuenta la historia correcta: visitas al alza contra la semana y el
    mes anteriores, y el producto más popular del archivo de la demo arriba.

    Una comparación sólo se exige si el periodo sembrado cubre también el
    periodo anterior completo (14 días para la semanal, 60 para la mensual);
    si no, sale como None."""
    base_seed = traffic.seed if traffic.seed is not None else random.randrange(1_000_000)
    star = max(products, key=lambda p: p.weight).key if products else None
    # `generate` siembra `days` días hacia atrás más hoy.
    windows = {window: minimum for window, minimum in ((7, min_weekly), (30, min_monthly)) if traffic.days + 1 >= 2 * window}
    best = None
    for attempt in range(attempts):
        seed = base_seed + attempt
        events = generate(catalogue_id, Traffic(**{**traffic.__dict__, "seed": seed}), products, categories, timezone_name, now)
        changes = {window: growth(events, timezone_name, window, now) for window in windows}
        score = min(changes.values(), default=0.0)
        if best is None or score > best[0]:
            best = (score, events, seed, changes)
        if all(changes[window] >= minimum for window, minimum in windows.items()) and top_product(events) == star:
            break
    else:
        _score, events, seed, changes = best
    return events, {
        "seed": seed,
        "growth_7d": round(changes[7], 1) if 7 in changes else None,
        "growth_30d": round(changes[30], 1) if 30 in changes else None,
    }


def summarize(events):
    views = [e for e in events if e["event_type"] == "menu_view"]
    products = {}
    for e in events:
        if e["event_type"] == "product_view":
            products[e["target_key"]] = products.get(e["target_key"], 0) + 1
    return {
        "menu_views": len(views),
        "visitors": len({e["visitor_hash"] for e in views}),
        "product_views": sum(products.values()),
        "category_selects": sum(1 for e in events if e["event_type"] == "category_select"),
        "total": len(events),
    }
