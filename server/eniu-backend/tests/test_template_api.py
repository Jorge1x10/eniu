import tempfile
import unittest
from io import BytesIO
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
from tests.plan_helpers import grant_plan

JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"cover-one"
WEBP_BYTES = b"RIFF\x08\x00\x00\x00WEBP" + b"background-one"


class TemplateApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "template-tests-secret-at-least-32-bytes",
        })

    def setUp(self):
        self.covers = tempfile.TemporaryDirectory()
        self.backgrounds = tempfile.TemporaryDirectory()
        self.app.config["CATALOGUE_COVER_FOLDER"] = self.covers.name
        self.app.config["CATALOGUE_BACKGROUND_FOLDER"] = self.backgrounds.name
        with self.app.app_context():
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            db.drop_all()
            db.create_all()
            owner = User(email="template-owner@example.com")
            outsider = User(email="template-outsider@example.com")
            db.session.add_all([owner, outsider])
            db.session.flush()
            business = Business(name="Restaurante", owner_id=owner.id)
            foreign_business = Business(name="Ajeno", owner_id=outsider.id)
            db.session.add_all([business, foreign_business])
            db.session.flush()
            first = Catalogue(name="Principal", business_id=business.id)
            second = Catalogue(name="Cena", business_id=business.id)
            foreign = Catalogue(name="Ajeno", business_id=foreign_business.id)
            db.session.add_all([first, second, foreign])
            db.session.flush()
            category = Category(name="Bebidas", catalogue_id=first.id)
            product = Product(name="Agua", catalogue_id=first.id, price=20)
            db.session.add_all([category, product])
            db.session.commit()
            grant_plan(owner.id)
            grant_plan(outsider.id)
            self.owner_token = create_access_token(identity=str(owner.id))
            self.outsider_token = create_access_token(identity=str(outsider.id))
            self.business_id = str(business.id)
            self.foreign_business_id = str(foreign_business.id)
            self.catalogue_id = str(first.id)
            self.second_catalogue_id = str(second.id)
            self.foreign_catalogue_id = str(foreign.id)

        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        self.covers.cleanup()
        self.backgrounds.cleanup()

    def url(self, catalogue_id=None, business_id=None):
        return (
            f"/api/businesses/{business_id or self.business_id}"
            f"/catalogues/{catalogue_id or self.catalogue_id}/template"
        )

    def headers(self, token=None):
        return {"Authorization": f"Bearer {token or self.owner_token}"}

    def test_get_defaults_without_creating_configuration(self):
        response = self.client.get(self.url(), headers=self.headers())
        self.assertEqual(response.status_code, 200)
        template = response.get_json()["template"]
        self.assertEqual(template["template_key"], "modern")
        self.assertEqual(template["theme"]["background_color"], "#FFFDF5")
        self.assertTrue(template["theme"]["show_cover"])

    def test_save_valid_template_theme_and_keep_catalogue_content(self):
        payload = {
            "template_key": "elegant",
            "theme": {
                "background_color": "#111111",
                "primary_color": "#2A2A2A",
                "accent_color": "#FFE05A",
                "text_color": "#FFFFFF",
                "font_key": "playfair",
                "show_cover": False,
                "show_product_images": False,
            },
        }
        response = self.client.patch(self.url(), headers=self.headers(), json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["template"]["template_key"], "elegant")
        self.assertEqual(response.get_json()["template"]["theme"]["font_key"], "playfair")
        with self.app.app_context():
            self.assertEqual(Category.query.count(), 1)
            self.assertEqual(Product.query.count(), 1)

    def test_five_additional_templates_are_allowed(self):
        for template_key in ("bistro", "bold", "natural", "retro", "luxury"):
            with self.subTest(template_key=template_key):
                response = self.client.patch(
                    self.url(), headers=self.headers(), json={"template_key": template_key}
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.get_json()["template"]["template_key"], template_key)

    def test_upload_background_and_save_opacity(self):
        response = self.client.patch(
            self.url(),
            headers=self.headers(),
            data={
                "template_key": "natural",
                "theme": '{"background_opacity": 0.45}',
                "background": (BytesIO(WEBP_BYTES), "texture.webp", "image/webp"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 200)
        theme = response.get_json()["template"]["theme"]
        self.assertEqual(theme["background_opacity"], 0.45)
        self.assertIn("/background", theme["background_image_url"])
        background_response = self.client.get(theme["background_image_url"], headers=self.headers())
        self.assertEqual(background_response.data, WEBP_BYTES)
        background_response.close()

        response = self.client.patch(
            self.url(), headers=self.headers(), json={"remove_background": True}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.get_json()["template"]["theme"]["background_image_url"])
        self.assertEqual(list(Path(self.backgrounds.name).iterdir()), [])

    def test_reject_invalid_template_font_colors_booleans_and_fields(self):
        invalid_payloads = [
            {"template_key": "unknown"},
            {"theme": {"font_key": "comic-sans"}},
            {"theme": {"background_color": "red"}},
            {"theme": {"show_cover": "true"}},
            {"theme": {"background_opacity": "0.5"}},
            {"theme": {"background_opacity": -0.1}},
            {"theme": {"background_opacity": 1.1}},
            {"theme": {"custom_css": "body{}"}},
            {"unknown": True},
            {"theme": {"background_color": "#FFFFFF", "text_color": "#FFFFFF"}},
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                response = self.client.patch(self.url(), headers=self.headers(), json=payload)
                self.assertEqual(response.status_code, 400)

    def test_business_catalogue_and_user_scope(self):
        response = self.client.get(
            self.url(catalogue_id=self.second_catalogue_id),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)
        response = self.client.get(
            self.url(catalogue_id=self.catalogue_id, business_id=self.foreign_business_id),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 403)
        response = self.client.get(
            self.url(catalogue_id=self.foreign_catalogue_id, business_id=self.foreign_business_id),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 403)
        response = self.client.get(self.url(), headers=self.headers(self.outsider_token))
        self.assertEqual(response.status_code, 403)

    def test_catalogues_have_independent_configuration(self):
        response = self.client.patch(
            self.url(), headers=self.headers(), json={"template_key": "minimal"}
        )
        self.assertEqual(response.status_code, 200)
        first = self.client.get(self.url(), headers=self.headers()).get_json()["template"]
        second = self.client.get(
            self.url(catalogue_id=self.second_catalogue_id), headers=self.headers()
        ).get_json()["template"]
        self.assertEqual(first["template_key"], "minimal")
        self.assertEqual(second["template_key"], "modern")

    def test_upload_serve_replace_and_remove_cover(self):
        response = self.client.patch(
            self.url(),
            headers=self.headers(),
            data={
                "template_key": "modern",
                "theme": "{}",
                "cover": (BytesIO(JPEG_BYTES), "cover.jpg", "image/jpeg"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 200)
        cover_url = response.get_json()["template"]["theme"]["cover_image_url"]
        self.assertEqual(self.client.get(cover_url).status_code, 401)
        self.assertEqual(
            self.client.get(cover_url, headers=self.headers(self.outsider_token)).status_code,
            404,
        )
        cover_response = self.client.get(cover_url, headers=self.headers())
        self.assertEqual(cover_response.data, JPEG_BYTES)
        cover_response.close()
        stored_files = list(Path(self.covers.name).iterdir())
        self.assertEqual(len(stored_files), 1)
        stored_cover = stored_files[0]

        response = self.client.patch(
            self.url(),
            headers=self.headers(),
            data={"template_key": "modern", "theme": "{}", "remove_cover": "true"},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.get_json()["template"]["theme"]["cover_image_url"])
        self.assertFalse(stored_cover.exists())

    def test_rejects_executable_content_disguised_as_image(self):
        response = self.client.patch(
            self.url(),
            headers=self.headers(),
            data={
                "theme": "{}",
                "cover": (BytesIO(b"MZ-not-really-an-image"), "malware.jpg", "image/jpeg"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(list(Path(self.covers.name).iterdir()), [])
        self.assertNotIn("traceback", response.get_data(as_text=True).lower())

    def test_database_error_rolls_back_without_exposing_details(self):
        with patch.object(db.session, "commit", side_effect=SQLAlchemyError("private database detail")):
            response = self.client.patch(
                self.url(), headers=self.headers(), json={"template_key": "minimal"}
            )
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("private database detail", response.get_data(as_text=True))
        with self.app.app_context():
            self.assertEqual(CatalogueTemplate.query.count(), 0)


if __name__ == "__main__":
    unittest.main()
