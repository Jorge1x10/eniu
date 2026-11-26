"""Pedidos desde la mesa: mesas, cuenta, pedidos, estados y límites."""
import unittest
from decimal import Decimal

from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

from app import create_app
from app.database.db import db
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.category.model import Category
from app.modules.ordering.model import Order, TableAccount
from app.modules.products.model import Product
from app.modules.users.model import User
from tests.plan_helpers import grant_plan

CONFIG = {
    "TESTING": True,
    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    "JWT_SECRET_KEY": "ordering-tests-secret-at-least-32-bytes",
    "ANALYTICS_TOKEN_SECRET": "ordering-analytics-secret-at-least-32",
    "PUBLIC_WEB_BASE_URL": "https://menu.example.test",
}

DAVID = "device-david-0123456789"
ANA = "device-ana-0123456789abc"


class OrderingTestCase(unittest.TestCase):
    config = CONFIG
    paid_owner = True

    @classmethod
    def setUpClass(cls):
        cls.app = create_app(dict(cls.config))

    def setUp(self):
        with self.app.app_context():
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            db.drop_all()
            db.create_all()
            owner = User(email="owner@example.com")
            outsider = User(email="outsider@example.com")
            db.session.add_all([owner, outsider])
            db.session.flush()
            business = Business(name="Café Luna", owner_id=owner.id, ordering_enabled=True)
            foreign = Business(name="Ajeno", owner_id=outsider.id)
            db.session.add_all([business, foreign])
            db.session.flush()
            catalogue = Catalogue(
                name="Carta", business_id=business.id, public_slug="cafe-luna-carta", is_published=True,
            )
            other = Catalogue(name="Otra", business_id=foreign.id, public_slug="ajeno-otra", is_published=True)
            db.session.add_all([catalogue, other])
            db.session.flush()
            drinks = Category(name="Bebidas", catalogue_id=catalogue.id)
            hidden = Category(name="Oculta", catalogue_id=catalogue.id, is_visible=False)
            db.session.add_all([drinks, hidden])
            db.session.flush()
            db.session.add_all([
                Product(name="Latte", price=Decimal("55.00"), catalogue_id=catalogue.id, category_id=drinks.id, display_order=0),
                Product(name="Americano", price=Decimal("40.00"), catalogue_id=catalogue.id, category_id=drinks.id, display_order=1),
                Product(name="Agotado", price=Decimal("30.00"), catalogue_id=catalogue.id, category_id=drinks.id, is_available=False, display_order=2),
                Product(name="Pesca del día", price=None, catalogue_id=catalogue.id, category_id=drinks.id, display_order=3),
                Product(name="Secreto", price=Decimal("99.00"), catalogue_id=catalogue.id, category_id=hidden.id),
                Product(name="Ajeno", price=Decimal("10.00"), catalogue_id=other.id),
            ])
            db.session.commit()
            # Los pedidos son de pago; la prueba gratuita tiene sus propias
            # pruebas en `FreeTrialTestCase`.
            if self.paid_owner:
                grant_plan(owner.id)
            self.owner_token = create_access_token(identity=str(owner.id))
            self.outsider_token = create_access_token(identity=str(outsider.id))
            self.business_id = str(business.id)
            self.catalogue_id = str(catalogue.id)
            self.foreign_catalogue_id = str(other.id)
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    # --- Ayudas -----------------------------------------------------------------

    def auth(self, token=None):
        return {"Authorization": f"Bearer {token or self.owner_token}"}

    def business_url(self, suffix=""):
        return f"/api/businesses/{self.business_id}{suffix}"

    def create_table(self, number=4, **extra):
        response = self.client.post(
            self.business_url("/tables"),
            json={"number": number, "catalogue_id": self.catalogue_id, **extra},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 201, response.json)
        return response.json["table"]

    def qr_token(self, table):
        return table["qr_url"].rsplit("/", 1)[-1]

    def product_keys(self):
        """Las claves tal como el comensal las ve en el menú público."""
        menu = self.client.get("/api/public/menus/cafe-luna-carta").json["menu"]
        keys = {}
        for category in menu["categories"]:
            for product in category["products"]:
                keys[product["name"]] = product["tracking_key"]
        for product in menu["uncategorized_products"]:
            keys[product["name"]] = product["tracking_key"]
        return keys

    def order(self, token, items, device=DAVID, name="David", key="pedido-0001"):
        return self.client.post(
            f"/api/public/tables/{token}/orders",
            json={"diner_name": name, "idempotency_key": key, "items": items},
            headers={"X-Eniu-Diner": device},
        )

    def line(self, product, quantity=1, notes=None):
        entry = {"product_key": self.product_keys()[product], "quantity": quantity}
        if notes is not None:
            entry["notes"] = notes
        return entry

    def live(self, version=None):
        suffix = "/orders/live" + (f"?version={version}" if version is not None else "")
        response = self.client.get(self.business_url(suffix), headers=self.auth())
        self.assertEqual(response.status_code, 200, response.json)
        return response.json

    def only_order_id(self):
        return self.live()["accounts"][0]["orders"][0]["id"]

    def set_status(self, order_id, status):
        return self.client.patch(
            self.business_url(f"/orders/{order_id}"), json={"status": status}, headers=self.auth(),
        )


