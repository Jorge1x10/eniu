"""Pedidos a domicilio: ajustes del negocio, pedido, En camino y cobro."""
from tests.test_ordering_api import ANA, DAVID, OrderingTestCase

SLUG = "cafe-luna-carta"
ZONES = ["Roma Norte", "Condesa"]


class DeliveryTestCase(OrderingTestCase):
    def setUp(self):
        super().setUp()
        self.keys = 0
        self.configure(enabled=True, fee="35", min_order="100", zones=ZONES)

    # --- Ayudas -----------------------------------------------------------------

    def configure(self, **body):
        response = self.client.patch(self.business_url("/delivery"), json=body, headers=self.auth())
        self.assertEqual(response.status_code, 200, response.json)
        return response.json["delivery"]

    def deliver(self, items, device=DAVID, name="David", phone="5512345678", key=None, **delivery):
        self.keys += 1
        details = {"zone": "Roma Norte", "address": "Colima 120, depto 3", "references": "Portón negro", "pay_with": "cash", **delivery}
        body = {"diner_name": name, "phone": phone, "idempotency_key": key or f"domicilio-{self.keys:04d}", "items": items, "delivery": details}
        return self.client.post(f"/api/public/delivery/{SLUG}/orders", json=body, headers={"X-Eniu-Diner": device})

    def account(self):
        return next(account for account in self.live()["accounts"] if account["channel"] == "delivery")

    def set_status(self, order_id, status):
        return self.client.patch(self.business_url(f"/orders/{order_id}"), json={"status": status}, headers=self.auth())

    # --- Ajustes ------------------------------------------------------------------

    def test_ajustes_del_negocio(self):
        settings = self.client.get(self.business_url("/delivery"), headers=self.auth()).json["delivery"]
        self.assertEqual(settings, {"enabled": True, "fee": "35.00", "min_order": "100.00", "zones": ZONES})
        # Colonias sin vacías ni repetidas; sin mínimo.
        settings = self.configure(zones=["  Roma   Norte ", "roma norte", "", "Juárez"], min_order=None)
        self.assertEqual(settings["zones"], ["Roma Norte", "Juárez"])
        self.assertIsNone(settings["min_order"])
        self.assertEqual(self.live()["ordering"]["delivery"], True)

    def test_ajustes_invalidos(self):
        for body in ({}, {"fee": "-1"}, {"fee": "abc"}, {"enabled": "sí"}, {"zones": "Roma"}, {"zones": ["x" * 61]}, {"otro": 1}):
            with self.subTest(body=body):
                response = self.client.patch(self.business_url("/delivery"), json=body, headers=self.auth())
                self.assertEqual(response.status_code, 400, response.json)
        response = self.client.patch(self.business_url("/delivery"), json={"zones": []}, headers=self.auth())
        self.assertEqual(response.json["code"], "zones_required")
        response = self.client.patch(self.business_url("/delivery"), json={"enabled": True}, headers=self.auth(self.outsider_token))
        self.assertEqual(response.status_code, 403)

    def test_el_menu_publico_ofrece_domicilio(self):
        info = self.client.get(f"/api/public/takeaway/{SLUG}").json
        self.assertEqual(info["delivery"], {"enabled": True, "fee": "35.00", "min_order": "100.00", "zones": ZONES})
        self.assertEqual(self.client.get(f"/api/public/menus/{SLUG}").json["menu"]["ordering"]["delivery"], True)
        self.configure(enabled=False)
        info = self.client.get(f"/api/public/takeaway/{SLUG}").json
        self.assertEqual(info["delivery"]["enabled"], False)
        self.assertEqual(info["delivery"]["zones"], [])

    # --- Pedir ------------------------------------------------------------------------

    def test_pedido_a_domicilio_con_envio(self):
        response = self.deliver([self.line("Latte", 2)], cash_tendered="200")
        self.assertEqual(response.status_code, 201, response.json)
        self.assertEqual(response.json["order"]["channel"], "delivery")

        account = self.account()
        self.assertIsNone(account["table"])
        self.assertEqual(account["customer"], {"name": "David", "phone": "5512345678"})
        self.assertEqual(account["delivery"], {
            "address": "Colima 120, depto 3", "zone": "Roma Norte", "references": "Portón negro",
            "fee": "35.00", "pay_with": "cash", "cash_tendered": "200.00",
        })
        # Sin aceptar, la cuenta está en cero; aceptado, consumo + envío.
        self.assertEqual(account["total"], "0.00")
        self.set_status(account["orders"][0]["id"], "received")
        self.assertEqual(self.account()["total"], "145.00")

    def test_validaciones_de_entrega(self):
        cases = [
            ({"zone": "Polanco"}, "zone_not_served"),
            ({"zone": ""}, "zone_not_served"),
            ({"address": "   "}, None),
            ({"pay_with": "bitcoin"}, None),
            ({"pay_with": "cash", "cash_tendered": "100"}, "tendered_short"),
            ({"cash_tendered": "1e3"}, None),
            ({"extra": "x"}, None),
        ]
        for delivery, code in cases:
            with self.subTest(delivery=delivery):
                response = self.deliver([self.line("Latte", 2)], **delivery)
                self.assertEqual(response.status_code, 400, response.json)
                if code:
                    self.assertEqual(response.json["code"], code)
        # La colonia no distingue mayúsculas y se guarda como la escribió el negocio.
        self.assertEqual(self.deliver([self.line("Latte", 2)], zone="roma norte", pay_with="card").status_code, 201)
        self.assertEqual(self.account()["delivery"]["zone"], "Roma Norte")
        self.assertIsNone(self.account()["delivery"]["cash_tendered"])

    def test_pedido_minimo_sin_el_envio(self):
        response = self.deliver([self.line("Latte")])  # 55 < 100
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "below_minimum")
        self.assertEqual(response.json["min_order"], "100.00")

    def test_apagado_o_en_pausa_no_recibe(self):
        self.configure(enabled=False)
        self.assertEqual(self.deliver([self.line("Latte", 2)]).json["code"], "ordering_disabled")
        self.configure(enabled=True)
        self.client.patch(self.business_url("/ordering"), json={"enabled": False}, headers=self.auth())
        self.assertEqual(self.deliver([self.line("Latte", 2)]).json["code"], "ordering_disabled")

    def test_el_cliente_ve_sus_pedidos_de_ambos_canales(self):
        self.client.patch(self.business_url("/ordering"), json={"takeaway": True}, headers=self.auth())
        self.deliver([self.line("Latte", 2)])
        self.client.post(
            f"/api/public/takeaway/{SLUG}/orders",
            json={"diner_name": "David", "phone": "5512345678", "idempotency_key": "llevar-0001", "items": [self.line("Americano")]},
            headers={"X-Eniu-Diner": DAVID},
        )
        orders = self.client.get(f"/api/public/takeaway/{SLUG}/orders", headers={"X-Eniu-Diner": DAVID}).json["orders"]
        self.assertEqual(sorted(order["channel"] for order in orders), ["delivery", "takeaway"])
        delivery = next(order for order in orders if order["channel"] == "delivery")
        self.assertEqual(delivery["account"]["delivery"]["zone"], "Roma Norte")
        # Los pendientes se cuentan juntos para los dos canales.
        self.deliver([self.line("Latte", 2)])
        response = self.deliver([self.line("Latte", 2)])
        self.assertEqual(response.json["code"], "too_many_pending")
        self.assertEqual(self.deliver([self.line("Latte", 2)], device=ANA, name="Ana").status_code, 201)

    # --- En camino y cobro --------------------------------------------------------------

    def test_en_camino_y_cobro_con_envio(self):
        self.deliver([self.line("Latte", 2)], cash_tendered="500")
        account = self.account()
        order_id = account["orders"][0]["id"]
        for status in ("received", "preparing", "ready", "on_the_way"):
            response = self.set_status(order_id, status)
            self.assertEqual(response.status_code, 200, response.json)
        self.assertIsNotNone(response.json["order"]["on_the_way_at"])
        mine = self.client.get(f"/api/public/takeaway/{SLUG}/orders", headers={"X-Eniu-Diner": DAVID}).json["orders"]
        self.assertEqual(mine[0]["status"], "on_the_way")

        self.client.post(self.business_url("/cash/open"), json={"opening_float": "0"}, headers=self.auth())
        # El cobro debe cubrir consumo + envío.
        short = self.client.post(
            self.business_url(f"/accounts/{account['id']}/checkout"),
            json={"payments": [{"method": "cash", "amount": "110.00"}]}, headers=self.auth(),
        )
        self.assertEqual(short.json["code"], "amount_mismatch")
        self.assertEqual(short.json["total"], "145.00")
        response = self.client.post(
            self.business_url(f"/accounts/{account['id']}/checkout"),
            json={"payments": [{"method": "cash", "amount": "145.00", "tendered": "500"}]}, headers=self.auth(),
        )
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json["payments"][0]["change"], "355.00")
        checkout = self.client.get(self.business_url("/cash"), headers=self.auth()).json["session"]["checkouts"][0]
        self.assertEqual(checkout["channel"], "delivery")
        self.assertEqual(checkout["customer_name"], "David")

    def test_en_camino_solo_a_domicilio(self):
        table = self.create_table(4)
        self.order(self.qr_token(table), [self.line("Latte")])
        order_id = self.only_order_id()
        self.set_status(order_id, "ready")
        response = self.set_status(order_id, "on_the_way")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "invalid_transition")

    def test_si_se_cancela_todo_no_se_cobra_el_envio(self):
        self.deliver([self.line("Latte", 2)])
        account = self.account()
        self.set_status(account["orders"][0]["id"], "cancelled")
        self.assertEqual(self.account()["total"], "0.00")

    def test_el_envio_se_copia_al_pedir(self):
        self.deliver([self.line("Latte", 2)])
        self.configure(fee="50")
        self.assertEqual(self.account()["delivery"]["fee"], "35.00")

    def test_las_estadisticas_cuentan_en_camino(self):
        self.deliver([self.line("Latte", 2)])
        self.set_status(self.account()["orders"][0]["id"], "on_the_way")
        stats = self.client.get(self.business_url("/orders/stats"), headers=self.auth()).json
        self.assertEqual(stats["summary"]["orders"], 1)
        # Sin el envío: es venta de productos.
        self.assertEqual(stats["summary"]["revenue"], "110.00")
