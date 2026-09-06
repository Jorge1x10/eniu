import unittest
from datetime import date, timedelta

from flask_jwt_extended import create_access_token

from app import create_app
from app.database.db import db
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.category.model import Category
from app.modules.products.model import Product
from app.modules.promotion.model import Promotion
from app.modules.promotion.services import active_product_ids_today
from app.modules.users.model import User
from tests.plan_helpers import grant_plan


class PromotionApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "promotion-tests-secret-at-least-32-bytes",
        })

    def setUp(self):
        with self.app.app_context():
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            db.drop_all()
            db.create_all()
            owner = User(email="promo-owner@example.com")
            outsider = User(email="promo-outsider@example.com")
            db.session.add_all([owner, outsider])
            db.session.flush()
            business = Business(name="Restaurante", owner_id=owner.id)
            foreign_business = Business(name="Ajeno", owner_id=outsider.id)
            db.session.add_all([business, foreign_business])
            db.session.flush()
            catalogue = Catalogue(name="Principal", business_id=business.id)
            foreign_catalogue = Catalogue(name="Ajeno", business_id=foreign_business.id)
            db.session.add_all([catalogue, foreign_catalogue])
            db.session.flush()
            drinks = Category(name="Bebidas", catalogue_id=catalogue.id)
            desserts = Category(name="Postres", catalogue_id=catalogue.id)
            db.session.add_all([drinks, desserts])
            db.session.flush()
            latte = Product(name="Latte", catalogue_id=catalogue.id, category_id=drinks.id, price=68)
            cake = Product(name="Pastel", catalogue_id=catalogue.id, category_id=desserts.id, price=95)
            db.session.add_all([latte, cake])
            db.session.commit()
            grant_plan(owner.id)
            grant_plan(outsider.id)
            self.owner_token = create_access_token(identity=str(owner.id))
            self.outsider_token = create_access_token(identity=str(outsider.id))
            self.business_id = str(business.id)
            self.foreign_business_id = str(foreign_business.id)
            self.catalogue_id = str(catalogue.id)
            self.foreign_catalogue_id = str(foreign_catalogue.id)
            self.drinks_id = str(drinks.id)
            self.desserts_id = str(desserts.id)
            self.latte_id = str(latte.id)
            self.cake_id = str(cake.id)

        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def url(self, promotion_id=None):
        base = f"/api/businesses/{self.business_id}/catalogues/{self.catalogue_id}/promotions"
        return f"{base}/{promotion_id}" if promotion_id else base

    def headers(self, token=None):
        return {"Authorization": f"Bearer {token or self.owner_token}"}

    def test_create_list_update_delete_a_promotion(self):
        response = self.client.post(self.url(), headers=self.headers(), json={
            "name": "Martes de café", "badge_label": "2x1",
            "days_of_week": [1], "product_ids": [self.latte_id],
        })
        self.assertEqual(response.status_code, 201)
        promotion = response.get_json()["promotion"]
        self.assertEqual(promotion["name"], "Martes de café")
        self.assertEqual(promotion["badge_label"], "2x1")
        self.assertEqual(promotion["days_of_week"], [1])
        self.assertEqual(promotion["product_ids"], [self.latte_id])
        self.assertTrue(promotion["is_active"])
        promotion_id = promotion["id"]

        listed = self.client.get(self.url(), headers=self.headers())
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.get_json()["promotions"]), 1)

        updated = self.client.patch(self.url(promotion_id), headers=self.headers(), json={
            "is_active": False, "category_ids": [self.desserts_id],
        })
        self.assertEqual(updated.status_code, 200)
        updated_promotion = updated.get_json()["promotion"]
        self.assertFalse(updated_promotion["is_active"])
        self.assertEqual(updated_promotion["category_ids"], [self.desserts_id])

        deleted = self.client.delete(self.url(promotion_id), headers=self.headers())
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(len(self.client.get(self.url(), headers=self.headers()).get_json()["promotions"]), 0)

    def test_rejects_invalid_fields(self):
        for payload in (
            {"badge_label": "2x1"},  # falta el nombre
            {"name": "x" * 65},
            {"name": "Promo", "days_of_week": [7]},
            {"name": "Promo", "days_of_week": ["lunes"]},
            {"name": "Promo", "start_date": "2026-12-25", "end_date": "2026-01-01"},
            {"name": "Promo", "product_ids": ["00000000-0000-0000-0000-000000000000"]},
            {"name": "Promo", "category_ids": ["00000000-0000-0000-0000-000000000000"]},
            {"name": "Promo", "unknown_field": True},
        ):
            with self.subTest(payload=payload):
                response = self.client.post(self.url(), headers=self.headers(), json=payload)
                self.assertEqual(response.status_code, 400)

    def test_scoped_to_owner_and_catalogue(self):
        create = self.client.post(self.url(), headers=self.headers(), json={"name": "Promo"})
        promotion_id = create.get_json()["promotion"]["id"]

        outsider_list = self.client.get(self.url(), headers=self.headers(self.outsider_token))
        self.assertEqual(outsider_list.status_code, 403)

        self.assertEqual(
            self.client.patch(self.url(promotion_id), headers=self.headers(self.outsider_token), json={"name": "x"}).status_code,
            403,
        )

    def test_active_product_ids_today_combines_products_and_categories(self):
        with self.app.app_context():
            catalogue = Catalogue.query.filter_by(name="Principal").one()
            latte = Product.query.filter_by(name="Latte").one()
            cake = Product.query.filter_by(name="Pastel").one()
            desserts = Category.query.filter_by(name="Postres").one()

            db.session.add(Promotion(
                catalogue_id=catalogue.id, name="Todos los días", badge_label="Especial",
                days_of_week=[], products=[latte],
            ))
            db.session.add(Promotion(
                catalogue_id=catalogue.id, name="Postres siempre", categories=[desserts],
            ))
            db.session.commit()

            labels = active_product_ids_today(catalogue.id, today=date(2026, 9, 3))
            self.assertEqual(labels.get(latte.id), "Especial")
            self.assertIn(cake.id, labels)

    def test_inactive_and_out_of_range_promotions_do_not_apply(self):
        with self.app.app_context():
            catalogue = Catalogue.query.filter_by(name="Principal").one()
            latte = Product.query.filter_by(name="Latte").one()
            today = date(2026, 9, 3)

            db.session.add(Promotion(
                catalogue_id=catalogue.id, name="Desactivada", is_active=False, products=[latte],
            ))
            db.session.commit()
            self.assertEqual(active_product_ids_today(catalogue.id, today=today), {})

            db.session.query(Promotion).delete()
            db.session.add(Promotion(
                catalogue_id=catalogue.id, name="Fuera de rango",
                start_date=today + timedelta(days=1), products=[latte],
            ))
            db.session.commit()
            self.assertEqual(active_product_ids_today(catalogue.id, today=today), {})

            db.session.query(Promotion).delete()
            # Sólo aplica jueves (3) y hoy (2026-09-03) es jueves.
            db.session.add(Promotion(
                catalogue_id=catalogue.id, name="Sólo jueves", days_of_week=[3], products=[latte],
            ))
            db.session.commit()
            self.assertIn(latte.id, active_product_ids_today(catalogue.id, today=today))
            other_day = today + timedelta(days=1)
            self.assertEqual(active_product_ids_today(catalogue.id, today=other_day), {})

    def test_public_menu_marks_promoted_products_every_day(self):
        with self.app.app_context():
            catalogue = Catalogue.query.filter_by(name="Principal").one()
            catalogue.is_published = True
            catalogue.public_slug = "promo-cafe"
            db.session.add(Promotion(
                catalogue_id=catalogue.id, name="Siempre", badge_label="Oferta", days_of_week=[],
                products=[Product.query.filter_by(name="Latte").one()],
            ))
            db.session.commit()

        menu = self.client.get("/api/public/menus/promo-cafe").get_json()["menu"]
        products = [product for category in menu["categories"] for product in category["products"]]
        latte = next(product for product in products if product["name"] == "Latte")
        cake = next(product for product in products if product["name"] == "Pastel")
        self.assertEqual(latte["promo_label"], "Oferta")
        self.assertIsNone(cake["promo_label"])


if __name__ == "__main__":
    unittest.main()
