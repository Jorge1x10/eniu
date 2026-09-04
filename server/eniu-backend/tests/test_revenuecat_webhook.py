import json
import unittest
from datetime import datetime, timedelta, timezone

from app import create_app
from app.database.db import db

from app.modules.billing.model import BillingSubscription, RevenueCatWebhookEvent
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.users.model import User


WEBHOOK_SECRET = "revenuecat-webhook-secret-placeholder"


def _ms(delta):
    return int((datetime.now(timezone.utc) + delta).timestamp() * 1000)


class RevenueCatWebhookTestCase(unittest.TestCase):
    """Compras dentro de la app: el webhook escribe la misma fila que Stripe.

    Lo que se comprueba aquí no es "RevenueCat funciona", sino que una compra en
    la tienda concede exactamente el mismo plan que un pago por web, y que
    perderla tiene las mismas consecuencias.
    """

    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "revenuecat-jwt-secret-at-least-32-bytes",
            "REVENUECAT_WEBHOOK_AUTH": WEBHOOK_SECRET,
            "REVENUECAT_ALLOW_SANDBOX": False,
            "FRONTEND_URL": "http://frontend.test",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()
            user = User(email="owner@example.com", username="owner")
            db.session.add(user)
            db.session.commit()
            self.user_id = str(user.id)
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def post(self, event, authorization=WEBHOOK_SECRET):
        return self.client.post(
            "/api/billing/revenuecat/webhook",
            data=json.dumps({"api_version": "1.0", "event": event}),
            headers={"Authorization": authorization, "Content-Type": "application/json"},
        )

    def purchase_event(self, **overrides):
        event = {
            "id": "evt_initial_purchase",
            "type": "INITIAL_PURCHASE",
            "app_user_id": self.user_id,
            "product_id": "eniu_essential_monthly",
            "entitlement_ids": ["essential"],
            "period_type": "NORMAL",
            "store": "APP_STORE",
            "environment": "PRODUCTION",
            "expiration_at_ms": _ms(timedelta(days=30)),
        }
        event.update(overrides)
        return event

    def record(self):
        return BillingSubscription.query.one()

    def test_purchase_grants_the_same_plan_that_stripe_would(self):
        response = self.post(self.purchase_event())

        self.assertEqual(response.status_code, 200)
        with self.app.app_context():
            record = self.record()
            self.assertEqual(record.plan_key, "essential")
            self.assertEqual(record.status, "active")
            self.assertEqual(record.provider, "app_store")
            self.assertTrue(record.is_store_managed)
            self.assertEqual(record.store_product_id, "eniu_essential_monthly")
            self.assertEqual(record.revenuecat_app_user_id, self.user_id)
            # Lo que de verdad importa: el resto del backend ya lo ve como de pago.
            plan = User.query.one().to_dict()["plan"]
            self.assertEqual(plan["name"], "Plan Esencial")
            self.assertTrue(plan["has_access"])
            self.assertEqual(plan["provider"], "app_store")

    def test_trial_counts_as_access(self):
        self.post(self.purchase_event(period_type="TRIAL"))
        with self.app.app_context():
            record = self.record()
            self.assertEqual(record.status, "trialing")
            self.assertTrue(record.has_access)

    def test_repeated_delivery_is_ignored(self):
        first = self.post(self.purchase_event())
        second = self.post(self.purchase_event())

        self.assertEqual(first.status_code, 200)
        self.assertTrue(second.get_json()["duplicate"])
        with self.app.app_context():
            self.assertEqual(RevenueCatWebhookEvent.query.count(), 1)

    def test_expiration_downgrades_and_unpublishes_menus(self):
        self.post(self.purchase_event())
        with self.app.app_context():
            user = User.query.one()
            business = Business(owner_id=user.id, name="Café Aurora")
            db.session.add(business)
            db.session.flush()
            db.session.add(Catalogue(business_id=business.id, name="Carta", is_published=True))
            db.session.commit()

        response = self.post(self.purchase_event(
            id="evt_expiration", type="EXPIRATION", expiration_at_ms=_ms(timedelta(seconds=-1)),
        ))

        self.assertEqual(response.status_code, 200)
        with self.app.app_context():
            record = self.record()
            self.assertEqual(record.status, "canceled")
            self.assertFalse(record.has_access)
            # Perder el acceso hace lo mismo que con Stripe: despublicar.
            self.assertFalse(Catalogue.query.one().is_published)

    def test_cancellation_keeps_access_until_the_period_ends(self):
        self.post(self.purchase_event())
        response = self.post(self.purchase_event(
            id="evt_cancellation", type="CANCELLATION", expiration_at_ms=_ms(timedelta(days=12)),
        ))

        self.assertEqual(response.status_code, 200)
        with self.app.app_context():
            record = self.record()
            # Cancelar apaga la renovación, no el acceso ya pagado.
            self.assertTrue(record.cancel_at_period_end)
            self.assertEqual(record.status, "active")
            self.assertTrue(record.has_access)

    def test_refund_cuts_access_immediately(self):
        self.post(self.purchase_event())
        self.post(self.purchase_event(
            id="evt_refund", type="CANCELLATION", expiration_at_ms=_ms(timedelta(seconds=-1)),
        ))

        with self.app.app_context():
            self.assertFalse(self.record().has_access)

    def test_billing_issue_does_not_destroy_anything_yet(self):
        self.post(self.purchase_event())
        with self.app.app_context():
            user = User.query.one()
            business = Business(owner_id=user.id, name="Café Aurora")
            db.session.add(business)
            db.session.flush()
            db.session.add(Catalogue(business_id=business.id, name="Carta", is_published=True))
            db.session.commit()

        self.post(self.purchase_event(id="evt_billing_issue", type="BILLING_ISSUE"))

        with self.app.app_context():
            record = self.record()
            self.assertEqual(record.status, "past_due")
            # La tienda sigue reintentando el cobro: despublicar aquí sería
            # destructivo con alguien cuya tarjeta se recupera en dos días.
            self.assertTrue(Catalogue.query.one().is_published)

    def test_unmapped_entitlement_grants_nothing(self):
        response = self.post(self.purchase_event(entitlement_ids=["algo_que_no_existe"]))

        self.assertEqual(response.get_json()["outcome"], "unmapped_entitlement")
        with self.app.app_context():
            self.assertFalse(BillingSubscription.query.one().has_access)

    def test_sandbox_events_are_ignored_in_production(self):
        response = self.post(self.purchase_event(environment="SANDBOX"))

        self.assertEqual(response.get_json()["ignored"], "sandbox")
        with self.app.app_context():
            # Sin esto, una cuenta de prueba de Apple regalaría el plan de pago.
            self.assertEqual(BillingSubscription.query.count(), 0)

    def test_sandbox_events_apply_when_they_are_allowed(self):
        self.app.config["REVENUECAT_ALLOW_SANDBOX"] = True
        try:
            self.post(self.purchase_event(environment="SANDBOX"))
            with self.app.app_context():
                self.assertTrue(self.record().has_access)
        finally:
            self.app.config["REVENUECAT_ALLOW_SANDBOX"] = False

    def test_unknown_user_is_acknowledged_instead_of_retried_forever(self):
        response = self.post(self.purchase_event(app_user_id="7f1c1e4e-0000-4000-8000-000000000000"))

        # 200 a propósito: RevenueCat reintenta cualquier cosa que no sea 2xx, y
        # ese identificador no va a existir por reintentar.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["ignored"], "unknown_user")

    def test_test_event_from_the_dashboard_touches_nothing(self):
        response = self.post({"id": "evt_test", "type": "TEST", "app_user_id": self.user_id})

        self.assertEqual(response.get_json()["ignored"], "test")
        with self.app.app_context():
            self.assertEqual(BillingSubscription.query.count(), 0)

    def test_wrong_or_missing_secret_is_rejected(self):
        self.assertEqual(self.post(self.purchase_event(), authorization="").status_code, 401)
        self.assertEqual(self.post(self.purchase_event(), authorization="otro-secreto").status_code, 401)
        with self.app.app_context():
            self.assertEqual(BillingSubscription.query.count(), 0)

    def test_malformed_body_is_rejected(self):
        response = self.client.post(
            "/api/billing/revenuecat/webhook",
            data=b"no soy json",
            headers={"Authorization": WEBHOOK_SECRET},
        )
        self.assertEqual(response.status_code, 400)

    def test_endpoint_is_disabled_when_the_secret_is_not_configured(self):
        self.app.config["REVENUECAT_WEBHOOK_AUTH"] = None
        try:
            self.assertEqual(self.post(self.purchase_event()).status_code, 503)
        finally:
            self.app.config["REVENUECAT_WEBHOOK_AUTH"] = WEBHOOK_SECRET


