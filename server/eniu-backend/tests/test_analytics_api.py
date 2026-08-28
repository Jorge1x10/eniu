import unittest
from datetime import datetime, timedelta, timezone

from flask_jwt_extended import create_access_token

from app import create_app
from app.database.db import db
from app.modules.analytics.model import AnalyticsEvent
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.category.model import Category
from app.modules.products.model import Product
from app.modules.users.model import User
from tests.plan_helpers import grant_plan


class AnalyticsApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "JWT_SECRET_KEY": "analytics-jwt-secret-at-least-32-bytes",
            "SECRET_KEY": "analytics-app-secret-at-least-32-bytes",
            "ANALYTICS_TOKEN_SECRET": "analytics-hmac-secret-at-least-32-bytes",
        })

    def setUp(self):
        with self.app.app_context():
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            db.drop_all(); db.create_all()
            owner = User(email="analytics-owner@example.com")
            outsider = User(email="analytics-outsider@example.com")
            db.session.add_all([owner, outsider]); db.session.flush()
            business = Business(name="Café", owner_id=owner.id)
            foreign_business = Business(name="Otro", owner_id=outsider.id)
            db.session.add_all([business, foreign_business]); db.session.flush()
            catalogue = Catalogue(name="Menú", business_id=business.id, public_slug="cafe-menu", is_published=True)
            second = Catalogue(name="Cena", business_id=business.id, public_slug="cafe-cena", is_published=True)
            foreign = Catalogue(name="Ajeno", business_id=foreign_business.id, public_slug="ajeno", is_published=True)
            draft = Catalogue(name="Borrador", business_id=business.id, public_slug="borrador", is_published=False)
            db.session.add_all([catalogue, second, foreign, draft]); db.session.flush()
            category = Category(name="Bebidas", catalogue_id=catalogue.id)
            other_category = Category(name="Cena", catalogue_id=second.id)
            db.session.add_all([category, other_category]); db.session.flush()
            product = Product(name="Latte", catalogue_id=catalogue.id, category_id=category.id, price=55)
            other_product = Product(name="Taco", catalogue_id=second.id, category_id=other_category.id)
            db.session.add_all([product, other_product]); db.session.commit()
            grant_plan(owner.id); grant_plan(outsider.id)
            self.owner_token = create_access_token(identity=str(owner.id)); self.outsider_token = create_access_token(identity=str(outsider.id))
            self.business_id = str(business.id); self.foreign_business_id = str(foreign_business.id)
            self.catalogue_id = str(catalogue.id); self.second_catalogue_id = str(second.id); self.foreign_catalogue_id = str(foreign.id)
        self.client = self.app.test_client()
        public = self.client.get("/api/public/menus/cafe-menu").get_json()["menu"]
        self.product_key = public["categories"][0]["products"][0]["tracking_key"]
        self.category_key = public["categories"][0]["tracking_key"]
        other = self.client.get("/api/public/menus/cafe-cena").get_json()["menu"]
        self.other_product_key = other["categories"][0]["products"][0]["tracking_key"]

    def tearDown(self):
        with self.app.app_context(): db.session.remove(); db.drop_all()

    def event(self, event_type="menu_view", session="session_abcdefghijkl", visitor="visitor_abcdefghijkl", occurred=None, source="qr", device="mobile", target_type=None, target_key=None):
        return {"type": event_type, "visitor_id": visitor, "session_id": session, "occurred_at": (occurred or datetime.now(timezone.utc)).isoformat(), "source": source, "device_type": device, "target_type": target_type, "target_key": target_key}

    def post(self, events, slug="cafe-menu"):
        return self.client.post(f"/api/public/menus/{slug}/analytics/events", json={"events": events})

    def private_url(self, business=None, catalogue=None, start=None, end=None):
        today = datetime.now(timezone.utc).date(); start = start or today - timedelta(days=2); end = end or today
        return f"/api/businesses/{business or self.business_id}/catalogues/{catalogue or self.catalogue_id}/analytics?from={start}&to={end}&timezone=UTC"

    def auth(self, token=None): return {"Authorization": f"Bearer {token or self.owner_token}"}

    def test_public_dto_adds_only_opaque_tracking_keys(self):
        response = self.client.get("/api/public/menus/cafe-menu")
        self.assertEqual(response.status_code, 200)
        self.assertRegex(self.product_key, r"^[0-9a-f]{64}$")
        self.assertRegex(self.category_key, r"^[0-9a-f]{64}$")
        self.assertNotIn(self.catalogue_id, response.get_data(as_text=True))

    def test_record_protect_and_deduplicate_valid_events(self):
        events = [self.event(), self.event("product_view", target_type="product", target_key=self.product_key), self.event("category_select", target_type="category", target_key=self.category_key)]
        self.assertEqual(self.post(events).status_code, 204)
        self.assertEqual(self.post(events).status_code, 204)
        with self.app.app_context():
            stored = AnalyticsEvent.query.all()
            self.assertEqual(len(stored), 3)
            self.assertTrue(all(item.visitor_hash != "visitor_abcdefghijkl" and item.session_hash != "session_abcdefghijkl" for item in stored))
            columns = set(AnalyticsEvent.__table__.columns.keys())
            self.assertFalse({"ip", "user_agent", "referrer", "email"} & columns)

    def test_same_product_is_allowed_in_another_session(self):
        first = self.event("product_view", target_type="product", target_key=self.product_key)
        second = self.event("product_view", session="session_second_abcdef", target_type="product", target_key=self.product_key)
        self.assertEqual(self.post([first, second]).status_code, 204)
        with self.app.app_context(): self.assertEqual(AnalyticsEvent.query.count(), 2)

    def test_public_validation_and_published_scope(self):
        self.assertEqual(self.post([self.event()], "missing").status_code, 404)
        self.assertEqual(self.post([self.event()], "borrador").status_code, 404)
        self.assertEqual(self.post([self.event()] * 21).status_code, 400)
        unknown = self.event(); unknown["type"] = "sale"
        self.assertEqual(self.post([unknown]).status_code, 400)
        extra = self.event(); extra["email"] = "private@example.com"
        self.assertEqual(self.post([extra]).status_code, 400)
        future = self.event(occurred=datetime.now(timezone.utc) + timedelta(hours=1))
        self.assertEqual(self.post([future]).status_code, 400)
        wrong = self.event("product_view", target_type="product", target_key=self.other_product_key)
        self.assertEqual(self.post([wrong]).status_code, 400)
        with self.app.app_context(): self.assertEqual(AnalyticsEvent.query.count(), 0)

    def test_invalid_event_rolls_back_the_complete_batch(self):
        invalid = self.event(); invalid["metadata"] = {"anything": True}
        self.assertEqual(self.post([self.event(), invalid]).status_code, 400)
        with self.app.app_context(): self.assertEqual(AnalyticsEvent.query.count(), 0)

    def test_private_endpoint_requires_auth_and_catalogue_scope(self):
        self.assertEqual(self.client.get(self.private_url()).status_code, 401)
        self.assertEqual(self.client.get(self.private_url(), headers=self.auth(self.outsider_token)).status_code, 403)
        self.assertEqual(self.client.get(self.private_url(catalogue=self.foreign_catalogue_id), headers=self.auth()).status_code, 404)
        self.assertEqual(self.client.get(self.private_url(self.foreign_business_id, self.foreign_catalogue_id), headers=self.auth()).status_code, 403)

    def test_aggregations_comparison_breakdowns_and_zero_days(self):
        now = datetime.now(timezone.utc).replace(microsecond=0)
        previous = now - timedelta(days=3)
        current_events = [
            self.event(occurred=now, source="qr", device="mobile"),
            self.event(session="session_current_two", visitor="visitor_current_two", occurred=now, source="copied_link", device="desktop"),
            self.event("product_view", occurred=now, target_type="product", target_key=self.product_key),
            self.event("category_select", occurred=now, target_type="category", target_key=self.category_key),
        ]
        self.assertEqual(self.post(current_events).status_code, 204)
        self.assertEqual(self.post([self.event(session="session_previous_x", occurred=previous)]).status_code, 204)
        response = self.client.get(self.private_url(), headers=self.auth())
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["summary"]["menu_views"]["value"], 2)
        self.assertEqual(data["summary"]["menu_views"]["previous_value"], 1)
        self.assertEqual(data["summary"]["menu_views"]["percentage_change"], 100.0)
        self.assertEqual(data["summary"]["approximate_unique_visitors"]["value"], 2)
        self.assertEqual(data["summary"]["product_interactions"]["value"], 1)
        self.assertEqual(data["top_products"][0]["name"], "Latte")
        self.assertEqual(data["top_categories"][0]["name"], "Bebidas")
        self.assertEqual(next(item for item in data["devices"] if item["key"] == "mobile")["views"], 1)
        self.assertEqual(next(item for item in data["sources"] if item["key"] == "qr")["views"], 1)
        self.assertEqual(len(data["visits_over_time"]), 3)
        self.assertTrue(any(item["views"] == 0 for item in data["visits_over_time"]))
        serialized = str(data)
        self.assertNotIn("visitor_hash", serialized); self.assertNotIn("tracking_key", serialized)

    def test_empty_catalogue_date_timezone_and_max_range_validation(self):
        response = self.client.get(self.private_url(catalogue=self.second_catalogue_id), headers=self.auth())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["summary"]["menu_views"]["value"], 0)
        bad_zone = self.private_url()[:-3] + "Not/AZone"
        self.assertEqual(self.client.get(bad_zone, headers=self.auth()).status_code, 400)
        today = datetime.now(timezone.utc).date()
        too_long = self.private_url(start=today - timedelta(days=91), end=today)
        self.assertEqual(self.client.get(too_long, headers=self.auth()).status_code, 400)


if __name__ == "__main__":
    unittest.main()
