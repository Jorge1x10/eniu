import unittest
from uuid import UUID

from flask_jwt_extended import create_access_token

from app import create_app
from app.database.db import db
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.users.model import User
from tests.plan_helpers import grant_plan


class CatalogueApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "catalogue-tests-secret-at-least-32-bytes",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()

            owner = User(email="owner@example.com")
            outsider = User(email="outsider@example.com")
            db.session.add_all([owner, outsider])
            db.session.flush()

            business = Business(name="Café Central", owner_id=owner.id)
            other_business = Business(name="Otro negocio", owner_id=outsider.id)
            db.session.add_all([business, other_business])
            db.session.commit()

            grant_plan(owner.id)
            grant_plan(outsider.id)

            self.owner_id = str(owner.id)
            self.outsider_id = str(outsider.id)
            self.business_id = str(business.id)
            self.other_business_id = str(other_business.id)
            self.owner_token = create_access_token(identity=self.owner_id)
            self.outsider_token = create_access_token(identity=self.outsider_id)

        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def headers(self, token=None):
        return {"Authorization": f"Bearer {token or self.owner_token}"}

    def create_catalogue(self, name="Menú principal", description="Menú general"):
        return self.client.post(
            f"/api/businesses/{self.business_id}/catalogues",
            headers=self.headers(),
            json={"name": name, "description": description},
        )

    def test_create_and_list_catalogues(self):
        response = self.client.post(
            f"/api/businesses/{self.business_id}/catalogues",
            headers=self.headers(),
            json={
                "name": "  Menú principal  ",
                "description": "Nuestro menú general",
                "business_id": self.other_business_id,
            },
        )

        self.assertEqual(response.status_code, 201)
        catalogue = response.get_json()["catalogue"]
        self.assertEqual(catalogue["name"], "Menú principal")
        self.assertEqual(catalogue["business_id"], self.business_id)
        self.assertEqual(catalogue["public_id"], catalogue["id"])
        self.assertFalse(catalogue["is_published"])
        self.assertIsNone(catalogue["published_at"])
        self.assertIsNone(catalogue["template_id"])

        response = self.client.get(
            f"/api/businesses/{self.business_id}/catalogues",
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()["catalogues"]), 1)

    def test_private_routes_require_auth_and_business_access(self):
        response = self.client.get(
            f"/api/businesses/{self.business_id}/catalogues"
        )
        self.assertEqual(response.status_code, 401)

        response = self.client.get(
            f"/api/businesses/{self.business_id}/catalogues",
            headers=self.headers(self.outsider_token),
        )
        self.assertEqual(response.status_code, 403)

    def test_duplicate_name_in_same_business_returns_conflict(self):
        self.assertEqual(self.create_catalogue().status_code, 201)

        response = self.create_catalogue(name="menú PRINCIPAL")
        self.assertEqual(response.status_code, 409)

    def test_edit_catalogue_and_enforce_business_scope(self):
        catalogue_id = self.create_catalogue().get_json()["catalogue"]["id"]

        response = self.client.patch(
            f"/api/businesses/{self.business_id}/catalogues/{catalogue_id}",
            headers=self.headers(),
            json={
                "name": "  Carta de temporada ",
                "description": "  Edición de verano  ",
                "template_id": 2,
                "business_id": self.other_business_id,
                "is_published": True,
            },
        )
        self.assertEqual(response.status_code, 200)
        catalogue = response.get_json()["catalogue"]
        self.assertEqual(catalogue["name"], "Carta de temporada")
        self.assertEqual(catalogue["description"], "Edición de verano")
        self.assertEqual(catalogue["template_id"], 2)
        self.assertEqual(catalogue["business_id"], self.business_id)
        self.assertFalse(catalogue["is_published"])

        response = self.client.get(
            f"/api/businesses/{self.other_business_id}/catalogues/{catalogue_id}",
            headers=self.headers(self.outsider_token),
        )
        self.assertEqual(response.status_code, 404)

    def test_publish_public_lookup_and_unpublish(self):
        catalogue_id = self.create_catalogue().get_json()["catalogue"]["id"]

        response = self.client.post(
            f"/api/businesses/{self.business_id}/catalogues/{catalogue_id}/publish",
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)
        catalogue = response.get_json()["catalogue"]
        self.assertTrue(catalogue["is_published"])
        self.assertIsNotNone(catalogue["published_at"])
        self.assertIsNotNone(catalogue["public_slug"])

        public_url = f"/api/public/menus/{catalogue['public_slug']}"
        response = self.client.get(public_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["menu"]["catalogue"]["name"], "Menú principal")

        response = self.client.post(
            f"/api/businesses/{self.business_id}/catalogues/{catalogue_id}/unpublish",
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()["catalogue"]["is_published"])
        self.assertIsNone(response.get_json()["catalogue"]["published_at"])
        self.assertEqual(response.get_json()["catalogue"]["public_slug"], catalogue["public_slug"])
        self.assertEqual(self.client.get(public_url).status_code, 404)

    def test_invalid_payloads_return_bad_request(self):
        response = self.client.post(
            f"/api/businesses/{self.business_id}/catalogues",
            headers=self.headers(),
            json={"description": "Sin nombre"},
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            f"/api/businesses/{self.business_id}/catalogues",
            headers=self.headers(),
            json={"name": "x" * 65},
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            f"/api/businesses/{self.business_id}/catalogues",
            headers=self.headers(),
            json={"name": "Válido", "template_id": 0},
        )
        self.assertEqual(response.status_code, 400)

    def test_delete_catalogue(self):
        catalogue_id = self.create_catalogue().get_json()["catalogue"]["id"]
        response = self.client.delete(
            f"/api/businesses/{self.business_id}/catalogues/{catalogue_id}",
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)

        with self.app.app_context():
            self.assertIsNone(db.session.get(Catalogue, UUID(catalogue_id)))


if __name__ == "__main__":
    unittest.main()
