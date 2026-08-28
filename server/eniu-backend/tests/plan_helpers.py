"""Alta de un plan de pago para las pruebas.

La mayoría de la suite ejercita funciones que el plan gratuito no incluye
(varios menús, plantillas de pago, analíticas). Estas pruebas activan una
suscripción para el dueño y así siguen probando lo suyo; los límites del plan
gratuito tienen sus propias pruebas en `test_plan_limits_api.py`.
"""
from app.database.db import db
from app.modules.billing.model import BillingSubscription
from app.modules.billing.plans import ESSENTIAL


def grant_plan(user_id, plan_key=ESSENTIAL, status="active"):
    record = BillingSubscription.query.filter_by(user_id=user_id).first()
    if not record:
        record = BillingSubscription(user_id=user_id)
        db.session.add(record)
    record.plan_key = plan_key
    record.status = status
    db.session.commit()
    return record
