import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import UUID

import stripe
from flask_jwt_extended import create_access_token

from app import create_app
from app.database.db import db
from app.extensions import bcrypt
from app.modules.billing.model import BillingSubscription
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.products.model import Product
from app.modules.template.model import CatalogueTemplate
from app.modules.users.model import User

PASSWORD = "MiContrasena1"


class AccountDeletionApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "account-deletion-tests-secret-32-bytes",
            "STRIPE_API_KEY": "sk_test_placeholder",
        })

    def setUp(self):
        self.uploads = tempfile.TemporaryDirectory()
        for key in ("BUSINESS_UPLOAD_FOLDER", "PRODUCT_UPLOAD_FOLDER", "CATALOGUE_COVER_FOLDER",
                    "CATALOGUE_BACKGROUND_FOLDER", "CATALOGUE_SPLASH_FOLDER"):
            self.app.config[key] = self.uploads.name

        with self.app.app_context():
            db.drop_all()
            db.create_all()

            owner = User(email="owner@example.com", username="owner",
                         password=bcrypt.generate_password_hash(PASSWORD).decode())
            social = User(email="google@example.com", username="google", google_id="g-1")
            apple = User(email="apple@example.com", username="apple", apple_id="a-1",
                         apple_refresh_token="r-apple-1")
            db.session.add_all([owner, social, apple])
            db.session.flush()

            business = Business(name="Cafe", owner_id=owner.id, photo_filename="negocio.png")
            db.session.add(business)
            db.session.flush()
            catalogue = Catalogue(name="Menu", business_id=business.id)
            db.session.add(catalogue)
            db.session.flush()
            db.session.add_all([
                CatalogueTemplate(catalogue_id=catalogue.id, cover_filename="portada.png",
                                  background_filename="fondo.png", splash_filename="bienvenida.png"),
                Product(name="Latte", catalogue_id=catalogue.id,
                        pictures=json.dumps([{"id": "1", "filename": "producto.png", "is_default": True}])),
            ])
            db.session.commit()

            self.owner_id = str(owner.id)
            self.social_id = str(social.id)
            self.apple_id = str(apple.id)
            self.owner_token = create_access_token(identity=self.owner_id)
            self.social_token = create_access_token(identity=self.social_id)
            self.apple_token = create_access_token(identity=self.apple_id)

        for name in ("negocio.png", "portada.png", "fondo.png", "bienvenida.png", "producto.png"):
            Path(self.uploads.name, name).write_bytes(b"imagen")

        self.client = self.app.test_client()

    def tearDown(self):
        self.uploads.cleanup()
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def headers(self, token):
        return {"Authorization": f"Bearer {token}"}

    def delete(self, token, **body):
        return self.client.delete("/api/users/me", headers=self.headers(token), json=body)

    def test_deleting_with_the_password_removes_everything_the_account_owned(self):
        response = self.delete(self.owner_token, password=PASSWORD)
        self.assertEqual(response.status_code, 200)

        with self.app.app_context():
            self.assertIsNone(db.session.get(User, UUID(self.owner_id)))
            self.assertEqual(Business.query.count(), 0)
            self.assertEqual(Catalogue.query.count(), 0)
            self.assertEqual(Product.query.count(), 0)
            self.assertEqual(CatalogueTemplate.query.count(), 0)

    def test_the_uploaded_files_are_removed_too(self):
        # Las cascadas limpian filas, no archivos: sin esto las fotos quedarían
        # ocupando espacio para siempre sin nadie que las reclame.
        self.delete(self.owner_token, password=PASSWORD)
        sobrantes = sorted(path.name for path in Path(self.uploads.name).iterdir())
        self.assertEqual(sobrantes, [])

    def test_a_wrong_password_deletes_nothing(self):
        response = self.delete(self.owner_token, password="LaQueNoEs1")
        self.assertEqual(response.status_code, 403)
        with self.app.app_context():
            self.assertIsNotNone(db.session.get(User, UUID(self.owner_id)))
            self.assertEqual(Business.query.count(), 1)

    def test_an_account_without_password_confirms_by_typing_the_word(self):
        # Quien entró con Google no tiene contraseña y aun así debe poder borrarse.
        blocked = self.delete(self.social_token, confirmation="borrar")
        self.assertEqual(blocked.status_code, 400)

        allowed = self.delete(self.social_token, confirmation="eliminar")
        self.assertEqual(allowed.status_code, 200)
        with self.app.app_context():
            self.assertIsNone(db.session.get(User, UUID(self.social_id)))

    def test_the_subscription_is_cancelled_before_the_account_disappears(self):
        with self.app.app_context():
            db.session.add(BillingSubscription(
                user_id=UUID(self.owner_id), stripe_customer_id="cus_1",
                stripe_subscription_id="sub_1", plan_key="essential", status="active",
            ))
            db.session.commit()

        with patch("app.modules.billing.services.stripe.Subscription.retrieve") as retrieve:
            retrieve.return_value.status = "active"
            retrieve.return_value.to_dict.return_value = {"status": "active"}
            response = self.delete(self.owner_token, password=PASSWORD)

        self.assertEqual(response.status_code, 200)
        retrieve.return_value.cancel.assert_called_once()

    def test_a_failure_cancelling_leaves_the_account_intact(self):
        # Borrar sin haber cancelado dejaría a alguien pagando por una cuenta
        # que ya no existe y sin forma de entrar a cancelarla.
        with self.app.app_context():
            db.session.add(BillingSubscription(
                user_id=UUID(self.owner_id), stripe_customer_id="cus_1",
                stripe_subscription_id="sub_1", plan_key="essential", status="active",
            ))
            db.session.commit()

        failure = stripe.APIConnectionError("Stripe no responde")
        with patch("app.modules.billing.services.stripe.Subscription.retrieve", side_effect=failure):
            response = self.delete(self.owner_token, password=PASSWORD)

        self.assertEqual(response.status_code, 502)
        with self.app.app_context():
            self.assertIsNotNone(db.session.get(User, UUID(self.owner_id)))
            self.assertEqual(Business.query.count(), 1)

    def test_the_apple_session_is_revoked_when_the_account_is_deleted(self):
        # Apple lo exige (guía 5.1.1 v): borrar la cuenta sin revocar el token
        # deja la app autorizada en el Apple ID de alguien que ya se fue.
        with patch("app.modules.users.services.revoke_apple_token", return_value=True) as revoke:
            response = self.delete(self.apple_token, confirmation="eliminar")

        self.assertEqual(response.status_code, 200)
        revoke.assert_called_once_with("r-apple-1")
        with self.app.app_context():
            self.assertIsNone(db.session.get(User, UUID(self.apple_id)))

    def test_a_failure_revoking_still_deletes_the_account(self):
        # Al revés que con Stripe: dejar a alguien atrapado en una cuenta que
        # pidió borrar es peor que una sesión colgada en Apple, y esa sí se
        # puede revocar a mano desde el registro.
        with patch("app.modules.users.services.revoke_apple_token", return_value=False) as revoke:
            response = self.delete(self.apple_token, confirmation="eliminar")

        self.assertEqual(response.status_code, 200)
        revoke.assert_called_once()
        with self.app.app_context():
            self.assertIsNone(db.session.get(User, UUID(self.apple_id)))

    def test_an_account_without_apple_never_calls_the_revocation(self):
        with patch("app.modules.users.services.revoke_apple_token") as revoke:
            response = self.delete(self.owner_token, password=PASSWORD)

        self.assertEqual(response.status_code, 200)
        revoke.assert_not_called()

    def test_deleting_requires_authentication(self):
        self.assertEqual(self.client.delete("/api/users/me", json={}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
