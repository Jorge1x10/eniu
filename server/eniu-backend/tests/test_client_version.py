"""Versión mínima de la app móvil y endpoint de consulta de versión."""
import unittest

from app import create_app
from app.database.db import db
from app.modules.system.client_version import parse_version


BASE_CONFIG = {
    "TESTING": True,
    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    "JWT_SECRET_KEY": "client-version-tests-secret-32-bytes",
    "MOBILE_MIN_VERSION": "",
    "MOBILE_MIN_VERSION_IOS": "",
    "MOBILE_MIN_VERSION_ANDROID": "",
    "MOBILE_LATEST_VERSION": "",
    "MOBILE_LATEST_VERSION_IOS": "",
    "MOBILE_LATEST_VERSION_ANDROID": "",
    "MOBILE_STORE_URL_IOS": "https://apps.apple.com/app/id1",
    "MOBILE_STORE_URL_ANDROID": "https://play.google.com/store/apps/details?id=x",
}


def app_headers(platform, version):
    return {"X-Eniu-Platform": platform, "X-Eniu-App-Version": version}


class ParseVersionTestCase(unittest.TestCase):
    def test_reads_partial_versions_and_prerelease_suffixes(self):
        self.assertEqual(parse_version("2.3.1"), (2, 3, 1))
        self.assertEqual(parse_version("3"), (3, 0, 0))
        self.assertEqual(parse_version("3.1"), (3, 1, 0))
        self.assertEqual(parse_version("3.0.0-beta.2"), (3, 0, 0))

    def test_compares_numerically_not_alphabetically(self):
        self.assertLess(parse_version("2.9.0"), parse_version("2.10.0"))

    def test_rejects_what_is_not_a_version(self):
        for value in (None, "", "beta", "v2", 3):
            self.assertIsNone(parse_version(value))


class ClientVersionApiTestCase(unittest.TestCase):
    def make_client(self, **config):
        self.app = create_app({**BASE_CONFIG, **config})
        with self.app.app_context():
            db.create_all()
        return self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_an_outdated_app_is_told_to_update_on_any_api_call(self):
        client = self.make_client(MOBILE_MIN_VERSION="3.0.0")
        response = client.post(
            "/api/auth/login",
            json={"identifier": "a@example.com", "password": "x"},
            headers=app_headers("ios", "2.3.0"),
        )
        self.assertEqual(response.status_code, 426)
        self.assertEqual(response.json["code"], "app_update_required")
        self.assertEqual(response.json["min_version"], "3.0.0")
        self.assertEqual(response.json["store_url"], "https://apps.apple.com/app/id1")
        # La app vieja muestra `message` tal cual como error.
        self.assertIsInstance(response.json["message"], str)

    def test_the_minimum_version_itself_is_allowed(self):
        client = self.make_client(MOBILE_MIN_VERSION="3.0.0")
        response = client.get("/api/auth/me", headers=app_headers("android", "3.0.0"))
        self.assertEqual(response.status_code, 401)

    def test_each_platform_can_have_its_own_minimum(self):
        # La versión nueva ya está en App Store, pero Google aún no la aprueba.
        client = self.make_client(MOBILE_MIN_VERSION_IOS="3.0.0")
        self.assertEqual(
            client.get("/api/auth/me", headers=app_headers("ios", "2.9.0")).status_code, 426
        )
        self.assertEqual(
            client.get("/api/auth/me", headers=app_headers("android", "2.9.0")).status_code, 401
        )

    def test_requests_without_the_headers_are_never_blocked(self):
        # El panel web, el menú público, los webhooks y la app 2.2.0 o anterior.
        client = self.make_client(MOBILE_MIN_VERSION="99.0.0")
        self.assertEqual(client.get("/api/auth/me").status_code, 401)
        self.assertEqual(
            client.get("/api/auth/me", headers={"X-Eniu-Platform": "ios"}).status_code, 401
        )
        self.assertEqual(
            client.get("/api/auth/me", headers=app_headers("web", "1.0.0")).status_code, 401
        )

    def test_health_and_the_version_check_stay_reachable(self):
        client = self.make_client(MOBILE_MIN_VERSION="3.0.0")
        headers = app_headers("ios", "2.0.0")
        self.assertEqual(client.get("/api/health", headers=headers).status_code, 200)
        response = client.get("/api/app/version?platform=ios&version=2.0.0", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "update_required")

    def test_cors_preflight_is_not_blocked(self):
        client = self.make_client(MOBILE_MIN_VERSION="3.0.0")
        response = client.options(
            "/api/auth/me",
            headers={
                "Origin": "http://localhost:8081",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "x-eniu-platform, x-eniu-app-version",
            },
        )
        self.assertLess(response.status_code, 400)
        allowed = response.headers.get("Access-Control-Allow-Headers", "").lower()
        self.assertIn("x-eniu-platform", allowed)
        self.assertIn("x-eniu-app-version", allowed)

    def test_version_status_suggests_without_blocking(self):
        client = self.make_client(MOBILE_MIN_VERSION="2.3.0", MOBILE_LATEST_VERSION="3.1.0")

        def status(version):
            response = client.get(f"/api/app/version?platform=android&version={version}")
            self.assertEqual(response.status_code, 200)
            return response.json

        self.assertEqual(status("2.2.0")["status"], "update_required")
        available = status("3.0.0")
        self.assertEqual(available["status"], "update_available")
        self.assertEqual(available["latest_version"], "3.1.0")
        self.assertEqual(available["store_url"], "https://play.google.com/store/apps/details?id=x")
        self.assertEqual(status("3.1.0")["status"], "ok")

    def test_without_configuration_every_version_is_ok(self):
        client = self.make_client()
        response = client.get("/api/app/version?platform=ios&version=1.0.0")
        self.assertEqual(response.json["status"], "ok")
        self.assertIsNone(response.json["min_version"])

    def test_unknown_platform_is_rejected(self):
        client = self.make_client()
        self.assertEqual(client.get("/api/app/version?platform=windows").status_code, 400)


if __name__ == "__main__":
    unittest.main()
