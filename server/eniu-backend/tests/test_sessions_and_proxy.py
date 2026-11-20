"""Duración de las sesiones y la IP con la que cuenta el rate limiter."""
import unittest
from datetime import timedelta

from flask_jwt_extended import decode_token

from app import create_app
from app.database.db import db


BASE_CONFIG = {
    "TESTING": True,
    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    "JWT_SECRET_KEY": "sessions-tests-secret-at-least-32-bytes",
}

PASSWORD = "ClaveSegura1"


class SessionLifetimeTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app(dict(BASE_CONFIG))

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def lifetime(self, token):
        with self.app.app_context():
            claims = decode_token(token)
        return timedelta(seconds=claims["exp"] - claims["iat"])

    def register(self):
        response = self.client.post("/api/auth/register", json={
            "email": "sesion@example.com", "phone": "5512340000", "password": PASSWORD,
        })
        self.assertEqual(response.status_code, 201)
        return response.json

    def test_login_by_email_lasts_as_long_as_any_other_sign_in(self):
        # El login por correo daba un refresh de 2 horas mientras que el
        # registro (y Google y Apple) daban 30 días.
        registered = self.register()
        login = self.client.post("/api/auth/login", json={
            "identifier": "sesion@example.com", "password": PASSWORD,
        })
        self.assertEqual(login.status_code, 200)

        refresh = self.app.config["JWT_REFRESH_TOKEN_EXPIRES"]
        access = self.app.config["JWT_ACCESS_TOKEN_EXPIRES"]
        for tokens in (registered, login.json):
            self.assertEqual(self.lifetime(tokens["refresh_token"]), refresh)
            self.assertEqual(self.lifetime(tokens["access_token"]), access)
        self.assertGreaterEqual(refresh, timedelta(days=7))

    def test_refreshing_returns_an_access_token_with_the_configured_lifetime(self):
        tokens = self.register()
        response = self.client.post(
            "/api/auth/refresh",
            headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.lifetime(response.json["access_token"]),
            self.app.config["JWT_ACCESS_TOKEN_EXPIRES"],
        )

    def test_changing_the_password_keeps_the_same_lifetimes(self):
        tokens = self.register()
        response = self.client.patch(
            "/api/auth/password",
            json={"current_password": PASSWORD, "new_password": "OtraClave2024"},
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.lifetime(response.json["refresh_token"]),
            self.app.config["JWT_REFRESH_TOKEN_EXPIRES"],
        )


class RateLimitClientIpTestCase(unittest.TestCase):
    """El limiter tiene que contar por cliente, no por balanceador.

    `/auth/forgot-password` admite 5 peticiones por hora y responde sin tocar
    la base cuando no llega correo, así que sirve para medir el contador.
    """

    LIMIT = 5

    def make_client(self, proxies):
        app = create_app({**BASE_CONFIG, "RATELIMIT_ENABLED": True, "TRUSTED_PROXY_COUNT": proxies})
        return app.test_client()

    def forgot(self, client, forwarded_for, proxy="10.0.0.1"):
        return client.post(
            "/api/auth/forgot-password",
            json={},
            headers={"X-Forwarded-For": forwarded_for},
            environ_base={"REMOTE_ADDR": proxy},
        )

    def test_behind_the_proxy_each_client_has_its_own_counter(self):
        client = self.make_client(proxies=1)
        for _ in range(self.LIMIT):
            self.assertEqual(self.forgot(client, "203.0.113.10").status_code, 200)
        self.assertEqual(self.forgot(client, "203.0.113.10").status_code, 429)

        # Otro cliente que llega por el mismo balanceador no está bloqueado.
        self.assertEqual(self.forgot(client, "203.0.113.11").status_code, 200)

    def test_only_the_address_added_by_the_trusted_proxy_counts(self):
        # Un cliente puede mandar su propio X-Forwarded-For; el balanceador
        # añade la IP real al final y esa es la única que se cree.
        client = self.make_client(proxies=1)
        for spoofed in range(self.LIMIT):
            response = self.forgot(client, f"198.51.100.{spoofed}, 203.0.113.20")
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.forgot(client, "198.51.100.99, 203.0.113.20").status_code, 429)

    def test_without_a_proxy_the_header_is_ignored(self):
        client = self.make_client(proxies=0)
        for spoofed in range(self.LIMIT):
            response = self.forgot(client, f"198.51.100.{spoofed}", proxy="203.0.113.30")
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.forgot(client, "198.51.100.99", proxy="203.0.113.30").status_code, 429)


if __name__ == "__main__":
    unittest.main()
