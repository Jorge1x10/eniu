"""Pedidos para llevar: desde el enlace del menú, sin mesa, y su cobro."""
from app.database.db import db
from app.modules.business.model import Business
from app.modules.ordering.model import TableAccount
from tests.test_ordering_api import ANA, DAVID, OrderingTestCase

SLUG = "cafe-luna-carta"


class TakeawayTestCase(OrderingTestCase):
    def setUp(self):
        super().setUp()
        self.keys = 0
        self.set_takeaway(True)

    # --- Ayudas -----------------------------------------------------------------

    def set_takeaway(self, value):
        response = self.client.patch(self.business_url("/ordering"), json={"takeaway": value}, headers=self.auth())
        self.assertEqual(response.status_code, 200, response.json)
        return response.json["ordering"]

    def takeaway(self, items, device=DAVID, name="David", phone="55 1234 5678", key=None, slug=SLUG, **extra):
        self.keys += 1
        body = {"diner_name": name, "phone": phone, "idempotency_key": key or f"llevar-{self.keys:04d}", "items": items, **extra}
        return self.client.post(f"/api/public/takeaway/{slug}/orders", json=body, headers={"X-Eniu-Diner": device})

    def my_orders(self, device=DAVID):
        return self.client.get(f"/api/public/takeaway/{SLUG}/orders", headers={"X-Eniu-Diner": device})

    def takeaway_account(self):
        return next(account for account in self.live()["accounts"] if account["channel"] == "takeaway")

    # --- Activación -----------------------------------------------------------------

    def test_el_menu_dice_si_acepta_pedidos_para_llevar(self):
        response = self.client.get(f"/api/public/takeaway/{SLUG}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["ordering"], {"enabled": True})
        self.assertEqual(response.json["business"]["name"], "Café Luna")
        self.assertEqual(response.headers["Cache-Control"], "no-store")

        self.set_takeaway(False)
        self.assertEqual(self.client.get(f"/api/public/takeaway/{SLUG}").json["ordering"], {"enabled": False})
        self.assertEqual(self.client.get("/api/public/takeaway/no-existe").status_code, 404)

    def test_el_menu_publico_ofrece_pedir_para_llevar(self):
        self.assertEqual(self.client.get(f"/api/public/menus/{SLUG}").json["menu"]["ordering"], {"takeaway": True})

    def test_apagado_no_recibe_pedidos(self):
        self.set_takeaway(False)
        response = self.takeaway([self.line("Latte")])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "ordering_disabled")

    def test_pausar_pedidos_pausa_tambien_los_para_llevar(self):
        self.client.patch(self.business_url("/ordering"), json={"enabled": False}, headers=self.auth())
        self.assertEqual(self.takeaway([self.line("Latte")]).json["code"], "ordering_disabled")

    def test_el_ajuste_se_ve_en_vivo(self):
        self.assertEqual(self.live()["ordering"]["takeaway"], True)
        self.assertEqual(self.set_takeaway(False)["takeaway"], False)
        for body in ({}, {"takeaway": "sí"}, {"enabled": 1}):
            with self.subTest(body=body):
                response = self.client.patch(self.business_url("/ordering"), json=body, headers=self.auth())
                self.assertEqual(response.status_code, 400)
        response = self.client.patch(self.business_url("/ordering"), json={"takeaway": True}, headers=self.auth(self.outsider_token))
        self.assertEqual(response.status_code, 403)

    # --- Pedir ------------------------------------------------------------------------

    def test_cada_pedido_abre_su_propia_cuenta_sin_mesa(self):
        first = self.takeaway([self.line("Latte", 2, notes="Sin azúcar")], phone="+52 (55) 1234-5678")
        self.assertEqual(first.status_code, 201, first.json)
        self.assertEqual(first.json["order"]["status"], "pending")
        self.assertEqual(first.json["order"]["account"]["status"], "open")
        second = self.takeaway([self.line("Americano")], device=ANA, name="Ana", phone="5587654321")
        self.assertEqual(second.status_code, 201)

        accounts = self.live()["accounts"]
        self.assertEqual(len(accounts), 2)
        david = next(account for account in accounts if account["customer"]["name"] == "David")
        self.assertEqual(david["channel"], "takeaway")
        self.assertIsNone(david["table"])
        self.assertEqual(david["customer"], {"name": "David", "phone": "+525512345678"})
        self.assertEqual(david["pending_orders"], 1)
        self.assertEqual(david["orders"][0]["items"][0]["notes"], "Sin azúcar")

    def test_valida_telefono_y_campos(self):
        for phone in (None, "", "123", "55-12ab-5678", "1" * 16):
            with self.subTest(phone=phone):
                response = self.takeaway([self.line("Latte")], phone=phone)
                self.assertEqual(response.status_code, 400, response.json)
        self.assertEqual(self.takeaway([self.line("Latte")], address="Calle 1").status_code, 400)
        self.assertEqual(self.takeaway([self.line("Latte")], name="  ").status_code, 400)
        self.assertEqual(self.takeaway([]).status_code, 400)
        self.assertEqual(self.client.post(f"/api/public/takeaway/{SLUG}/orders", json={}).status_code, 400)

    def test_solo_productos_que_se_pueden_pedir(self):
        response = self.takeaway([self.line("Latte"), {"product_key": "no-existe", "quantity": 1}])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "products_unavailable")

    def test_un_reintento_no_duplica_el_pedido(self):
        first = self.takeaway([self.line("Latte")], key="llevar-repetido")
        again = self.takeaway([self.line("Latte")], key="llevar-repetido")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(again.status_code, 200)
        self.assertEqual(len(self.live()["accounts"]), 1)

    def test_la_clave_de_un_pedido_de_mesa_no_sirve_para_llevar(self):
        table = self.create_table(4)
        self.order(self.qr_token(table), [self.line("Latte")], key="clave-compartida")
        response = self.takeaway([self.line("Latte")], key="clave-compartida")
        self.assertEqual(response.status_code, 409)

    def test_limita_los_pedidos_sin_aceptar_por_telefono(self):
        for _ in range(3):
            self.assertEqual(self.takeaway([self.line("Latte")]).status_code, 201)
        response = self.takeaway([self.line("Latte")])
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json["code"], "too_many_pending")
        # Otro teléfono sí puede pedir.
        self.assertEqual(self.takeaway([self.line("Latte")], device=ANA).status_code, 201)

    def test_menu_sin_publicar(self):
        line = self.line("Latte")
        with self.app.app_context():
            from app.modules.catalogue.model import Catalogue
            Catalogue.query.filter_by(public_slug=SLUG).update({"is_published": False})
            db.session.commit()
        self.assertEqual(self.takeaway([line]).status_code, 404)
        self.assertEqual(self.client.get(f"/api/public/takeaway/{SLUG}").status_code, 404)

    # --- Seguimiento del cliente ---------------------------------------------------

    def test_el_cliente_ve_sus_pedidos_y_su_estado(self):
        self.takeaway([self.line("Latte", 2)])
        self.takeaway([self.line("Americano")], device=ANA, name="Ana")
        mine = self.my_orders().json["orders"]
        self.assertEqual(len(mine), 1)
        self.assertEqual(mine[0]["diner_name"], "David")

        order_id = self.takeaway_account()["orders"][0]["id"]
        self.client.patch(self.business_url(f"/orders/{order_id}"), json={"status": "ready"}, headers=self.auth())
        mine = self.my_orders().json["orders"]
        self.assertEqual(mine[0]["status"], "ready")
        self.assertEqual(mine[0]["account"]["total"], "110.00")
        self.assertNotIn("id", mine[0])
        self.assertEqual(self.client.get(f"/api/public/takeaway/{SLUG}/orders").status_code, 400)

    # --- Negocio: atender y cobrar ---------------------------------------------------

    def test_se_atiende_y_se_cobra_como_una_mesa(self):
        self.takeaway([self.line("Latte", 2)])
        account = self.takeaway_account()
        order_id = account["orders"][0]["id"]
        for status in ("received", "preparing", "ready"):
            response = self.client.patch(self.business_url(f"/orders/{order_id}"), json={"status": status}, headers=self.auth())
            self.assertEqual(response.status_code, 200)

        self.client.post(self.business_url("/cash/open"), json={"opening_float": "0"}, headers=self.auth())
        response = self.client.post(
            self.business_url(f"/accounts/{account['id']}/checkout"),
            json={"payments": [{"method": "card", "amount": "110.00"}]},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(self.live()["accounts"], [])
        # Para el cliente queda entregado.
        self.assertEqual(self.my_orders().json["orders"][0]["account"]["status"], "closed")

        checkout = self.client.get(self.business_url("/cash"), headers=self.auth()).json["session"]["checkouts"][0]
        self.assertEqual(checkout["channel"], "takeaway")
        self.assertIsNone(checkout["table_number"])
        self.assertEqual(checkout["customer_name"], "David")

    def test_cerrar_sin_cobrar_aparece_en_el_corte(self):
        self.client.post(self.business_url("/cash/open"), json={}, headers=self.auth())
        self.takeaway([self.line("Latte")])
        account = self.takeaway_account()
        self.client.patch(self.business_url(f"/orders/{account['orders'][0]['id']}"), json={"status": "received"}, headers=self.auth())
        self.client.post(self.business_url(f"/accounts/{account['id']}/close"), headers=self.auth())
        unpaid = self.client.get(self.business_url("/cash"), headers=self.auth()).json["session"]["accounts_unpaid"]
        self.assertEqual(unpaid[0]["channel"], "takeaway")
        self.assertIsNone(unpaid[0]["table"])
        self.assertEqual(unpaid[0]["customer_name"], "David")

    def test_cuentas_de_mesa_y_para_llevar_conviven(self):
        table = self.create_table(4)
        self.order(self.qr_token(table), [self.line("Latte")])
        self.takeaway([self.line("Americano")], device=ANA, name="Ana")
        channels = sorted(account["channel"] for account in self.live()["accounts"])
        self.assertEqual(channels, ["table", "takeaway"])
        # Las estadísticas cuentan los dos.
        for account in self.live()["accounts"]:
            self.client.patch(self.business_url(f"/orders/{account['orders'][0]['id']}"), json={"status": "received"}, headers=self.auth())
        stats = self.client.get(self.business_url("/orders/stats"), headers=self.auth()).json
        self.assertEqual(stats["summary"]["orders"], 2)

    def test_la_base_exige_mesa_solo_en_cuentas_de_mesa(self):
        with self.app.app_context():
            business = db.session.get(Business, __import__("uuid").UUID(self.business_id))
            db.session.add(TableAccount(business_id=business.id, table_id=None, channel="table"))
            with self.assertRaises(Exception):
                db.session.flush()
            db.session.rollback()
