import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import current_app
from sqlalchemy import Date, Integer, cast, distinct, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.db import db
from app.modules.analytics.model import AnalyticsEvent
from app.modules.analytics.security import protected_value, secure_equal, tracking_key
from app.modules.catalogue.model import Catalogue
from app.modules.catalogue.services import catalogue_access


EVENT_TYPES = {"menu_view", "product_view", "category_select"}
TARGET_BY_EVENT = {"menu_view": None, "product_view": "product", "category_select": "category"}
SOURCES = ("qr", "copied_link", "social", "referral", "direct", "unknown")
DEVICES = ("mobile", "tablet", "desktop", "unknown")
SOURCE_LABELS = {"qr": "Código QR", "copied_link": "Enlace copiado", "social": "Redes sociales", "referral": "Sitio de referencia", "direct": "Acceso directo", "unknown": "Desconocido"}
DEVICE_LABELS = {"mobile": "Celular", "tablet": "Tablet", "desktop": "Computadora", "unknown": "Desconocido"}
EVENT_FIELDS = {"type", "visitor_id", "session_id", "occurred_at", "source", "device_type", "target_type", "target_key"}
ANONYMOUS_ID = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
TRACKING_KEY = re.compile(r"^[0-9a-f]{64}$")
MAX_EVENTS = 20
MAX_RANGE_DAYS = 90


class AnalyticsValidationError(ValueError):
    pass


def _parse_occurred_at(value):
    if not isinstance(value, str) or len(value) > 35:
        raise AnalyticsValidationError("occurred_at no es válido")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise AnalyticsValidationError("occurred_at no es válido") from error
    if parsed.tzinfo is None:
        raise AnalyticsValidationError("occurred_at debe incluir zona horaria")
    parsed = parsed.astimezone(timezone.utc)
    now = datetime.now(timezone.utc)
    if parsed > now + timedelta(minutes=5) or parsed < now - timedelta(days=7):
        raise AnalyticsValidationError("occurred_at está fuera del rango permitido")
    return parsed


def _target_for_event(catalogue, event_type, target_type, supplied_key):
    expected_type = TARGET_BY_EVENT[event_type]
    if expected_type is None:
        if target_type is not None or supplied_key is not None:
            raise AnalyticsValidationError("menu_view no acepta un objetivo")
        return None, None
    if target_type != expected_type or not isinstance(supplied_key, str) or not TRACKING_KEY.fullmatch(supplied_key):
        raise AnalyticsValidationError("El objetivo del evento no es válido")
    entities = catalogue.products if expected_type == "product" else [item for item in catalogue.categories if item.is_visible]
    valid_key = next((tracking_key(catalogue.id, expected_type, entity.id) for entity in entities if secure_equal(tracking_key(catalogue.id, expected_type, entity.id), supplied_key)), None)
    if not valid_key:
        raise AnalyticsValidationError("El objetivo no pertenece a este menú")
    return expected_type, valid_key


def _validated_event(catalogue, raw):
    if not isinstance(raw, dict) or set(raw) != EVENT_FIELDS:
        raise AnalyticsValidationError("Cada evento debe contener únicamente los campos permitidos")
    event_type = raw.get("type")
    if event_type not in EVENT_TYPES:
        raise AnalyticsValidationError("El tipo de evento no está permitido")
    visitor_id = raw.get("visitor_id")
    session_id = raw.get("session_id")
    if not isinstance(visitor_id, str) or not ANONYMOUS_ID.fullmatch(visitor_id):
        raise AnalyticsValidationError("visitor_id no es válido")
    if not isinstance(session_id, str) or not ANONYMOUS_ID.fullmatch(session_id):
        raise AnalyticsValidationError("session_id no es válido")
    source = raw.get("source")
    device = raw.get("device_type")
    if source not in SOURCES or device not in DEVICES:
        raise AnalyticsValidationError("La fuente o dispositivo no es válido")
    occurred_at = _parse_occurred_at(raw.get("occurred_at"))
    target_type, target_key = _target_for_event(catalogue, event_type, raw.get("target_type"), raw.get("target_key"))
    visitor_hash = protected_value("visitor", visitor_id)
    session_hash = protected_value("session", session_id)
    dedup_context = f"{catalogue.id}:{session_hash}:{event_type}:{target_key or '-'}"
    if event_type == "category_select":
        dedup_context += f":{int(occurred_at.timestamp() // 2)}"
    return {
        "catalogue_id": catalogue.id,
        "event_type": event_type,
        "occurred_at": occurred_at,
        "visitor_hash": visitor_hash,
        "session_hash": session_hash,
        "target_type": target_type,
        "target_key": target_key,
        "source": source,
        "device_type": device,
        "dedup_key": protected_value("dedup", dedup_context),
    }


