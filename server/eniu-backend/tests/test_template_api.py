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
from tests.image_helpers import image_bytes, opened
from tests.plan_helpers import grant_plan

JPEG_BYTES = image_bytes("JPEG")
# Un WebP ya pequeño se guarda tal cual: es la ruta de paso directo de
# `app.images`, y por eso estas pruebas pueden comparar byte a byte.
WEBP_BYTES = image_bytes("WEBP")


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
        self.assertEqual(template["layout_key"], "modern")
        self.assertEqual(template["theme"]["background_color"], "#FFFDF5")
        self.assertTrue(template["theme"]["show_cover"])
        self.assertEqual(template["theme"]["color_preset_key"], "classic")
        self.assertEqual(template["theme"]["tokens"]["nav_chip_bg"], "#FFE05A")

    def test_templates_catalog_lists_layouts_palettes_fonts_and_tokens(self):
        response = self.client.get("/api/templates")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual({layout["key"] for layout in body["layouts"]}, {
            "modern", "minimal", "elegant", "bistro", "bold", "natural", "retro", "luxury",
        })
        self.assertEqual({palette["key"] for palette in body["palettes"]}, {"classic", "midnight", "vineyard"})
        self.assertEqual({font["key"] for font in body["fonts"]}, {"inter", "poppins", "montserrat", "playfair", "lora"})
        self.assertIn("nav_chip_text", {token["key"] for token in body["color_tokens"]})

    def test_save_with_a_curated_palette_mirrors_its_core_colors(self):
        response = self.client.patch(
            self.url(), headers=self.headers(), json={"color_preset_key": "midnight"}
        )
        self.assertEqual(response.status_code, 200)
        theme = response.get_json()["template"]["theme"]
        self.assertEqual(theme["color_preset_key"], "midnight")
        self.assertEqual(theme["background_color"], "#18140D")
        self.assertEqual(theme["tokens"]["nav_chip_text"], "#18140D")
        self.assertEqual(theme["theme_overrides"], {})

    def test_save_with_advanced_overrides_clears_the_palette(self):
        response = self.client.patch(
            self.url(), headers=self.headers(),
            # `nav_chip_text` oscuro sobre el dorado por defecto de
            # `nav_chip_bg`: pasa el contraste igual que el negro que ya
            # usaba `text_color` sobre ese mismo dorado.
            json={"theme_overrides": {"price": "#7A1F2B", "nav_chip_text": "#111111"}},
        )
        self.assertEqual(response.status_code, 200)
        theme = response.get_json()["template"]["theme"]
        self.assertIsNone(theme["color_preset_key"])
        self.assertEqual(theme["tokens"]["price"], "#7A1F2B")
        self.assertEqual(theme["tokens"]["nav_chip_text"], "#111111")
        # Los que no se tocaron siguen viniendo de la paleta por defecto.
        self.assertEqual(theme["tokens"]["surface"], "#FFFDF5")

    def test_rejects_unknown_palette_and_override_tokens(self):
        for payload in (
            {"color_preset_key": "neon"},
            {"theme_overrides": {"primary": "#FFE05A"}},
            {"theme_overrides": {"price": "not-a-color"}},
            # Blanco sobre el dorado por defecto: no contrasta lo suficiente.
            {"theme_overrides": {"nav_chip_text": "#FFFFFF"}},
        ):
            with self.subTest(payload=payload):
                response = self.client.patch(self.url(), headers=self.headers(), json=payload)
                self.assertEqual(response.status_code, 400)

    def test_a_curated_palette_with_independent_chip_text_is_allowed_to_save(self):
        # Antes de desacoplar `nav_chip_text` de `text_color`, esta paleta
        # (texto claro en general, pero oscuro sobre el chip dorado) hubiera
        # chocado con la regla vieja de "texto vs. principal".
        response = self.client.patch(
            self.url(), headers=self.headers(), json={"color_preset_key": "midnight"}
        )
        self.assertEqual(response.status_code, 200)

    def test_layout_key_is_accepted_as_the_new_name_for_template_key(self):
        response = self.client.patch(
            self.url(), headers=self.headers(), json={"layout_key": "bistro"}
        )
        self.assertEqual(response.status_code, 200)
        template = response.get_json()["template"]
        self.assertEqual(template["template_key"], "bistro")
        self.assertEqual(template["layout_key"], "bistro")

    def test_changing_the_four_core_colors_re_derives_the_extra_tokens(self):
        response = self.client.patch(
            self.url(), headers=self.headers(),
            json={"theme": {
                "background_color": "#000000", "primary_color": "#222222",
                "accent_color": "#0000FF", "text_color": "#FFFFFF",
            }},
        )
        self.assertEqual(response.status_code, 200)
        theme = response.get_json()["template"]["theme"]
        self.assertIsNone(theme["color_preset_key"])
        self.assertEqual(theme["tokens"]["price"], "#FFFFFF")
        self.assertEqual(theme["tokens"]["nav_chip_bg"], "#222222")
        self.assertEqual(theme["tokens"]["surface"], "#000000")

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
        # El JPEG se guarda convertido: lo que sirve el menú es siempre WebP,
        # que es lo que hace predecible el peso por escaneo.
        self.assertEqual(opened(cover_response.data).format, "WEBP")
        cover_response.close()
        self.assertTrue(cover_url.endswith("/cover"))
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
