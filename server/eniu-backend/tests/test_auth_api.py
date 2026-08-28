import unittest
from unittest.mock import patch

from app import create_app
from app.database.db import db
from app.modules.users.model import User


class AuthApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "auth-tests-secret-at-least-32-bytes",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def register(self, **overrides):
        payload = {
            "username": "dueno1",
            "email": "dueno1@example.com",
            "phone": "5512345678",
            "password": "supersecreta",
        }
        payload.update(overrides)
        return self.client.post("/api/auth/register", json=payload)

    def test_register_success_returns_string_message(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertIsInstance(response.json["message"], str)
        self.assertEqual(response.json["user"]["email"], "dueno1@example.com")

    def test_register_without_username_derives_one_from_the_email(self):
        # El alta de tres pasos ya no pide nombre de usuario.
        response = self.client.post("/api/auth/register", json={
            "email": "Ana.Lopez@example.com", "phone": "5511110000", "password": "ClaveSegura1",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["user"]["username"], "ana.lopez")

    def test_two_accounts_with_the_same_email_prefix_get_different_usernames(self):
        first = self.client.post("/api/auth/register", json={
            "email": "ana@example.com", "phone": "5511110001", "password": "ClaveSegura1",
        })
        second = self.client.post("/api/auth/register", json={
            "email": "ana@otro.com", "phone": "5511110002", "password": "ClaveSegura1",
        })
        self.assertEqual((first.status_code, second.status_code), (201, 201))
        self.assertEqual(first.json["user"]["username"], "ana")
        self.assertEqual(second.json["user"]["username"], "ana1")

    def test_register_still_requires_the_rest_of_the_fields(self):
        response = self.client.post("/api/auth/register", json={"email": "sin@telefono.com"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(sorted(response.json["fields"]), ["password", "phone"])

    def test_register_duplicate_email_returns_string_message(self):
        self.register()
        response = self.register(username="dueno2", phone="5599999999")
        self.assertEqual(response.status_code, 409)
        self.assertIsInstance(response.json["message"], str)
        self.assertEqual(response.json["code"], "email_already_exists")

    def test_register_invalid_password_returns_string_message(self):
        response = self.register(password="short")
        self.assertEqual(response.status_code, 400)
        self.assertIsInstance(response.json["message"], str)
        self.assertEqual(response.json["code"], "invalid_password")

    def test_google_auth_invalid_credential_returns_string_message(self):
        response = self.client.post("/api/auth/google", json={"credential": "not-a-real-token"})
        self.assertEqual(response.status_code, 401)
        self.assertIsInstance(response.json["message"], str)
        self.assertEqual(response.json["code"], "invalid_google_credential")

    def apple_login(self, claims, **payload):
        with patch("app.modules.auth.services._apple_claims", return_value=claims):
            return self.client.post("/api/auth/apple", json={"identity_token": "token", **payload})

    def test_apple_auth_requires_identity_token(self):
        response = self.client.post("/api/auth/apple", json={})
        self.assertEqual(response.status_code, 400)
        self.assertIsInstance(response.json["message"], str)

    def test_apple_auth_invalid_credential_returns_string_message(self):
        response = self.client.post("/api/auth/apple", json={"identity_token": "not-a-real-token"})
        self.assertEqual(response.status_code, 401)
        self.assertIsInstance(response.json["message"], str)
        self.assertEqual(response.json["code"], "invalid_apple_credential")

    def test_apple_auth_creates_user_and_stores_first_authorization_name(self):
        claims = {"sub": "apple-1", "email": "Nuevo@Example.com", "email_verified": "true"}
        response = self.apple_login(claims, full_name="Jorge Alvarado")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["user"]["email"], "nuevo@example.com")
        self.assertEqual(response.json["user"]["name"], "Jorge Alvarado")
        self.assertTrue(response.json["user"]["auth_methods"]["apple"])
        self.assertIn("access_token", response.json)

    def test_apple_auth_accepts_boolean_email_verified(self):
        claims = {"sub": "apple-bool", "email": "bool@example.com", "email_verified": True}
        self.assertEqual(self.apple_login(claims).status_code, 200)

    def test_apple_auth_reuses_account_on_later_sign_in_without_name(self):
        claims = {"sub": "apple-2", "email": "repite@example.com", "email_verified": "true"}
        first = self.apple_login(claims, full_name="Nombre Original")
        # En autorizaciones posteriores Apple ya no manda el nombre.
        second = self.apple_login(claims)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json["user"]["id"], first.json["user"]["id"])
        self.assertEqual(second.json["user"]["name"], "Nombre Original")

    def test_apple_auth_links_existing_account_by_email(self):
        self.register(email="mixta@example.com")
        claims = {"sub": "apple-3", "email": "mixta@example.com", "email_verified": "true"}
        response = self.apple_login(claims)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["user"]["auth_methods"]["apple"])
        self.assertTrue(response.json["user"]["auth_methods"]["password"])

    def test_apple_auth_rejects_email_linked_to_another_apple_id(self):
        self.apple_login({"sub": "apple-4", "email": "duena@example.com", "email_verified": "true"})
        response = self.apple_login({"sub": "otro-apple", "email": "duena@example.com", "email_verified": "true"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json["code"], "apple_account_conflict")

    def test_apple_auth_without_email_returns_actionable_message(self):
        response = self.apple_login({"sub": "apple-5", "email_verified": "true"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json["code"], "apple_email_unavailable")
        self.assertIsInstance(response.json["message"], str)

    def test_apple_auth_rejects_unverified_email(self):
        response = self.apple_login({"sub": "apple-6", "email": "sin@example.com", "email_verified": "false"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json["code"], "unverified_email")


if __name__ == "__main__":
    unittest.main()
