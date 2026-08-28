import unittest
from types import SimpleNamespace
from unittest.mock import patch

from flask_jwt_extended import create_access_token

from app import create_app
from app.database.db import db
from stripe._stripe_object import StripeObject

from app.modules.billing.model import BillingSubscription, StripeWebhookEvent
from app.modules.users.model import User


class BillingApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "billing-jwt-secret-at-least-32-bytes",
            "STRIPE_API_KEY": "stripe-test-key-placeholder",
            "STRIPE_WEBHOOK_SECRET": "webhook-test-secret-placeholder",
            "STRIPE_API_VERSION": "2026-06-24.dahlia",
            "STRIPE_ESSENTIAL_LOOKUP_KEY": "eniu_essential_monthly",
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
            self.token = create_access_token(identity=self.user_id)
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_checkout_uses_server_price_and_subscription_mode(self):
        price = SimpleNamespace(
            id="price_essential",
            recurring=SimpleNamespace(interval="month"),
        )
        with patch("app.modules.billing.services.stripe.Customer.create", return_value=SimpleNamespace(id="cus_eniu")) as customer_create, patch(
            "app.modules.billing.services.stripe.Price.list",
            return_value=SimpleNamespace(data=[price]),
        ) as price_list, patch(
            "app.modules.billing.services.stripe.checkout.Session.create",
            return_value=SimpleNamespace(url="https://checkout.stripe.test/session"),
        ) as checkout_create:
            response = self.client.post("/api/billing/checkout", headers=self.headers, json={})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["url"], "https://checkout.stripe.test/session")
        customer_create.assert_called_once()
        price_list.assert_called_once_with(lookup_keys=["eniu_essential_monthly"], active=True, limit=1)
        payload = checkout_create.call_args.kwargs
        self.assertEqual(payload["mode"], "subscription")
        self.assertEqual(payload["line_items"], [{"price": "price_essential", "quantity": 1}])
        self.assertEqual(payload["subscription_data"]["billing_mode"], {"type": "flexible"})
        self.assertNotIn("payment_method_types", payload)
        self.assertRegex(payload["integration_identifier"], r"^eniu_checkout_[a-z]{8}$")
        # Sin esta bandera el cliente no tiene dónde escribir un código promocional.
        self.assertTrue(payload["allow_promotion_codes"])

        with self.app.app_context():
            record = BillingSubscription.query.one()
            self.assertEqual(record.stripe_customer_id, "cus_eniu")

    def test_active_subscription_cannot_create_duplicate_checkout(self):
        with self.app.app_context():
            user = User.query.one()
            db.session.add(BillingSubscription(
                user_id=user.id,
                stripe_customer_id="cus_existing",
                stripe_subscription_id="sub_existing",
                status="active",
            ))
            db.session.commit()
        response = self.client.post("/api/billing/checkout", headers=self.headers, json={})
        self.assertEqual(response.status_code, 409)

    def test_portal_is_scoped_to_current_users_customer(self):
        with self.app.app_context():
            user = User.query.one()
            db.session.add(BillingSubscription(user_id=user.id, stripe_customer_id="cus_owner", status="active"))
            db.session.commit()
        with patch(
            "app.modules.billing.services.stripe.billing_portal.Session.create",
            return_value=SimpleNamespace(url="https://billing.stripe.test/portal"),
        ) as portal_create:
            response = self.client.post("/api/billing/portal", headers=self.headers, json={})
        self.assertEqual(response.status_code, 201)
        portal_create.assert_called_once_with(customer="cus_owner", return_url="http://frontend.test/dashboard/settings")

    def test_signed_webhook_syncs_subscription_and_is_idempotent(self):
        event = {
            "id": "evt_subscription_updated",
            "type": "customer.subscription.updated",
            "data": {"object": {
                "id": "sub_essential",
                "customer": "cus_owner",
                "status": "active",
                "cancel_at_period_end": False,
                "current_period_end": 1893456000,
                "metadata": {"eniu_user_id": self.user_id, "plan_key": "essential"},
                "items": {"data": [{"price": {"id": "price_essential"}}]},
            }},
        }
        # Se simula con el tipo real del SDK, no con un diccionario: `StripeObject`
        # no tiene `.get()`, y con un diccionario esta prueba pasaba mientras
        # producción respondía 500 en cada entrega.
        with patch("app.modules.billing.services.stripe.Webhook.construct_event", return_value=StripeObject.construct_from(event, "sk_test")) as verify:
            first = self.client.post("/api/billing/webhook", data=b"signed-body", headers={"Stripe-Signature": "signed"})
            second = self.client.post("/api/billing/webhook", data=b"signed-body", headers={"Stripe-Signature": "signed"})
        self.assertEqual(first.status_code, 200)
        self.assertTrue(second.get_json()["duplicate"])
        verify.assert_called()
        with self.app.app_context():
            record = BillingSubscription.query.one()
            self.assertEqual(record.status, "active")
            self.assertEqual(record.stripe_subscription_id, "sub_essential")
            self.assertEqual(record.stripe_price_id, "price_essential")
            self.assertEqual(StripeWebhookEvent.query.count(), 1)
            self.assertEqual(User.query.one().to_dict()["plan"]["name"], "Plan Esencial")

    def test_billing_endpoints_require_authentication(self):
        self.assertEqual(self.client.get("/api/billing/subscription").status_code, 401)
        self.assertEqual(self.client.post("/api/billing/checkout", json={}).status_code, 401)
        self.assertEqual(self.client.post("/api/billing/portal", json={}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
