"""Pruebas del estudio que no necesitan servidor ni base de datos.

    python -m unittest discover tools/eniu-studio/tests
"""

import io
import sys
import unittest
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from eniu_studio import images, traffic  # noqa: E402

ZONE = "America/Mexico_City"
NOW = datetime(2026, 10, 22, 18, 30, tzinfo=timezone.utc)  # jueves, 12:30 en CDMX
PUBLIC_MENU = {
    "menu": {
        "categories": [
            {
                "name": "Tacos",
                "tracking_key": "cat-tacos",
                "products": [
                    {"name": "Tacos de birria", "tracking_key": "p-birria"},
                    {"name": "Tacos al pastor", "tracking_key": "p-pastor"},
                    {"name": "Tacos de canasta", "tracking_key": "p-canasta", "is_available": False},
                ],
            },
            {
                "name": "Bebidas",
                "tracking_key": "cat-bebidas",
                "products": [{"name": "Agua de jamaica", "tracking_key": "p-jamaica"}],
            },
        ],
    },
}
POPULARITY = {"Tacos de birria": 10, "Tacos al pastor": 6, "Tacos de canasta": 5, "Agua de jamaica": 2}


def _targets():
    return traffic.targets_from_public_menu(PUBLIC_MENU, POPULARITY)


class GuessKindTestCase(unittest.TestCase):
    def test_dishes_get_the_photo_of_their_kind(self):
        cases = {
            "Tacos de birria": "taco",
            "Quesabirria": "taco",
            "Enchiladas verdes": "taco",
            "Hamburguesas clásicas": "burger",
            "Pizza margarita": "pizza",
            "Sopa de tortilla": "soup",
            "Crema de elote": "soup",
            "Guacamole con totopos": "guac",
            "Chilaquiles rojos": "guac",
            "Papas fritas": "fries",
            "Flan de vainilla": "dessert",
            "Pan de elote": "dessert",
            "Agua de jamaica": "drink",
            "Té helado": "drink",
            "Café de olla": "coffee",
            "Molletes": "plate",
        }
        self.assertEqual({name: images.guess_kind(name) for name in cases}, cases)

    def test_short_words_only_match_whole_words(self):
        # "te" (té) no debe convertir en bebida todo lo que lleve "elote" o "tomate".
        self.assertNotEqual(images.guess_kind("Esquite con elote"), "drink")

    def test_the_photo_is_a_jpeg_of_the_requested_size(self):
        filename, data, mimetype = images.food_photo("Tacos al pastor", size=(400, 300))
        self.assertTrue(filename.endswith(".jpg"))
        self.assertEqual(mimetype, "image/jpeg")
        with Image.open(io.BytesIO(data)) as photo:
            self.assertEqual((photo.format, photo.size), ("JPEG", (400, 300)))


class PublicMenuTargetsTestCase(unittest.TestCase):
    def test_popularity_sets_the_weights_and_sold_out_products_weigh_less(self):
        products, categories = _targets()
        weights = {product.name: product.weight for product in products}
        self.assertEqual(weights["Tacos de birria"], 10)
        self.assertAlmostEqual(weights["Tacos de canasta"], 2.0)
        self.assertEqual([product.key for product in products][:2], ["p-birria", "p-pastor"])
        # Una categoría pesa lo que pesan sus platillos.
        by_name = {category.name: category.weight for category in categories}
        self.assertGreater(by_name["Tacos"], by_name["Bebidas"])


class GenerateTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        products, categories = _targets()
        cls.plan = traffic.Traffic(days=30, daily_views=30, seed=4)
        cls.events = traffic.generate("menu-1", cls.plan, products, categories, ZONE, now=NOW)

    def test_every_event_is_marked_as_seeded(self):
        self.assertTrue(all(event["dedup_key"].startswith(traffic.SEED_PREFIX) for event in self.events))
        self.assertEqual(len({event["dedup_key"] for event in self.events}), len(self.events))

    def test_nothing_happens_after_the_end_of_today(self):
        last = max(event["occurred_at"] for event in self.events).astimezone(ZoneInfo(ZONE))
        self.assertLessEqual(last.date(), NOW.astimezone(ZoneInfo(ZONE)).date())

    def test_the_busiest_hours_are_lunch_and_dinner_in_the_business_timezone(self):
        hours = Counter(
            event["occurred_at"].astimezone(ZoneInfo(ZONE)).hour
            for event in self.events if event["event_type"] == "menu_view"
        )
        busiest = {hour for hour, _count in hours.most_common(3)}
        self.assertTrue(busiest <= {12, 13, 14, 15, 19, 20, 21}, hours.most_common(5))

    def test_regulars_come_back(self):
        views = [event for event in self.events if event["event_type"] == "menu_view"]
        self.assertLess(len({event["visitor_hash"] for event in views}), len(views))

    def test_the_same_seed_gives_the_same_traffic(self):
        products, categories = _targets()
        again = traffic.generate("menu-1", self.plan, products, categories, ZONE, now=NOW)
        shape = lambda events: [(e["event_type"], e["occurred_at"], e["target_key"]) for e in events]  # noqa: E731
        self.assertEqual(shape(again), shape(self.events))


class ScreenshotGuaranteesTestCase(unittest.TestCase):
    def test_visits_grow_and_the_star_dish_is_on_top(self):
        products, categories = _targets()
        events, checks = traffic.generate_for_screenshots(
            "menu-1", traffic.Traffic(days=60, daily_views=25, seed=1), products, categories, ZONE, now=NOW,
        )
        self.assertGreaterEqual(checks["growth_7d"], 8)
        self.assertGreaterEqual(checks["growth_30d"], 12)
        self.assertEqual(traffic.top_product(events), "p-birria")

    def test_comparisons_without_a_full_previous_period_are_not_reported(self):
        products, categories = _targets()
        _events, checks = traffic.generate_for_screenshots(
            "menu-1", traffic.Traffic(days=20, daily_views=10, seed=1), products, categories, ZONE, now=NOW,
        )
        self.assertIsNotNone(checks["growth_7d"])
        self.assertIsNone(checks["growth_30d"])


if __name__ == "__main__":
    unittest.main()
