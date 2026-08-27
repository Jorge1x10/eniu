import unittest

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


if __name__ == "__main__":
    unittest.main()
