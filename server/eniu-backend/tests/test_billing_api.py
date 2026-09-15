import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import UUID

import stripe
from flask_jwt_extended import create_access_token
from stripe._stripe_object import StripeObject

from app import create_app
from app.database.db import db

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
        # La dirección decide qué IVA toca, y guardarla en el cliente es lo que
        # hace que la renovación del mes siguiente se calcule igual de bien.
        self.assertEqual(payload["billing_address_collection"], "required")
        self.assertEqual(payload["customer_update"], {"address": "auto", "name": "auto"})
        # Un negocio europeo con NIF-IVA paga por inversión del sujeto pasivo.
        self.assertEqual(payload["tax_id_collection"], {"enabled": True})
        self.assertEqual(payload["locale"], "es")

        with self.app.app_context():
            record = BillingSubscription.query.one()
            self.assertEqual(record.stripe_customer_id, "cus_eniu")

    def _checkout_payload(self):
        """Argumentos con los que se llamó a Stripe al crear la sesión de pago."""
        price = SimpleNamespace(id="price_essential", recurring=SimpleNamespace(interval="month"))
        with patch("app.modules.billing.services.stripe.Customer.create", return_value=SimpleNamespace(id="cus_eniu")), patch(
            "app.modules.billing.services.stripe.Price.list",
            return_value=SimpleNamespace(data=[price]),
        ), patch(
            "app.modules.billing.services.stripe.checkout.Session.create",
            return_value=SimpleNamespace(url="https://checkout.stripe.test/session"),
        ) as checkout_create:
            response = self.client.post("/api/billing/checkout", headers=self.headers, json={})
        self.assertEqual(response.status_code, 201)
        return checkout_create.call_args.kwargs

    def test_automatic_tax_only_travels_when_the_account_can_calculate_it(self):
        """Stripe Tax se pide desde la configuración, no siempre.

        Pedirlo con la cuenta sin activar hace que Checkout devuelva un error
        y nadie pueda pagar; no pedirlo cuando toca significa cobrarle a un
        consumidor europeo sin el IVA de su país.
        """
        self.assertNotIn("automatic_tax", self._checkout_payload())

        with patch.dict(self.app.config, {"STRIPE_AUTOMATIC_TAX": True}):
            self.assertEqual(self._checkout_payload()["automatic_tax"], {"enabled": True})

    def test_withdrawal_waiver_is_asked_for_explicitly_when_enabled(self):
        """La renuncia al desistimiento se marca, no se da por leída.

        El consumidor europeo conserva catorce días para deshacer una compra a
        distancia salvo que acepte expresamente empezar de inmediato. Stripe
        exige una URL de términos configurada para poder enseñar la casilla,
        así que esto viaja sólo cuando la cuenta está lista.
        """
        self.assertNotIn("consent_collection", self._checkout_payload())

        with patch.dict(self.app.config, {"STRIPE_TERMS_CONSENT": True}):
            payload = self._checkout_payload()
        self.assertEqual(payload["consent_collection"], {"terms_of_service": "required"})
        message = payload["custom_text"]["terms_of_service_acceptance"]["message"]
        self.assertIn("desistimiento", message)
        # Stripe rechaza cualquier texto más largo que esto.
        self.assertLessEqual(len(message), 1200)

    def test_the_payment_screen_follows_the_language_of_the_account(self):
        """Quien puso Eniu en inglés no debe acabar pagando en español."""
        with self.app.app_context():
            user = db.session.get(User, UUID(self.user_id))
            user.language = "en"
            db.session.commit()

        payload = self._checkout_payload()
        self.assertEqual(payload["locale"], "en")
        with patch.dict(self.app.config, {"STRIPE_TERMS_CONSENT": True}):
            message = self._checkout_payload()["custom_text"]["terms_of_service_acceptance"]["message"]
        self.assertIn("withdrawal", message)

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
        # El portal es donde se corrige la dirección de facturación y el
        # NIF-IVA, así que sale en el idioma de la cuenta.
        portal_create.assert_called_once_with(
            customer="cus_owner",
            locale="es",
            return_url="http://frontend.test/dashboard/settings",
        )

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

    def test_portal_failure_is_logged_with_a_useful_detail(self):
        # El error de "portal sin configurar" no trae `code`, y registrarlo a
        # secas dejaba un «None» en el log en lugar del motivo real.
        with self.app.app_context():
            db.session.add(BillingSubscription(
                user_id=UUID(self.user_id), stripe_customer_id="cus_owner",
                stripe_subscription_id="sub_owner", plan_key="essential", status="active",
            ))
            db.session.commit()

        failure = stripe.InvalidRequestError("your default configuration has not been created", None)
        with patch("app.modules.billing.services.stripe.billing_portal.Session.create", side_effect=failure):
            with self.assertLogs("app", level="WARNING") as logs:
                response = self.client.post("/api/billing/portal", headers=self.headers, json={})

        self.assertEqual(response.status_code, 502)
        registro = " ".join(logs.output)
        self.assertIn("default configuration has not been created", registro)
        self.assertNotIn("Stripe portal error: None", registro)

    def test_billing_endpoints_require_authentication(self):
        self.assertEqual(self.client.get("/api/billing/subscription").status_code, 401)
        self.assertEqual(self.client.post("/api/billing/checkout", json={}).status_code, 401)
        self.assertEqual(self.client.post("/api/billing/portal", json={}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
