import unittest
from uuid import UUID

from flask_jwt_extended import create_access_token

from app import create_app
from app.database.db import db
from app.modules.billing.model import BillingSubscription
from app.modules.billing.services import apply_free_plan_state
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.products.model import Product
from app.modules.template.model import CatalogueTemplate
from app.modules.users.model import User
from tests.plan_helpers import grant_plan


class PlanLimitsApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "plan-limits-tests-secret-at-least-32-bytes",
            "ANALYTICS_TOKEN_SECRET": "plan-limits-analytics-secret-32-bytes",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()

            free = User(email="gratis@example.com")
            paid = User(email="esencial@example.com")
            db.session.add_all([free, paid])
            db.session.flush()

            free_business = Business(name="Cafe gratuito", owner_id=free.id)
            paid_business = Business(name="Cafe de pago", owner_id=paid.id)
            db.session.add_all([free_business, paid_business])
            db.session.flush()

            free_catalogue = Catalogue(name="Menu principal", business_id=free_business.id)
            paid_catalogue = Catalogue(name="Menu principal", business_id=paid_business.id)
            db.session.add_all([free_catalogue, paid_catalogue])
            db.session.commit()

            grant_plan(paid.id)

            self.free_token = create_access_token(identity=str(free.id))
            self.paid_token = create_access_token(identity=str(paid.id))
            self.free_business_id = str(free_business.id)
            self.paid_business_id = str(paid_business.id)
            self.free_catalogue_id = str(free_catalogue.id)
            self.paid_catalogue_id = str(paid_catalogue.id)
            self.free_user_id = free.id

        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def headers(self, token):
        return {"Authorization": f"Bearer {token}"}

    def template_url(self, business_id, catalogue_id):
        return f"/api/businesses/{business_id}/catalogues/{catalogue_id}/template"

    # --- limites de creacion -------------------------------------------------

    def test_free_plan_allows_one_business_and_essential_allows_three(self):
        response = self.client.post("/api/businesses", json={"name": "Segundo"}, headers=self.headers(self.free_token))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["code"], "plan_limit")

        for name in ("Segundo", "Tercero"):
            allowed = self.client.post("/api/businesses", json={"name": name}, headers=self.headers(self.paid_token))
            self.assertEqual(allowed.status_code, 201)
        blocked = self.client.post("/api/businesses", json={"name": "Cuarto"}, headers=self.headers(self.paid_token))
        self.assertEqual(blocked.status_code, 403)

    def test_free_plan_allows_one_catalogue_per_business(self):
        response = self.client.post(
            f"/api/businesses/{self.free_business_id}/catalogues",
            json={"name": "Menu de cena"},
            headers=self.headers(self.free_token),
        )
        self.assertEqual(response.status_code, 403)

        allowed = self.client.post(
            f"/api/businesses/{self.paid_business_id}/catalogues",
            json={"name": "Menu de cena"},
            headers=self.headers(self.paid_token),
        )
        self.assertEqual(allowed.status_code, 201)

    def test_free_plan_stops_at_fifteen_products(self):
        with self.app.app_context():
            db.session.add_all([
                Product(name=f"Producto {index}", catalogue_id=UUID(self.free_catalogue_id), display_order=index)
                for index in range(15)
            ])
            db.session.commit()

        response = self.client.post(
            f"/api/businesses/{self.free_business_id}/catalogues/{self.free_catalogue_id}/products",
            json={"name": "El que sobra"},
            headers=self.headers(self.free_token),
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["limit"], 15)

    def test_analytics_are_reserved_for_paid_plans(self):
        blocked = self.client.get(
            f"/api/businesses/{self.free_business_id}/catalogues/{self.free_catalogue_id}/analytics",
            headers=self.headers(self.free_token),
        )
        self.assertEqual(blocked.status_code, 403)

        allowed = self.client.get(
            f"/api/businesses/{self.paid_business_id}/catalogues/{self.paid_catalogue_id}/analytics",
            headers=self.headers(self.paid_token),
        )
        self.assertEqual(allowed.status_code, 200)

    # --- personalizacion de la plantilla ------------------------------------

    def test_free_plan_keeps_colors_but_blocks_the_rest_of_the_design(self):
        url = self.template_url(self.free_business_id, self.free_catalogue_id)

        colors = self.client.patch(url, json={"theme": {"primary_color": "#FFD166"}}, headers=self.headers(self.free_token))
        self.assertEqual(colors.status_code, 200)

        for payload in (
            {"template_key": "luxury"},
            {"theme": {"font_key": "playfair"}},
            {"theme": {"show_cover": True}},
            {"theme": {"background_opacity": 0.5}},
        ):
            with self.subTest(payload=payload):
                blocked = self.client.patch(url, json=payload, headers=self.headers(self.free_token))
                self.assertEqual(blocked.status_code, 403)
                self.assertEqual(blocked.get_json()["code"], "plan_limit")

    def test_paid_plan_unlocks_the_whole_design(self):
        url = self.template_url(self.paid_business_id, self.paid_catalogue_id)
        response = self.client.patch(
            url,
            json={"template_key": "luxury", "theme": {"font_key": "playfair", "background_opacity": 0.5}},
            headers=self.headers(self.paid_token),
        )
        self.assertEqual(response.status_code, 200)

    # --- menu publico --------------------------------------------------------

    def test_public_menu_falls_back_to_the_basic_design_on_the_free_plan(self):
        with self.app.app_context():
            catalogue = db.session.get(Catalogue, UUID(self.free_catalogue_id))
            catalogue.is_published = True
            catalogue.public_slug = "cafe-gratuito"
            db.session.add(CatalogueTemplate(
                catalogue_id=catalogue.id,
                template_key="luxury",
                font_key="playfair",
                show_cover=True,
                cover_filename="portada.png",
            ))
            db.session.commit()

        menu = self.client.get("/api/public/menus/cafe-gratuito").get_json()["menu"]
        self.assertEqual(menu["template"]["key"], "modern")
        self.assertEqual(menu["template"]["theme"]["font_key"], "inter")
        self.assertFalse(menu["template"]["theme"]["show_cover"])
        self.assertIsNone(menu["template"]["theme"]["cover_image_url"])
        self.assertTrue(menu["branding"]["show_eniu_badge"])

    def test_public_menu_keeps_the_design_and_drops_the_badge_when_paid(self):
        with self.app.app_context():
            catalogue = db.session.get(Catalogue, UUID(self.paid_catalogue_id))
            catalogue.is_published = True
            catalogue.public_slug = "cafe-de-pago"
            db.session.add(CatalogueTemplate(
                catalogue_id=catalogue.id,
                template_key="luxury",
                font_key="playfair",
            ))
            db.session.commit()

        menu = self.client.get("/api/public/menus/cafe-de-pago").get_json()["menu"]
        self.assertEqual(menu["template"]["key"], "luxury")
        self.assertEqual(menu["template"]["theme"]["font_key"], "playfair")
        self.assertFalse(menu["branding"]["show_eniu_badge"])

    # --- bajada de plan ------------------------------------------------------

    def test_downgrade_unpublishes_everything_and_keeps_only_the_last_business(self):
        with self.app.app_context():
            owner = db.session.get(User, self.free_user_id)
            newest = Business(name="El mas reciente", owner_id=owner.id)
            db.session.add(newest)
            db.session.flush()
            newest_catalogue = Catalogue(
                name="Menu nuevo", business_id=newest.id,
                is_published=True, public_slug="menu-nuevo",
            )
            old_catalogue = db.session.get(Catalogue, UUID(self.free_catalogue_id))
            old_catalogue.is_published = True
            old_catalogue.public_slug = "menu-viejo"
            db.session.add(newest_catalogue)
            db.session.commit()

            apply_free_plan_state(owner)
            db.session.commit()

            businesses = Business.query.filter_by(owner_id=owner.id).all()
            active = [business for business in businesses if business.is_active]
            self.assertEqual(len(active), 1)
            self.assertEqual(active[0].name, "El mas reciente")

            catalogues = Catalogue.query.filter(
                Catalogue.business_id.in_([business.id for business in businesses])
            ).all()
            self.assertTrue(all(not catalogue.is_published for catalogue in catalogues))
            # El slug sobrevive: republicar recupera la misma URL y el QR impreso sigue sirviendo.
            self.assertEqual(
                {catalogue.public_slug for catalogue in catalogues},
                {"menu-viejo", "menu-nuevo"},
            )

    def test_a_failed_payment_applies_free_limits(self):
        with self.app.app_context():
            self.assertIsNone(BillingSubscription.query.filter_by(user_id=self.free_user_id).first())
            grant_plan(self.free_user_id, status="past_due")

        response = self.client.post("/api/businesses", json={"name": "Segundo"}, headers=self.headers(self.free_token))
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