class StoreSubscriptionDeletionTestCase(unittest.TestCase):
    """Borrar la cuenta con una suscripción de tienda activa.

    Apple exige poder borrar la cuenta desde la app, así que el borrado no se
    bloquea; pero como Eniu no puede cancelar el cobro, hay que avisarlo.
    """

    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "revenuecat-jwt-secret-at-least-32-bytes",
            "FRONTEND_URL": "http://frontend.test",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_deletion_warns_that_the_store_keeps_charging(self):
        from app.modules.billing.services import store_subscription_needs_manual_cancel

        with self.app.app_context():
            user = User(email="store@example.com", username="store")
            db.session.add(user)
            db.session.flush()
            db.session.add(BillingSubscription(
                user_id=user.id, provider="app_store", plan_key="essential", status="active",
            ))
            db.session.commit()
            self.assertTrue(store_subscription_needs_manual_cancel(user))

    def test_a_stripe_subscription_is_not_flagged_for_manual_cancel(self):
        from app.modules.billing.services import store_subscription_needs_manual_cancel

        with self.app.app_context():
            user = User(email="web@example.com", username="web")
            db.session.add(user)
            db.session.flush()
            db.session.add(BillingSubscription(
                user_id=user.id, provider="stripe", stripe_subscription_id="sub_x",
                plan_key="essential", status="active",
            ))
            db.session.commit()
            self.assertFalse(store_subscription_needs_manual_cancel(user))


if __name__ == "__main__":
    unittest.main()
