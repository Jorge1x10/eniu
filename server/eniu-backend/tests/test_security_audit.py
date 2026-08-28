import time
import unittest
from io import BytesIO

from flask_jwt_extended import create_access_token

from app import create_app
from app.database.db import db
from app.extensions import bcrypt
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.users.model import User
from tests.plan_helpers import grant_plan


def tamper_signature(token):
    """Altera un carácter del centro de la firma de un JWT.

    Cambiar el último no sirve: en base64url el carácter final de una firma de
    32 bytes sólo lleva dos bits significativos, así que uno de cada cuatro
    reemplazos decodifica a la misma firma y el token «alterado» seguía siendo
    válido. La prueba pasaba o fallaba según con qué carácter terminara el
    token de ese arranque. Los caracteres centrales llevan sus seis bits, de
    modo que cambiarlos invalida la firma siempre.
    """
    header, payload, signature = token.split(".")
    middle = len(signature) // 2
    replacement = "a" if signature[middle] != "a" else "b"
    return f"{header}.{payload}.{signature[:middle]}{replacement}{signature[middle + 1:]}"


class SecurityAuditTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "security-audit-secret-at-least-32-bytes",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()
            owner = User(
                email="owner@example.com",
                username="secure-owner",
                password=bcrypt.generate_password_hash("SecurePass1").decode("utf-8"),
            )
            outsider = User(email="outsider@example.com", username="outsider")
            db.session.add_all([owner, outsider])
            db.session.flush()
            owned_business = Business(name="Propio", owner_id=owner.id)
            foreign_business = Business(name="Ajeno", owner_id=outsider.id)
            db.session.add_all([owned_business, foreign_business])
            db.session.flush()
            owned_catalogue = Catalogue(name="Principal", business_id=owned_business.id)
            foreign_catalogue = Catalogue(name="Privado", business_id=foreign_business.id)
            db.session.add_all([owned_catalogue, foreign_catalogue])
            db.session.commit()
            grant_plan(owner.id)
            grant_plan(outsider.id)
            self.owner_token = create_access_token(identity=str(owner.id))
            self.outsider_token = create_access_token(identity=str(outsider.id))
            self.business_id = str(owned_business.id)
            self.foreign_business_id = str(foreign_business.id)
            self.catalogue_id = str(owned_catalogue.id)
            self.foreign_catalogue_id = str(foreign_catalogue.id)
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @staticmethod
    def headers(token):
        return {"Authorization": f"Bearer {token}"}

    def test_sql_injection_payloads_are_treated_as_data(self):
        payloads = [
            "' OR 1=1 --",
            "'; DROP TABLE users; --",
            '" OR ""="',
            "admin' UNION SELECT NULL--",
        ]
        for payload in payloads:
            with self.subTest(payload=payload):
                login = self.client.post(
                    "/api/auth/login",
                    json={"identifier": payload, "password": "SecurePass1"},
                )
                self.assertEqual(login.status_code, 401)

                public_lookup = self.client.get(f"/api/public/menus/{payload}")
                self.assertIn(public_lookup.status_code, {404, 400})

        created = self.client.post(
            f"/api/businesses/{self.business_id}/catalogues",
            headers=self.headers(self.owner_token),
            json={"name": "'; DROP TABLE users; --"},
        )
        self.assertEqual(created.status_code, 201)
        with self.app.app_context():
            self.assertEqual(User.query.count(), 2)
            self.assertEqual(Catalogue.query.count(), 3)

    def test_url_and_identifier_manipulation_cannot_cross_tenants(self):
        combinations = [
            (self.business_id, self.foreign_catalogue_id),
            (self.foreign_business_id, self.catalogue_id),
            (self.foreign_business_id, self.foreign_catalogue_id),
        ]
        for business_id, catalogue_id in combinations:
            with self.subTest(business_id=business_id, catalogue_id=catalogue_id):
                response = self.client.get(
                    f"/api/businesses/{business_id}/catalogues/{catalogue_id}/template",
                    headers=self.headers(self.owner_token),
                )
                self.assertIn(response.status_code, {403, 404})
                self.assertNotIn("Privado", response.get_data(as_text=True))

        traversal = self.client.get("/api/catalogues/..%2F..%2Fconfig.py/background")
        self.assertIn(traversal.status_code, {400, 401, 404})

    def test_invalid_missing_and_tampered_jwt_are_rejected(self):
        url = f"/api/businesses/{self.business_id}/catalogues"
        self.assertEqual(self.client.get(url).status_code, 401)
        self.assertEqual(self.client.get(url, headers=self.headers("not-a-jwt")).status_code, 401)
        self.assertEqual(self.client.get(url, headers=self.headers(tamper_signature(self.owner_token))).status_code, 401)
        self.assertEqual(
            self.client.get(url, headers=self.headers(self.outsider_token)).status_code,
            403,
        )

    def test_cors_and_security_headers_are_restrictive(self):
        response = self.client.get("/api/health", headers={"Origin": "https://evil.example"})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertEqual(response.headers["Referrer-Policy"], "no-referrer")

    def test_backend_handles_repeated_health_and_authenticated_requests(self):
        started = time.perf_counter()
        health_statuses = [self.client.get("/api/health").status_code for _ in range(250)]
        private_statuses = [
            self.client.get(
                f"/api/businesses/{self.business_id}/catalogues",
                headers=self.headers(self.owner_token),
            ).status_code
            for _ in range(100)
        ]
        elapsed = time.perf_counter() - started
        self.assertEqual(set(health_statuses), {200})
        self.assertEqual(set(private_statuses), {200})
        self.assertLess(elapsed, 10)

    def test_methods_and_unknown_fields_are_rejected(self):
        endpoint = f"/api/businesses/{self.business_id}/catalogues/{self.catalogue_id}/template"
        self.assertEqual(
            self.client.delete(endpoint, headers=self.headers(self.owner_token)).status_code,
            405,
        )
        response = self.client.patch(
            endpoint,
            headers=self.headers(self.owner_token),
            json={"theme": {"custom_css": "body{display:none}"}},
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("Traceback", response.get_data(as_text=True))

    def test_image_uploads_reject_spoofed_executable_content(self):
        business_response = self.client.patch(
            f"/api/businesses/{self.business_id}",
            headers=self.headers(self.owner_token),
            data={"photo": (BytesIO(b"MZ-executable"), "business.jpg", "image/jpeg")},
            content_type="multipart/form-data",
        )
        self.assertEqual(business_response.status_code, 400)

        product_response = self.client.post(
            f"/api/businesses/{self.business_id}/catalogues/{self.catalogue_id}/products",
            headers=self.headers(self.owner_token),
            data={
                "name": "Archivo falso",
                "images": (BytesIO(b"MZ-executable"), "product.jpg", "image/jpeg"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(product_response.status_code, 400)
        self.assertNotIn("traceback", product_response.get_data(as_text=True).lower())


if __name__ == "__main__":
    unittest.main()
