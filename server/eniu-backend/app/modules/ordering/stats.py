"""Estadísticas de pedidos: lo más pedido, cuánto se vendió y a qué horas.

Sólo cuenta lo que el negocio **aceptó** (`ACCEPTED_STATUSES`) y, de eso, los
productos que no quitó: la misma regla que la cuenta de la mesa. Un pedido
rechazado o un producto cancelado no son ventas.

Las fechas y las horas son las del negocio (`Business.timezone`), no las del
servidor ni las del navegador: "el martes a las 14:00" es en el restaurante.

El periodo se agrupa en Python y no en SQL: así la conversión de zona horaria
es la misma en PostgreSQL y en SQLite (las pruebas), y el volumen de un
negocio en 90 días cabe de sobra en memoria.
"""
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import current_app
from sqlalchemy.exc import SQLAlchemyError

from app.database.db import db
from app.modules.billing.guards import _blocked, limits_for_owner
from app.modules.catalogue.services import _business_access
from app.modules.products.model import Product
from app.shared.i18n import _

from .model import ACCEPTED_STATUSES, Order, OrderItem, TableAccount

MAX_RANGE_DAYS = 90
# El plan gratuito ve los últimos 7 días, como el resumen de visitas.
SUMMARY_DAYS = 7
TOP_PRODUCTS = 10


class StatsError(Exception):
    pass


def _money(value):
    return format(Decimal(value or 0).quantize(Decimal("0.01")), ".2f")


def _zone(business):
    try:
        return ZoneInfo(business.timezone or "UTC")
    except (ZoneInfoNotFoundError, ValueError):
        return timezone.utc


def _aware(value):
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _period(args, today):
    try:
        start = date.fromisoformat(args.get("from") or (today - timedelta(days=SUMMARY_DAYS - 1)).isoformat())
        end = date.fromisoformat(args.get("to") or today.isoformat())
    except (TypeError, ValueError) as error:
        raise StatsError(_("Las fechas no son válidas")) from error
    if start > end:
        raise StatsError(_("La fecha inicial no puede ser posterior a la final"))
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        raise StatsError(_("El rango máximo es de {days} días", days=MAX_RANGE_DAYS))
    return start, end


def _change(value, previous):
    if previous == 0:
        return None if value else 0.0
    return round(float((value - previous) * 100 / previous), 1)


def _accepted_items(business_id, start_utc, end_utc):
    """(pedido, fecha del pedido, producto, nombre, cantidad, precio) de lo vendido."""
    return (
        db.session.query(
            Order.id, Order.created_at, OrderItem.product_id, OrderItem.name,
            OrderItem.quantity, OrderItem.unit_price,
        )
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(TableAccount, TableAccount.id == Order.account_id)
        .filter(
            TableAccount.business_id == business_id,
            Order.status.in_(ACCEPTED_STATUSES),
            OrderItem.is_cancelled.is_(False),
            Order.created_at >= start_utc,
            Order.created_at < end_utc,
        )
        .all()
    )


def _totals(rows):
    orders = {row[0] for row in rows}
    revenue = sum((row[5] * row[4] for row in rows), Decimal("0"))
    return len(orders), sum(row[4] for row in rows), revenue


def order_stats(owner_id, business_id, args):
    try:
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        limits = limits_for_owner(owner_id)
        if limits["allow_analytics"]:
            scope = "full"
        elif limits["analytics_summary"]:
            scope = "summary"
        else:
            return _blocked(_("Tu plan actual no incluye analíticas."))

        zone = _zone(business)
        today = datetime.now(zone).date()
        start, end = _period(args, today)
        if scope == "summary" and start < today - timedelta(days=SUMMARY_DAYS - 1):
            return _blocked(_("Tu plan incluye las estadísticas de los últimos {days} días.", days=SUMMARY_DAYS))

        days = (end - start).days + 1
        start_utc = datetime.combine(start, time.min, zone).astimezone(timezone.utc)
        end_utc = datetime.combine(end + timedelta(days=1), time.min, zone).astimezone(timezone.utc)
        previous_start_utc = datetime.combine(start - timedelta(days=days), time.min, zone).astimezone(timezone.utc)

        rows = _accepted_items(business.id, start_utc, end_utc)
        previous_rows = _accepted_items(business.id, previous_start_utc, start_utc)
        orders, units, revenue = _totals(rows)
        previous_orders, _previous_units, previous_revenue = _totals(previous_rows)

        # Lo más pedido: por producto vivo y, si se borró, por el nombre que
        # quedó copiado en el pedido.
        products = defaultdict(lambda: {"units": 0, "revenue": Decimal("0"), "orders": set(), "name": None})
        by_day = defaultdict(lambda: {"orders": set(), "revenue": Decimal("0")})
        by_hour = defaultdict(set)
        for order_id, created_at, product_id, name, quantity, unit_price in rows:
            key = product_id or f"name:{name}"
            entry = products[key]
            entry["units"] += quantity
            entry["revenue"] += unit_price * quantity
            entry["orders"].add(order_id)
            entry["name"] = entry["name"] or name
            local = _aware(created_at).astimezone(zone)
            by_day[local.date()]["orders"].add(order_id)
            by_day[local.date()]["revenue"] += unit_price * quantity
            by_hour[local.hour].add(order_id)

        live_names = {}
        product_ids = [key for key in products if not isinstance(key, str)]
        if product_ids:
            live_names = {product.id: product.name for product in Product.query.filter(Product.id.in_(product_ids))}
        ranked = sorted(products.items(), key=lambda item: (-item[1]["units"], -item[1]["revenue"], item[1]["name"]))
        top_products = [
            {
                "name": live_names.get(key, entry["name"]),
                "units": entry["units"],
                "revenue": _money(entry["revenue"]),
                "orders": len(entry["orders"]),
                "share": round(entry["units"] * 100 / units, 1) if units else 0.0,
            }
            for key, entry in ranked[:TOP_PRODUCTS]
        ]

        daily = []
        cursor = start
        while cursor <= end:
            entry = by_day.get(cursor)
            daily.append({
                "date": cursor.isoformat(),
                "orders": len(entry["orders"]) if entry else 0,
                "revenue": _money(entry["revenue"] if entry else 0),
            })
            cursor += timedelta(days=1)
        hourly = [{"hour": hour, "orders": len(by_hour.get(hour, ()))} for hour in range(24)]
        busiest = max(hourly, key=lambda item: item["orders"]) if orders else None

        return {
            "scope": scope,
            "period": {"from": start.isoformat(), "to": end.isoformat(), "timezone": str(zone)},
            "summary": {
                "orders": orders,
                "units": units,
                "revenue": _money(revenue),
                "average_order": _money(revenue / orders if orders else 0),
                "previous_orders": previous_orders,
                "previous_revenue": _money(previous_revenue),
                "orders_change": _change(orders, previous_orders),
                "revenue_change": _change(revenue, previous_revenue),
                "busiest_hour": busiest["hour"] if busiest else None,
            },
            "top_products": top_products,
            "by_day": daily,
            "by_hour": hourly,
        }, 200
    except StatsError as error:
        return {"message": str(error)}, 400
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": _("No fue posible cargar las estadísticas")}, 500
