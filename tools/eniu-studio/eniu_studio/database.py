"""Operaciones que no tiene la API y van directo a la base de datos.

Sólo hay tres: crear la cuenta demo local, darle un plan sin pasar por Stripe
o la tienda, y escribir/borrar eventos de analíticas con fecha pasada (la API
pública sólo acepta eventos de los últimos 7 días, a propósito).
"""

import uuid

from .traffic import SEED_PREFIX


def create_schema(app):
    from app.database.db import db

    with app.app_context():
        db.create_all()


def check_connection(app):
    """Falla pronto, con un mensaje legible, si la base no responde."""
    from sqlalchemy.exc import OperationalError

    from app.database.db import db

    with app.app_context():
        try:
            db.session.execute(db.text("SELECT 1"))
        except OperationalError as error:
            reason = str(error.orig or error).strip().splitlines()[0]
            raise SystemExit(f"No me pude conectar a la base de datos de DATABASE_URL: {reason}") from None


def ensure_user(app, email, password, phone):
    """Crea la cuenta (con la misma lógica que /auth/register) si no existe."""
    from app.modules.auth.services import register_user
    from app.modules.users.model import User

    with app.app_context(), app.test_request_context():
        user = User.query.filter_by(email=email.lower()).first()
        if user:
            return user.to_dict(), False
        user, error = register_user({"email": email, "phone": phone, "password": password})
        if error:
            raise SystemExit(f"No se pudo crear la cuenta demo: {error.get('message')}")
        return user.to_dict(), True


def set_plan(app, email, plan_key, status="active"):
    """Plan de la cuenta sin cobro de por medio (sólo para cuentas demo).

    Bajar al gratuito deja la cuenta igual que una cancelación de verdad
    (`apply_free_plan_state`): un solo negocio activo, un menú publicado y la
    plantilla sin funciones de pago. Subir de plan no reactiva nada, como en
    la app; `demo apply` vuelve a publicar y a aplicar la plantilla.
    """
    from app.database.db import db
    from app.modules.billing import plans
    from app.modules.billing.model import BillingSubscription
    from app.modules.billing.services import apply_free_plan_state
    from app.modules.users.model import User

    if plan_key not in plans.PLANS:
        raise SystemExit(f"Plan desconocido: {plan_key}. Opciones: {', '.join(plans.PLANS)}")
    with app.app_context():
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            raise SystemExit(f"No existe la cuenta {email}")
        subscription = user.billing_subscription or BillingSubscription(user_id=user.id)
        subscription.plan_key = plan_key
        subscription.status = status if plan_key != plans.FREE else "inactive"
        db.session.add(subscription)
        if plan_key == plans.FREE:
            apply_free_plan_state(user)
        db.session.commit()
        return user.to_dict()["plan"]


def write_events(app, catalogue_id, events, replace="seeded", chunk=2000):
    """Inserta eventos de analíticas. `replace`: "seeded" borra antes sólo lo
    sembrado por el estudio, "all" borra todos los eventos del menú, None no borra."""
    from sqlalchemy import insert

    from app.database.db import db
    from app.modules.analytics.model import AnalyticsEvent

    catalogue_uuid = uuid.UUID(str(catalogue_id))
    rows = [{**event, "catalogue_id": catalogue_uuid} for event in events]
    with app.app_context():
        deleted = _delete(AnalyticsEvent, catalogue_uuid, replace) if replace else 0
        for start in range(0, len(rows), chunk):
            db.session.execute(insert(AnalyticsEvent), rows[start : start + chunk])
        db.session.commit()
    return deleted, len(rows)


def clear_events(app, catalogue_id, everything=False):
    from app.database.db import db
    from app.modules.analytics.model import AnalyticsEvent

    with app.app_context():
        deleted = _delete(AnalyticsEvent, uuid.UUID(str(catalogue_id)), "all" if everything else "seeded")
        db.session.commit()
    return deleted


def dialect(app):
    from app.database.db import db

    with app.app_context():
        return db.engine.dialect.name


def catalogue_exists(app, catalogue_id):
    from app.modules.catalogue.model import Catalogue

    with app.app_context():
        return Catalogue.query.filter(Catalogue.id == uuid.UUID(str(catalogue_id))).first() is not None


def count_events(app, catalogue_id):
    from app.modules.analytics.model import AnalyticsEvent

    with app.app_context():
        base = AnalyticsEvent.query.filter(AnalyticsEvent.catalogue_id == uuid.UUID(str(catalogue_id)))
        total = base.count()
        seeded = base.filter(AnalyticsEvent.dedup_key.like(f"{SEED_PREFIX}%")).count()
    return {"total": total, "seeded": seeded, "real": total - seeded}


def _delete(model, catalogue_uuid, scope):
    query = model.query.filter(model.catalogue_id == catalogue_uuid)
    if scope == "seeded":
        query = query.filter(model.dedup_key.like(f"{SEED_PREFIX}%"))
    return query.delete(synchronize_session=False)