class TableManagementTestCase(OrderingTestCase):
    def test_tables_get_a_qr_that_opens_their_menu(self):
        table = self.create_table(4, name="Terraza")
        self.assertEqual(table["number"], 4)
        self.assertEqual(table["name"], "Terraza")
        self.assertTrue(table["catalogue_published"])
        self.assertRegex(table["qr_url"], r"^https://menu\.example\.test/m/cafe-luna-carta/mesa/[A-Za-z0-9_-]{20,}$")
        listed = self.client.get(self.business_url("/tables"), headers=self.auth()).json["tables"]
        self.assertEqual([entry["number"] for entry in listed], [4])

    def test_table_numbers_are_unique_per_business(self):
        self.create_table(4)
        response = self.client.post(
            self.business_url("/tables"), json={"number": 4, "catalogue_id": self.catalogue_id}, headers=self.auth(),
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "duplicate_number")

    def test_a_table_cannot_open_another_business_menu(self):
        response = self.client.post(
            self.business_url("/tables"),
            json={"number": 1, "catalogue_id": self.foreign_catalogue_id},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_invalid_numbers_and_unknown_fields(self):
        for body in (
            {"number": 0, "catalogue_id": self.catalogue_id},
            {"number": True, "catalogue_id": self.catalogue_id},
            {"number": "4", "catalogue_id": self.catalogue_id},
            {"number": 4, "catalogue_id": self.catalogue_id, "qr_token": "elegido"},
        ):
            with self.subTest(body=body):
                response = self.client.post(self.business_url("/tables"), json=body, headers=self.auth())
                self.assertEqual(response.status_code, 400)

    def test_other_owners_cannot_see_or_change_tables(self):
        table = self.create_table()
        outsider = self.auth(self.outsider_token)
        self.assertEqual(self.client.get(self.business_url("/tables"), headers=outsider).status_code, 403)
        response = self.client.patch(self.business_url(f"/tables/{table['id']}"), json={"name": "x"}, headers=outsider)
        self.assertEqual(response.status_code, 403)

    def test_regenerating_the_qr_retires_the_printed_one(self):
        table = self.create_table()
        old_token = self.qr_token(table)
        response = self.client.post(self.business_url(f"/tables/{table['id']}/regenerate-qr"), headers=self.auth())
        new_token = self.qr_token(response.json["table"])
        self.assertNotEqual(old_token, new_token)
        self.assertEqual(self.client.get(f"/api/public/tables/{old_token}").status_code, 404)
        self.assertEqual(self.client.get(f"/api/public/tables/{new_token}").status_code, 200)

    def test_a_table_with_an_open_bill_cannot_be_deleted(self):
        table = self.create_table()
        self.order(self.qr_token(table), [self.line("Latte")])
        response = self.client.delete(self.business_url(f"/tables/{table['id']}"), headers=self.auth())
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "account_open")