def record_events(public_slug, payload):
    if not isinstance(payload, dict) or set(payload) != {"events"} or not isinstance(payload.get("events"), list):
        return {"message": "Debes enviar únicamente una lista de eventos"}, 400
    if not payload["events"] or len(payload["events"]) > MAX_EVENTS:
        return {"message": f"El lote debe contener entre 1 y {MAX_EVENTS} eventos"}, 400
    try:
        catalogue = Catalogue.query.filter_by(public_slug=public_slug, is_published=True).first()
        if not catalogue:
            return {"message": "Este menú no está disponible"}, 404
        values = [_validated_event(catalogue, raw) for raw in payload["events"]]
        unique_values = {item["dedup_key"]: item for item in values}
        dialect = db.session.get_bind().dialect.name
        if dialect == "postgresql":
            from sqlalchemy.dialects.postgresql import insert
            statement = insert(AnalyticsEvent).values(list(unique_values.values())).on_conflict_do_nothing(index_elements=["dedup_key"])
        elif dialect == "sqlite":
            from sqlalchemy.dialects.sqlite import insert
            statement = insert(AnalyticsEvent).values(list(unique_values.values())).on_conflict_do_nothing(index_elements=["dedup_key"])
        else:
            existing = set(db.session.query(AnalyticsEvent.dedup_key).filter(AnalyticsEvent.dedup_key.in_(unique_values)).scalars())
            db.session.add_all(AnalyticsEvent(**item) for key, item in unique_values.items() if key not in existing)
            statement = None
        if statement is not None:
            db.session.execute(statement)
        db.session.commit()
        return None, 204
    except AnalyticsValidationError as error:
        db.session.rollback()
        return {"message": str(error)}, 400
    except IntegrityError:
        db.session.rollback()
        return None, 204
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": "No fue posible registrar los eventos"}, 500


def _parse_period(args):
    timezone_name = args.get("timezone", "America/Mexico_City")
    if timezone_name == "UTC":
        zone = timezone.utc
    else:
        try:
            zone = ZoneInfo(timezone_name)
        except (ZoneInfoNotFoundError, ValueError):
            if timezone_name == "America/Mexico_City":
                zone = timezone(timedelta(hours=-6), name=timezone_name)
            else:
                raise AnalyticsValidationError("La zona horaria no es válida")
    today = datetime.now(zone).date()
    try:
        start_date = date.fromisoformat(args.get("from", (today - timedelta(days=6)).isoformat()))
        end_date = date.fromisoformat(args.get("to", today.isoformat()))
    except (TypeError, ValueError) as error:
        raise AnalyticsValidationError("Las fechas no son válidas") from error
    if start_date > end_date:
        raise AnalyticsValidationError("La fecha inicial no puede ser posterior a la final")
    days = (end_date - start_date).days + 1
    if days > MAX_RANGE_DAYS:
        raise AnalyticsValidationError(f"El rango máximo es de {MAX_RANGE_DAYS} días")
    start_utc = datetime.combine(start_date, time.min, zone).astimezone(timezone.utc)
    end_utc = datetime.combine(end_date + timedelta(days=1), time.min, zone).astimezone(timezone.utc)
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)
    previous_start_utc = datetime.combine(previous_start, time.min, zone).astimezone(timezone.utc)
    return zone, timezone_name, start_date, end_date, start_utc, end_utc, previous_start, previous_end, previous_start_utc


def _percentage_change(value, previous):
    if previous == 0:
        return {"percentage_change": 0.0, "change_status": "unchanged"} if value == 0 else {"percentage_change": None, "change_status": "new"}
    change = round(((value - previous) / previous) * 100, 1)
    return {"percentage_change": change, "change_status": "increased" if change > 0 else "decreased" if change < 0 else "unchanged"}


def _count_summary(catalogue_id, start, end):
    base = AnalyticsEvent.query.filter(AnalyticsEvent.catalogue_id == catalogue_id, AnalyticsEvent.occurred_at >= start, AnalyticsEvent.occurred_at < end)
    views = base.filter(AnalyticsEvent.event_type == "menu_view").count()
    visitors = base.with_entities(func.count(distinct(AnalyticsEvent.visitor_hash))).filter(AnalyticsEvent.event_type == "menu_view").scalar() or 0
    products = base.filter(AnalyticsEvent.event_type == "product_view").count()
    return {"menu_views": views, "approximate_unique_visitors": visitors, "product_interactions": products}


def _date_hour_expressions(timezone_name):
    if db.session.get_bind().dialect.name == "postgresql":
        local = func.timezone(timezone_name, AnalyticsEvent.occurred_at)
        return cast(local, Date), cast(func.extract("hour", local), Integer)
    return func.date(AnalyticsEvent.occurred_at), cast(func.strftime("%H", AnalyticsEvent.occurred_at), Integer)


def _breakdown(catalogue_id, start, end, column, keys, labels):
    rows = db.session.query(column, func.count(AnalyticsEvent.id)).filter(
        AnalyticsEvent.catalogue_id == catalogue_id,
        AnalyticsEvent.event_type == "menu_view",
        AnalyticsEvent.occurred_at >= start,
        AnalyticsEvent.occurred_at < end,
    ).group_by(column).all()
    counts = {key: count for key, count in rows}
    total = sum(counts.values())
    return [{"key": key, "label": labels[key], "views": counts.get(key, 0), "percentage": round(counts.get(key, 0) * 100 / total, 1) if total else 0.0} for key in keys]


