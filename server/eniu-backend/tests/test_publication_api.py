import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from flask_jwt_extended import create_access_token
from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.database.db import db
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.category.model import Category
from app.modules.products.model import Product
from app.modules.template.model import CatalogueTemplate
from app.modules.users.model import User


FORBIDDEN_KEYS = {
    "id", "public_id", "user_id", "owner_id", "business_id", "catalogue_id",
    "category_id", "email", "password", "password_hash", "google_id", "plan",
    "subscription", "access_token", "refresh_token", "created_at", "updated_at",
    "published_at", "public_slug", "is_published", "cover_filename", "background_filename",
}
UUID_PATTERN = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b", re.I)


def all_keys(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            yield key
            yield from all_keys(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from all_keys(nested)


class PublicationApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "publication-tests-secret-at-least-32-bytes",
            "PUBLIC_WEB_BASE_URL": "https://menus.example.test",
        })

    def setUp(self):
        self.backgrounds = tempfile.TemporaryDirectory()
        self.app.config["CATALOGUE_BACKGROUND_FOLDER"] = self.backgrounds.name
        with self.app.app_context():
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            db.drop_all()
            db.create_all()
            owner = User(email="publication-owner@example.com")
            outsider = User(email="publication-outsider@example.com")
            db.session.add_all([owner, outsider])
            db.session.flush()
            business = Business(name="La Pizzería Santa Anita", description="Pizzas", owner_id=owner.id)
            second_business = Business(name="La Pizzería Santa Anita", owner_id=owner.id)
            foreign_business = Business(name="Negocio ajeno", owner_id=outsider.id)
            db.session.add_all([business, second_business, foreign_business])
            db.session.flush()
            catalogue = Catalogue(name="Menú principal", description="Especialidades", business_id=business.id)
            collision_catalogue = Catalogue(name="Menú principal", business_id=second_business.id)
            foreign_catalogue = Catalogue(name="Menú ajeno", business_id=foreign_business.id)
            db.session.add_all([catalogue, collision_catalogue, foreign_catalogue])
            db.session.flush()
            category = Category(name="Pizzas", description="Clásicas", catalogue_id=catalogue.id)
            db.session.add(category)
            db.session.flush()
            db.session.add_all([
                Product(name="Pepperoni", description="Queso y pepperoni", price=189, catalogue_id=catalogue.id, category_id=category.id),
                Product(name="Agua", price=25, catalogue_id=catalogue.id, category_id=None, is_available=False),
                CatalogueTemplate(
                    catalogue_id=catalogue.id,
                    template_key="minimal",
                    font_key="lora",
                    background_filename="background.webp",
                    background_opacity=0.35,
                ),
            ])
            db.session.commit()
            (Path(self.backgrounds.name) / "background.webp").write_bytes(
                b"RIFF\x08\x00\x00\x00WEBPbackground"
            )
            self.owner_token = create_access_token(identity=str(owner.id))
            self.outsider_token = create_access_token(identity=str(outsider.id))
            self.business_id = str(business.id)
            self.second_business_id = str(second_business.id)
            self.foreign_business_id = str(foreign_business.id)
            self.catalogue_id = str(catalogue.id)
            self.collision_catalogue_id = str(collision_catalogue.id)
            self.foreign_catalogue_id = str(foreign_catalogue.id)
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        self.backgrounds.cleanup()

    def headers(self, token=None):
        return {"Authorization": f"Bearer {token or self.owner_token}"}

    def base(self, business_id=None, catalogue_id=None):
        return f"/api/businesses/{business_id or self.business_id}/catalogues/{catalogue_id or self.catalogue_id}"

    def publish(self, business_id=None, catalogue_id=None):
        return self.client.patch(
            f"{self.base(business_id, catalogue_id)}/publication",
            headers=self.headers(), json={"is_published": True},
        )

    def test_publish_slug_stability_unpublish_and_republish(self):
        response = self.publish()
        self.assertEqual(response.status_code, 200)
        first = response.get_json()["publication"]
        self.assertEqual(first["public_slug"], "la-pizzeria-santa-anita-menu-principal")
        self.assertEqual(first["public_url"], f"https://menus.example.test/m/{first['public_slug']}")

        response = self.client.patch(
            f"{self.base()}/publication", headers=self.headers(), json={"is_published": False}
        )
        unpublished = response.get_json()["publication"]
        self.assertFalse(unpublished["is_published"])
        self.assertEqual(unpublished["public_slug"], first["public_slug"])
        self.assertIsNone(unpublished["published_at"])

        republished = self.publish().get_json()["publication"]
        self.assertEqual(republished["public_slug"], first["public_slug"])
        with self.app.app_context():
            product = Product.query.filter_by(name="Pepperoni").first()
            product.price = 199
            config = CatalogueTemplate.query.filter_by(catalogue_id=product.catalogue_id).first()
            config.template_key = "elegant"
            db.session.commit()
        self.assertEqual(self.client.get(f"{self.base()}/publication", headers=self.headers()).get_json()["publication"]["public_slug"], first["public_slug"])

    def test_slug_collision_is_resolved(self):
        first_slug = self.publish().get_json()["publication"]["public_slug"]
        second = self.publish(self.second_business_id, self.collision_catalogue_id)
        self.assertEqual(second.status_code, 200)
        second_slug = second.get_json()["publication"]["public_slug"]
        self.assertNotEqual(first_slug, second_slug)
        self.assertRegex(second_slug, rf"^{re.escape(first_slug)}-[0-9a-f]{{6}}$")

    def test_private_publication_and_preview_enforce_scope(self):
        self.assertEqual(self.client.get(f"{self.base()}/publication").status_code, 401)
        self.assertEqual(self.client.get(f"{self.base()}/preview", headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.get(f"{self.base()}/preview", headers=self.headers(self.outsider_token)).status_code, 403)
        self.assertEqual(self.publish(self.foreign_business_id, self.foreign_catalogue_id).status_code, 403)
        mismatched = self.publish(self.second_business_id, self.catalogue_id)
        self.assertEqual(mismatched.status_code, 404)
        invalid = self.client.patch(f"{self.base()}/publication", headers=self.headers(), json={"is_published": "true"})
        self.assertEqual(invalid.status_code, 400)

    def test_public_menu_requires_publication_and_contains_only_allowed_data(self):
        self.assertEqual(self.client.get("/api/public/menus/missing").status_code, 404)
        self.assertEqual(
            self.client.get("/api/public/menus/unpublished/background").status_code,
            404,
        )
        response = self.publish()
        slug = response.get_json()["publication"]["public_slug"]
        public_response = self.client.get(f"/api/public/menus/{slug}")
        self.assertEqual(public_response.status_code, 200)
        self.assertEqual(public_response.headers["Cache-Control"], "no-cache")
        payload = public_response.get_json()
        self.assertFalse(FORBIDDEN_KEYS.intersection(set(all_keys(payload))))
        self.assertIsNone(UUID_PATTERN.search(json.dumps(payload)))
        menu = payload["menu"]
        self.assertEqual(menu["business"], {"name": "La Pizzería Santa Anita", "description": "Pizzas"})
        self.assertEqual(menu["template"]["key"], "minimal")
        self.assertEqual(menu["template"]["theme"]["background_opacity"], 0.35)
        background_url = menu["template"]["theme"]["background_image_url"]
        background_response = self.client.get(background_url)
        self.assertEqual(background_response.data, b"RIFF\x08\x00\x00\x00WEBPbackground")
        background_response.close()
        self.assertEqual(menu["categories"][0]["products"][0]["name"], "Pepperoni")
        self.assertEqual(menu["uncategorized_products"][0]["name"], "Agua")
        self.assertFalse(menu["uncategorized_products"][0]["is_available"])

        self.client.patch(f"{self.base()}/publication", headers=self.headers(), json={"is_published": False})
        self.assertEqual(self.client.get(f"/api/public/menus/{slug}").status_code, 404)
        self.assertEqual(self.client.get(background_url).status_code, 404)

    def test_publication_rollback_does_not_expose_database_error(self):
        with patch.object(db.session, "commit", side_effect=SQLAlchemyError("private SQL detail")):
            response = self.publish()
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("private SQL detail", response.get_data(as_text=True))
        with self.app.app_context():
            catalogue = db.session.get(Catalogue, __import__("uuid").UUID(self.catalogue_id))
            self.assertFalse(catalogue.is_published)
            self.assertIsNone(catalogue.public_slug)


if __name__ == "__main__":
    unittest.main()