class DinerOrderingTestCase(OrderingTestCase):
    def test_the_table_qr_says_which_menu_to_show_and_if_ordering_is_on(self):
        table = self.create_table(4, name="Terraza")
        response = self.client.get(f"/api/public/tables/{self.qr_token(table)}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["table"], {"number": 4, "name": "Terraza"})
        self.assertEqual(response.json["menu"]["public_slug"], "cafe-luna-carta")
        self.assertTrue(response.json["ordering"]["enabled"])
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_unknown_inactive_or_unpublished_tables_are_not_available(self):
        table = self.create_table()
        token = self.qr_token(table)
        self.assertEqual(self.client.get("/api/public/tables/no-existe").status_code, 404)
        self.client.patch(self.business_url(f"/tables/{table['id']}"), json={"is_active": False}, headers=self.auth())
        self.assertEqual(self.client.get(f"/api/public/tables/{token}").status_code, 404)
        self.client.patch(self.business_url(f"/tables/{table['id']}"), json={"is_active": True}, headers=self.auth())
        with self.app.app_context():
            db.session.get(Catalogue, __import__("uuid").UUID(self.catalogue_id)).is_published = False
            db.session.commit()
        self.assertEqual(self.client.get(f"/api/public/tables/{token}").status_code, 404)

    def test_the_first_order_opens_the_bill_and_the_server_sets_the_price(self):
        token = self.qr_token(self.create_table(4))
        response = self.order(token, [self.line("Latte", 2, notes="  Con leche de avena  "), self.line("Americano")])
        self.assertEqual(response.status_code, 201, response.json)
        order = response.json["order"]
        self.assertEqual(order["status"], "pending")
        self.assertEqual(order["diner_name"], "David")
        self.assertEqual(order["items"][0], {
            "name": "Latte", "quantity": 2, "unit_price": "55.00", "line_total": "110.00",
            "notes": "Con leche de avena", "is_cancelled": False,
        })
        self.assertEqual(order["total"], "150.00")
        self.assertNotIn("id", order)
        with self.app.app_context():
            self.assertEqual(TableAccount.query.count(), 1)

    def test_the_client_cannot_send_its_own_price(self):
        token = self.qr_token(self.create_table())
        item = {**self.line("Latte"), "unit_price": "0.01"}
        self.assertEqual(self.order(token, [item]).status_code, 400)

    def test_resending_the_same_order_does_not_duplicate_it(self):
        token = self.qr_token(self.create_table())
        first = self.order(token, [self.line("Latte")], key="doble-toque-1")
        second = self.order(token, [self.line("Latte")], key="doble-toque-1")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json["order"], second.json["order"])
        with self.app.app_context():
            self.assertEqual(Order.query.count(), 1)

    def test_only_what_the_menu_offers_can_be_ordered(self):
        token = self.qr_token(self.create_table())
        keys = self.product_keys()
        self.assertNotIn("Secreto", keys)  # Su categoría está oculta.
        for product in ("Agotado", "Pesca del día"):
            with self.subTest(product=product):
                response = self.order(token, [self.line("Latte"), self.line(product)], key=f"no-disponible-{len(product):02d}")
                self.assertEqual(response.status_code, 409)
                self.assertEqual(response.json["code"], "products_unavailable")
                self.assertEqual(response.json["product_keys"], [keys[product]])
        response = self.order(token, [{"product_key": "inventada", "quantity": 1}], key="inventada-1")
        self.assertEqual(response.status_code, 409)

    def test_validates_the_order_before_touching_the_bill(self):
        token = self.qr_token(self.create_table())
        latte = self.line("Latte")
        cases = {
            "sin nombre": {"diner_name": "  ", "idempotency_key": "valida-01", "items": [latte]},
            "sin productos": {"diner_name": "David", "idempotency_key": "valida-02", "items": []},
            "cantidad cero": {"diner_name": "David", "idempotency_key": "valida-03", "items": [{**latte, "quantity": 0}]},
            "cantidad 21": {"diner_name": "David", "idempotency_key": "valida-04", "items": [{**latte, "quantity": 21}]},
            "cantidad booleana": {"diner_name": "David", "idempotency_key": "valida-05", "items": [{**latte, "quantity": True}]},
            "notas largas": {"diner_name": "David", "idempotency_key": "valida-06", "items": [{**latte, "notes": "x" * 201}]},
            "31 líneas": {"diner_name": "David", "idempotency_key": "valida-07", "items": [latte] * 31},
            "clave corta": {"diner_name": "David", "idempotency_key": "abc", "items": [latte]},
        }
        for label, body in cases.items():
            with self.subTest(label):
                response = self.client.post(
                    f"/api/public/tables/{token}/orders", json=body, headers={"X-Eniu-Diner": DAVID},
                )
                self.assertEqual(response.status_code, 400)
        missing_device = self.client.post(
            f"/api/public/tables/{token}/orders",
            json={"diner_name": "David", "idempotency_key": "valida-08", "items": [latte]},
        )
        self.assertEqual(missing_device.status_code, 400)
        with self.app.app_context():
            self.assertEqual(TableAccount.query.count(), 0)

    def test_paused_ordering_still_shows_the_menu(self):
        table = self.create_table()
        token = self.qr_token(table)
        self.client.patch(self.business_url("/ordering"), json={"enabled": False}, headers=self.auth())
        self.assertFalse(self.client.get(f"/api/public/tables/{token}").json["ordering"]["enabled"])
        response = self.order(token, [self.line("Latte")])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "ordering_disabled")

    def test_everyone_at_the_table_adds_to_the_same_bill(self):
        token = self.qr_token(self.create_table(4))
        self.order(token, [self.line("Latte")], device=DAVID, name="David", key="david-0001")
        self.order(token, [self.line("Americano")], device=ANA, name="Ana", key="ana-00001")
        accounts = self.live()["accounts"]
        self.assertEqual(len(accounts), 1)
        self.assertEqual([order["diner_name"] for order in accounts[0]["orders"]], ["David", "Ana"])
        self.assertEqual(accounts[0]["table"]["number"], 4)

    def test_each_diner_cart_shows_only_their_own_orders(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")], device=DAVID, key="david-0001")
        self.order(token, [self.line("Americano")], device=ANA, name="Ana", key="ana-00001")
        response = self.client.get(f"/api/public/tables/{token}/orders", headers={"X-Eniu-Diner": ANA})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([order["diner_name"] for order in response.json["orders"]], ["Ana"])
        self.assertEqual(response.json["orders"][0]["idempotency_key"], "ana-00001")

    def test_the_cart_answers_cheaply_when_nothing_changed(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        headers = {"X-Eniu-Diner": DAVID}
        version = self.client.get(f"/api/public/tables/{token}/orders", headers=headers).json["account"]["version"]
        unchanged = self.client.get(f"/api/public/tables/{token}/orders?version={version}", headers=headers).json
        self.assertEqual(unchanged, {"changed": False, "version": version})
        self.set_status(self.only_order_id(), "received")
        changed = self.client.get(f"/api/public/tables/{token}/orders?version={version}", headers=headers).json
        self.assertEqual(changed["orders"][0]["status"], "received")

    def test_too_many_unconfirmed_orders_from_one_phone_are_refused(self):
        token = self.qr_token(self.create_table())
        for index in range(5):
            self.assertEqual(self.order(token, [self.line("Latte")], key=f"rafaga-{index:04d}").status_code, 201)
        response = self.order(token, [self.line("Latte")], key="rafaga-0005")
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json["code"], "too_many_pending")
        # Otro comensal de la mesa no se ve afectado.
        self.assertEqual(self.order(token, [self.line("Latte")], device=ANA, key="ana-00001").status_code, 201)


class BillTestCase(OrderingTestCase):
    def test_the_bill_shows_only_what_the_business_accepted_for_the_whole_table(self):
        token = self.qr_token(self.create_table(4))
        self.order(token, [self.line("Latte", 2)], device=DAVID, key="david-0001")
        self.order(token, [self.line("Americano")], device=ANA, name="Ana", key="ana-00001")
        david_order = self.live()["accounts"][0]["orders"][0]["id"]
        self.set_status(david_order, "received")

        response = self.client.get(f"/api/public/tables/{token}/account", headers={"X-Eniu-Diner": ANA})
        self.assertEqual(response.status_code, 200)
        bill = response.json["account"]
        self.assertEqual(bill["table"]["number"], 4)
        # Lo de Ana sigue pendiente: aún no está en la cuenta, pero ella ve la
        # de toda la mesa.
        self.assertEqual([(line["name"], line["diner_name"]) for line in bill["lines"]], [("Latte", "David")])
        self.assertEqual(bill["total"], "110.00")

    def test_a_photo_of_the_qr_is_not_enough_to_see_the_bill(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        stranger = "device-stranger-0123456789"
        response = self.client.get(f"/api/public/tables/{token}/account", headers={"X-Eniu-Diner": stranger})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json["code"], "no_account")

    def test_later_price_changes_do_not_change_the_bill(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        self.set_status(self.only_order_id(), "received")
        with self.app.app_context():
            Product.query.filter_by(name="Latte").first().price = Decimal("99.00")
            db.session.commit()
        self.assertEqual(self.live()["accounts"][0]["total"], "55.00")


class BusinessOrderFlowTestCase(OrderingTestCase):
    def test_live_orders_answer_cheaply_when_nothing_changed(self):
        token = self.qr_token(self.create_table())
        first = self.live()
        self.assertEqual(self.live(first["version"]), {"changed": False, "version": first["version"]})
        self.order(token, [self.line("Latte")])
        after = self.live(first["version"])
        self.assertTrue(after["changed"])
        self.assertGreater(after["version"], first["version"])
        self.assertEqual(after["accounts"][0]["pending_orders"], 1)
        self.assertEqual(after["accounts"][0]["total"], "0.00")  # Nada aceptado aún.

    def test_orders_only_move_forward(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        order_id = self.only_order_id()
        self.assertEqual(self.set_status(order_id, "received").status_code, 200)
        self.assertEqual(self.set_status(order_id, "preparing").status_code, 200)
        backwards = self.set_status(order_id, "received")
        self.assertEqual(backwards.status_code, 409)
        self.assertEqual(backwards.json["code"], "invalid_transition")
        ready = self.set_status(order_id, "ready").json["order"]
        self.assertEqual(ready["status"], "ready")
        self.assertIsNotNone(ready["ready_at"])
        self.assertEqual(self.set_status(order_id, "pending").status_code, 400)

    def test_skipping_ahead_also_marks_the_order_as_received(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        order = self.set_status(self.only_order_id(), "preparing").json["order"]
        self.assertIsNotNone(order["received_at"])
        self.assertIsNotNone(order["preparing_at"])

    def test_cancelling_one_item_takes_it_off_the_bill(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte", 2), self.line("Americano")])
        order = self.live()["accounts"][0]["orders"][0]
        self.set_status(order["id"], "received")
        americano = next(item for item in order["items"] if item["name"] == "Americano")
        response = self.client.post(
            self.business_url(f"/orders/{order['id']}/items/{americano['id']}/cancel"), headers=self.auth(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["order"]["status"], "received")
        self.assertEqual(response.json["order"]["total"], "110.00")
        self.assertEqual(self.live()["accounts"][0]["total"], "110.00")

    def test_cancelling_every_item_cancels_the_order(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        order = self.live()["accounts"][0]["orders"][0]
        response = self.client.post(
            self.business_url(f"/orders/{order['id']}/items/{order['items'][0]['id']}/cancel"), headers=self.auth(),
        )
        self.assertEqual(response.json["order"]["status"], "cancelled")
        self.assertEqual(self.set_status(order["id"], "received").json["code"], "order_cancelled")

    def test_the_whole_order_can_be_cancelled_at_once(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte"), self.line("Americano")])
        order = self.set_status(self.only_order_id(), "cancelled").json["order"]
        self.assertEqual(order["status"], "cancelled")
        self.assertTrue(all(item["is_cancelled"] for item in order["items"]))
        self.assertEqual(order["total"], "0.00")

    def test_closing_requires_deciding_on_pending_orders_first(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        account = self.live()["accounts"][0]
        url = self.business_url(f"/accounts/{account['id']}/close")
        refused = self.client.post(url, headers=self.auth())
        self.assertEqual(refused.status_code, 409)
        self.assertEqual(refused.json["code"], "pending_orders")
        self.set_status(account["orders"][0]["id"], "received")
        closed = self.client.post(url, headers=self.auth())
        self.assertEqual(closed.status_code, 200)
        self.assertEqual(closed.json["account"]["status"], "closed")
        self.assertEqual(closed.json["account"]["total"], "55.00")
        self.assertEqual(self.live()["accounts"], [])

    def test_after_closing_the_next_order_opens_a_new_bill(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")], key="primera-1")
        account = self.live()["accounts"][0]
        self.set_status(account["orders"][0]["id"], "received")
        self.client.post(self.business_url(f"/accounts/{account['id']}/close"), headers=self.auth())

        cart = self.client.get(f"/api/public/tables/{token}/orders", headers={"X-Eniu-Diner": DAVID}).json
        self.assertEqual(cart["account"]["status"], "closed")
        self.assertEqual(self.order(token, [self.line("Americano")], key="segunda-1").status_code, 201)
        accounts = self.live()["accounts"]
        self.assertEqual(len(accounts), 1)
        self.assertNotEqual(accounts[0]["id"], account["id"])
        self.assertEqual([order["items"][0]["name"] for order in accounts[0]["orders"]], ["Americano"])

    def test_closed_bills_cannot_be_changed(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        account = self.live()["accounts"][0]
        order_id = account["orders"][0]["id"]
        self.set_status(order_id, "received")
        self.client.post(self.business_url(f"/accounts/{account['id']}/close"), headers=self.auth())
        self.assertEqual(self.set_status(order_id, "ready").json["code"], "account_closed")

    def test_other_owners_cannot_touch_orders(self):
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")])
        order_id = self.only_order_id()
        outsider = self.auth(self.outsider_token)
        response = self.client.patch(self.business_url(f"/orders/{order_id}"), json={"status": "ready"}, headers=outsider)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.get(self.business_url("/orders/live"), headers=outsider).status_code, 403)

    def test_pausing_says_why_ordering_is_off(self):
        response = self.client.patch(self.business_url("/ordering"), json={"enabled": False}, headers=self.auth())
        self.assertEqual(response.json["ordering"], {"enabled": False, "reason": "paused", "takeaway": False, "delivery": False})
        self.assertEqual(self.live()["ordering"], {"enabled": False, "reason": "paused", "takeaway": False, "delivery": False})


class FreeTrialTestCase(OrderingTestCase):
    """Los pedidos son de pago; el gratuito sólo los tiene durante la prueba."""

    paid_owner = False

    def set_trial(self, value):
        self.app.config["ORDERS_FREE_PLAN_UNTIL"] = value

    def tearDown(self):
        self.app.config["ORDERS_FREE_PLAN_UNTIL"] = ""
        super().tearDown()

    def me(self):
        return self.client.get("/api/auth/me", headers=self.auth()).json["user"]["plan"]["limits"]

    def test_without_a_trial_the_free_plan_cannot_take_orders(self):
        self.set_trial("")
        token = self.qr_token(self.create_table())
        self.assertFalse(self.client.get(f"/api/public/tables/{token}").json["ordering"]["enabled"])
        self.assertEqual(self.order(token, [self.line("Latte")]).json["code"], "ordering_disabled")
        refused = self.client.patch(self.business_url("/ordering"), json={"enabled": True}, headers=self.auth())
        self.assertEqual(refused.status_code, 403)
        self.assertEqual(refused.json["code"], "plan_limit")
        self.assertEqual(self.live()["ordering"], {"enabled": False, "reason": "plan", "takeaway": False, "delivery": False})
        self.assertFalse(self.me()["allow_orders"])
        self.assertIsNone(self.me()["orders_free_until"])

    def test_during_the_trial_the_free_plan_takes_orders(self):
        self.set_trial("2999-12-31")
        token = self.qr_token(self.create_table())
        self.assertEqual(self.order(token, [self.line("Latte")]).status_code, 201)
        self.assertTrue(self.me()["allow_orders"])
        self.assertEqual(self.me()["orders_free_until"], "2999-12-31")

    def test_when_the_trial_ends_open_bills_can_still_be_finished(self):
        self.set_trial("2999-12-31")
        token = self.qr_token(self.create_table())
        self.order(token, [self.line("Latte")], key="antes-del-fin")
        account = self.live()["accounts"][0]

        self.set_trial("2000-01-01")
        self.assertEqual(self.order(token, [self.line("Latte")], key="despues-fin").json["code"], "ordering_disabled")
        # Lo que ya estaba en curso se atiende y se cobra con normalidad.
        self.assertEqual(self.set_status(account["orders"][0]["id"], "ready").status_code, 200)
        closed = self.client.post(self.business_url(f"/accounts/{account['id']}/close"), headers=self.auth())
        self.assertEqual(closed.status_code, 200)

    def test_an_unreadable_date_never_gives_the_feature_away(self):
        self.set_trial("31/12/2999")
        token = self.qr_token(self.create_table())
        self.assertFalse(self.client.get(f"/api/public/tables/{token}").json["ordering"]["enabled"])

    def test_paid_plans_do_not_depend_on_the_trial(self):
        self.set_trial("2000-01-01")
        with self.app.app_context():
            grant_plan(User.query.filter_by(email="owner@example.com").first().id)
        token = self.qr_token(self.create_table())
        self.assertEqual(self.order(token, [self.line("Latte")]).status_code, 201)
        self.assertTrue(self.me()["allow_orders"])
        self.assertIsNone(self.me()["orders_free_until"])


class OneOpenBillPerTableTestCase(OrderingTestCase):
    def test_the_database_refuses_a_second_open_bill(self):
        table = self.create_table()
        with self.app.app_context():
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            table_id = __import__("uuid").UUID(table["id"])
            business_id = __import__("uuid").UUID(self.business_id)
            db.session.add(TableAccount(table_id=table_id, business_id=business_id, status="open"))
            db.session.commit()
            db.session.add(TableAccount(table_id=table_id, business_id=business_id, status="open"))
            with self.assertRaises(IntegrityError):
                db.session.commit()
            db.session.rollback()
            # Cerradas puede haber todas las que hagan falta.
            db.session.add(TableAccount(table_id=table_id, business_id=business_id, status="closed"))
            db.session.add(TableAccount(table_id=table_id, business_id=business_id, status="closed"))
            db.session.commit()


class DinerRateLimitTestCase(OrderingTestCase):
    """Los límites del comensal van por teléfono: el Wi-Fi del local es una IP."""

    config = {**CONFIG, "RATELIMIT_ENABLED": True, "TRUSTED_PROXY_COUNT": 0}

    def test_one_phone_hitting_the_limit_does_not_block_the_rest_of_the_room(self):
        token = self.qr_token(self.create_table())
        bad_body = {"diner_name": "", "idempotency_key": "x", "items": []}

        def post(device):
            return self.client.post(
                f"/api/public/tables/{token}/orders", json=bad_body,
                headers={"X-Eniu-Diner": device}, environ_base={"REMOTE_ADDR": "203.0.113.50"},
            )

        statuses = [post(DAVID).status_code for _ in range(11)]
        self.assertEqual(statuses[:10], [400] * 10)
        self.assertEqual(statuses[10], 429)
        self.assertEqual(post(ANA).status_code, 400)


if __name__ == "__main__":
    unittest.main()
