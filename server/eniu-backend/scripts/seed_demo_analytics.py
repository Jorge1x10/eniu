#!/usr/bin/env python3
"""Siembra eventos de analíticas realistas para un catálogo de demostración.

Pensado para la cuenta que se usa en las capturas del App Store
(EXPO_SCREENSHOT_EMAIL): la pantalla de Analíticas se ve vacía con una cuenta
recién creada, y esto le da actividad de los últimos N días sin tocar el
código de producción ni la app.

Corre siempre contra la base de datos apuntada por DATABASE_URL. Úsalo solo
con catálogos de demostración/staging — nunca con el catálogo de un negocio
real, porque --wipe borra sus eventos previos.

Uso:
    cd server/eniu-backend
    DATABASE_URL=postgresql://... python scripts/seed_demo_analytics.py \
        --slug la-hamburgueseria-san-agustin-burguers --wipe
"""
import argparse
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app  # noqa: E402
from app.database.db import db  # noqa: E402
from app.modules.analytics.model import AnalyticsEvent  # noqa: E402
from app.modules.analytics.security import tracking_key  # noqa: E402
from app.modules.catalogue.model import Catalogue  # noqa: E402

SOURCES_WEIGHTED = [("qr", 45), ("direct", 25), ("social", 15), ("copied_link", 10), ("referral", 5)]
DEVICES_WEIGHTED = [("mobile", 82), ("desktop", 12), ("tablet", 6)]
# Pico de comida (13-15h) y cena (19-21h); resto del día con tráfico bajo.
HOURS_WEIGHTED = (
    [(h, 1) for h in range(0, 10)]
    + [(h, 4) for h in (10, 11, 12)]
    + [(h, 9) for h in (13, 14, 15)]
    + [(h, 3) for h in (16, 17, 18)]
    + [(h, 8) for h in (19, 20, 21)]
    + [(h, 2) for h in (22, 23)]
)


def weighted_choice(pairs):
    options, weights = zip(*pairs)
    return random.choices(options, weights=weights, k=1)[0]


def seed(catalogue, days, base_daily_views):
    now = datetime.now(timezone.utc)
    events = []
    for day_offset in range(days, -1, -1):
        day = (now - timedelta(days=day_offset)).replace(hour=0, minute=0, second=0, microsecond=0)
        weekend_boost = 1.4 if day.weekday() in (4, 5) else 1.0
        trend = 1 + (days - day_offset) / days * 0.6 if days else 1.0
        daily_views = max(1, round(random.gauss(base_daily_views * weekend_boost * trend, base_daily_views * 0.2)))

        for _ in range(daily_views):
            hour = weighted_choice(HOURS_WEIGHTED)
            occurred_at = day + timedelta(hours=hour, minutes=random.randint(0, 59), seconds=random.randint(0, 59))
            visitor_hash = uuid.uuid4().hex
            session_hash = uuid.uuid4().hex
            source = weighted_choice(SOURCES_WEIGHTED)
            device = weighted_choice(DEVICES_WEIGHTED)

            events.append(AnalyticsEvent(
                catalogue_id=catalogue.id, event_type="menu_view", occurred_at=occurred_at,
                visitor_hash=visitor_hash, session_hash=session_hash, target_type=None, target_key=None,
                source=source, device_type=device, dedup_key=uuid.uuid4().hex,
            ))

            if catalogue.products and random.random() < 0.55:
                sample_size = min(len(catalogue.products), random.randint(1, 3))
                for product in random.sample(catalogue.products, k=sample_size):
                    events.append(AnalyticsEvent(
                        catalogue_id=catalogue.id, event_type="product_view",
                        occurred_at=occurred_at + timedelta(seconds=random.randint(3, 90)),
                        visitor_hash=visitor_hash, session_hash=session_hash,
                        target_type="product", target_key=tracking_key(catalogue.id, "product", product.id),
                        source=source, device_type=device, dedup_key=uuid.uuid4().hex,
                    ))

            visible_categories = [c for c in catalogue.categories if c.is_visible]
            if visible_categories and random.random() < 0.35:
                category = random.choice(visible_categories)
                events.append(AnalyticsEvent(
                    catalogue_id=catalogue.id, event_type="category_select",
                    occurred_at=occurred_at + timedelta(seconds=random.randint(1, 20)),
                    visitor_hash=visitor_hash, session_hash=session_hash,
                    target_type="category", target_key=tracking_key(catalogue.id, "category", category.id),
                    source=source, device_type=device, dedup_key=uuid.uuid4().hex,
                ))

    db.session.add_all(events)
    db.session.commit()
    return len(events)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--slug", required=True, help="public_slug del catálogo de demostración a poblar")
    parser.add_argument("--days", type=int, default=30, help="cuántos días hacia atrás sembrar (default: 30)")
    parser.add_argument("--daily-views", type=int, default=18, help="promedio de vistas por día antes de tendencia/fin de semana (default: 18)")
    parser.add_argument("--wipe", action="store_true", help="borra los eventos previos de este catálogo antes de sembrar")
    parser.add_argument("--seed", type=int, default=None, help="semilla aleatoria, para resultados reproducibles")
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    app = create_app()
    with app.app_context():
        catalogue = Catalogue.query.filter_by(public_slug=args.slug).first()
        if not catalogue:
            raise SystemExit(f"No existe un catálogo con public_slug={args.slug!r}")

        if args.wipe:
            deleted = AnalyticsEvent.query.filter_by(catalogue_id=catalogue.id).delete()
            db.session.commit()
            print(f"Borrados {deleted} eventos previos de {args.slug!r}.")

        total = seed(catalogue, args.days, args.daily_views)
        print(f"Insertados {total} eventos de analíticas para {args.slug!r} (últimos {args.days} días).")


if __name__ == "__main__":
    main()