def _top_targets(catalogue, start, end, target_type):
    rows = db.session.query(AnalyticsEvent.target_key, func.count(AnalyticsEvent.id).label("total")).filter(
        AnalyticsEvent.catalogue_id == catalogue.id,
        AnalyticsEvent.target_type == target_type,
        AnalyticsEvent.occurred_at >= start,
        AnalyticsEvent.occurred_at < end,
    ).group_by(AnalyticsEvent.target_key).order_by(func.count(AnalyticsEvent.id).desc()).limit(10).all()
    if target_type == "product":
        entities = {tracking_key(catalogue.id, "product", product.id): product for product in catalogue.products}
        return [{"name": entities[key].name if key in entities else "Producto eliminado", "category_name": entities[key].category.name if key in entities and entities[key].category else "Sin categoría", "interactions": total, "is_available": entities[key].is_available if key in entities else False} for key, total in rows]
    entities = {tracking_key(catalogue.id, "category", category.id): category for category in catalogue.categories}
    total_selections = sum(total for _, total in rows)
    return [{"name": entities[key].name if key in entities else "Categoría eliminada", "selections": total, "percentage": round(total * 100 / total_selections, 1) if total_selections else 0.0} for key, total in rows]


def get_analytics(owner_id, business_id, catalogue_id, args):
    try:
        catalogue, error = catalogue_access(owner_id, business_id, catalogue_id)
        if error:
            return error
        zone, timezone_name, start_date, end_date, start_utc, end_utc, previous_start, previous_end, previous_start_utc = _parse_period(args)
        current = _count_summary(catalogue.id, start_utc, end_utc)
        previous = _count_summary(catalogue.id, previous_start_utc, start_utc)
        summary = {key: {"value": current[key], "previous_value": previous[key], **_percentage_change(current[key], previous[key])} for key in current}
        date_expr, hour_expr = _date_hour_expressions(timezone_name)
        daily_rows = db.session.query(date_expr.label("day"), func.count(AnalyticsEvent.id), func.count(distinct(AnalyticsEvent.visitor_hash))).filter(
            AnalyticsEvent.catalogue_id == catalogue.id, AnalyticsEvent.event_type == "menu_view", AnalyticsEvent.occurred_at >= start_utc, AnalyticsEvent.occurred_at < end_utc,
        ).group_by(date_expr).all()
        daily = {str(day): (views, visitors) for day, views, visitors in daily_rows}
        visits = []
        cursor = start_date
        while cursor <= end_date:
            views, visitors = daily.get(cursor.isoformat(), (0, 0))
            visits.append({"date": cursor.isoformat(), "views": views, "approximate_unique_visitors": visitors})
            cursor += timedelta(days=1)
        hour_rows = db.session.query(hour_expr.label("hour"), func.count(AnalyticsEvent.id)).filter(
            AnalyticsEvent.catalogue_id == catalogue.id, AnalyticsEvent.event_type == "menu_view", AnalyticsEvent.occurred_at >= start_utc, AnalyticsEvent.occurred_at < end_utc,
        ).group_by(hour_expr).order_by(func.count(AnalyticsEvent.id).desc()).all()
        top_products = _top_targets(catalogue, start_utc, end_utc, "product")
        top_categories = _top_targets(catalogue, start_utc, end_utc, "category")
        busiest_day = max(visits, key=lambda item: item["views"]) if any(item["views"] for item in visits) else None
        if hour_rows:
            hour = hour_rows[0][0]
            suffix = "a. m." if hour < 12 else "p. m."
            display_hour = hour % 12 or 12
            busiest_hour = {"hour": hour, "label": f"{display_hour}:00 {suffix}", "views": hour_rows[0][1]}
        else:
            busiest_hour = None
        summary.update({"top_product": top_products[0] if top_products else None, "busiest_day": busiest_day, "busiest_hour": busiest_hour})
        return {
            "period": {"from": start_date.isoformat(), "to": end_date.isoformat(), "timezone": timezone_name},
            "comparison_period": {"from": previous_start.isoformat(), "to": previous_end.isoformat()},
            "summary": summary,
            "visits_over_time": visits,
            "top_products": top_products,
            "top_categories": top_categories,
            "devices": _breakdown(catalogue.id, start_utc, end_utc, AnalyticsEvent.device_type, DEVICES, DEVICE_LABELS),
            "sources": _breakdown(catalogue.id, start_utc, end_utc, AnalyticsEvent.source, SOURCES, SOURCE_LABELS),
        }, 200
    except AnalyticsValidationError as error:
        return {"message": str(error)}, 400
    except SQLAlchemyError as error:
        current_app.logger.exception(error)
        return {"message": "No fue posible consultar las analíticas"}, 500
