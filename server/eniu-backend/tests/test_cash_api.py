"""Caja: abrir turno, cobrar cuentas con varios métodos, movimientos y corte."""
from app.database.db import db
from app.modules.cash.model import Payment
from tests.test_ordering_api import ANA, DAVID, OrderingTestCase


class CashTestCase(OrderingTestCase):
    def setUp(self):
        super().setUp()
        self.table = self.create_table(4)
        self.token = self.qr_token(self.table)
        self.keys = 0

    # --- Ayudas -----------------------------------------------------------------

    def cash(self, suffix="", token=None):
        return self.client.get(self.business_url(f"/cash{suffix}"), headers=self.auth(token))

    def post(self, suffix, body, token=None):
        return self.client.post(self.business_url(suffix), json=body, headers=self.auth(token))

    def open_cash(self, opening_float="500.00"):
        response = self.post("/cash/open", {"opening_float": opening_float})
        self.assertEqual(response.status_code, 201, response.json)
        return response.json["session"]

    def serve(self, items, device=DAVID, name="David", token=None):
        """Un pedido aceptado en la mesa; devuelve el id de su cuenta."""
        self.keys += 1
        response = self.order(token or self.token, items, device=device, name=name, key=f"pedido-{self.keys:04d}")
        self.assertEqual(response.status_code, 201, response.json)
        live = self.live()
        order = next(
            (account, order) for account in live["accounts"] for order in account["orders"]
            if order["status"] == "pending"
        )
        response = self.client.patch(self.business_url(f"/orders/{order[1]['id']}"), json={"status": "received"}, headers=self.auth())
        self.assertEqual(response.status_code, 200, response.json)
        return order[0]["id"]

    def checkout(self, account_id, payments):
        return self.post(f"/accounts/{account_id}/checkout", {"payments": payments})

    def method(self, report, name):
        return next(entry for entry in report["by_method"] if entry["method"] == name)

    # --- Abrir caja ----------------------------------------------------------------

    def test_sin_turno_la_caja_esta_cerrada(self):
        response = self.cash()
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json["session"])
        self.assertIsNone(response.json["last_closed"])
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_abrir_caja_con_fondo(self):
        session = self.open_cash("750.50")
        self.assertEqual(session["status"], "open")
        self.assertEqual(session["opening_float"], "750.50")
        self.assertEqual(session["expected_cash"], "750.50")
        self.assertEqual(self.cash().json["session"]["id"], session["id"])

    def test_no_se_abren_dos_turnos(self):
        self.open_cash()
        response = self.post("/cash/open", {"opening_float": 0})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "cash_already_open")

    def test_fondo_invalido(self):
        for value in (-1, "abc", "1.234", True, None, [], "1e3", 1000000):
            with self.subTest(value=value):
                response = self.post("/cash/open", {"opening_float": value})
                self.assertEqual(response.status_code, 400, response.json)

    def test_sin_fondo_abre_en_cero(self):
        self.assertEqual(self.open_cash(0)["opening_float"], "0.00")
        self.post("/cash/close", {"counted_cash": 0})
        response = self.post("/cash/open", {})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["session"]["opening_float"], "0.00")

    def test_otro_negocio_no_entra(self):
        self.open_cash()
        self.assertEqual(self.cash(token=self.outsider_token).status_code, 403)
        self.assertEqual(self.post("/cash/open", {"opening_float": 0}, token=self.outsider_token).status_code, 403)
        self.assertEqual(self.post("/cash/close", {"counted_cash": 0}, token=self.outsider_token).status_code, 403)
        self.assertEqual(self.client.get(self.business_url("/cash")).status_code, 401)

    # --- Cobrar ------------------------------------------------------------------------

    def test_cobrar_con_varios_metodos_y_propina(self):
        self.open_cash("500.00")
        account_id = self.serve([self.line("Latte", 2), self.line("Americano")])  # 150
        response = self.checkout(account_id, [
            {"method": "cash", "amount": "100.00", "tip": "10", "tendered": "200"},
            {"method": "card", "amount": 50, "tip": "7.50"},
        ])
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json["account"]["status"], "closed")
        self.assertEqual(response.json["payments"][0]["change"], "90.00")
        self.assertIsNone(response.json["payments"][1]["change"])
        # La mesa ya no aparece en vivo.
        self.assertEqual(self.live()["accounts"], [])

        report = self.cash().json["session"]
        self.assertEqual(report["sales_total"], "150.00")
        self.assertEqual(report["tips_total"], "17.50")
        self.assertEqual(report["accounts_paid"], 1)
        self.assertEqual(report["average_ticket"], "150.00")
        self.assertEqual(self.method(report, "cash"), {"method": "cash", "amount": "100.00", "tips": "10.00", "payments": 1})
        self.assertEqual(self.method(report, "card")["tips"], "7.50")
        # Fondo + efectivo + propina en efectivo. La propina con tarjeta no está en la caja.
        self.assertEqual(report["expected_cash"], "610.00")
        self.assertEqual(len(report["checkouts"]), 1)
        self.assertEqual(report["checkouts"][0]["table_number"], 4)
        self.assertEqual(report["checkouts"][0]["methods"], ["cash", "card"])
        self.assertEqual(report["checkouts"][0]["amount"], "150.00")

    def test_los_pagos_deben_sumar_el_total(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])  # 55
        for payments in (
            [{"method": "cash", "amount": "50"}],
            [{"method": "cash", "amount": "50"}, {"method": "card", "amount": "10"}],
        ):
            with self.subTest(payments=payments):
                response = self.checkout(account_id, payments)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json["code"], "amount_mismatch")
                self.assertEqual(response.json["total"], "55.00")
        # La propina no cuenta para cubrir la cuenta.
        response = self.checkout(account_id, [{"method": "card", "amount": "45", "tip": "10"}])
        self.assertEqual(response.json["code"], "amount_mismatch")
        self.assertEqual(self.live()["accounts"][0]["status"], "open")

    def test_pagos_invalidos(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])
        cases = [
            None,
            "55",
            [{"method": "bitcoin", "amount": "55"}],
            [{"method": "cash", "amount": "-55"}],
            [{"method": "cash", "amount": "55", "tip": "-1"}],
            [{"method": "cash", "amount": "0"}],
            [{"method": "cash", "amount": "55", "tendered": "50"}],
            [{"method": "card", "amount": "5.5"}] * 11,
        ]
        for payments in cases:
            with self.subTest(payments=payments):
                response = self.post(f"/accounts/{account_id}/checkout", {"payments": payments})
                self.assertEqual(response.status_code, 400, response.json)
        self.assertEqual(self.post(f"/accounts/{account_id}/checkout", [1, 2]).status_code, 400)

    def test_efectivo_que_no_alcanza(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])
        response = self.checkout(account_id, [{"method": "cash", "amount": "55", "tip": "5", "tendered": "58"}])
        self.assertEqual(response.json["code"], "tendered_short")

    def test_sin_caja_abierta_no_se_cobra(self):
        account_id = self.serve([self.line("Latte")])
        response = self.checkout(account_id, [{"method": "cash", "amount": "55"}])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "cash_closed")

    def test_no_se_cobra_con_pedidos_pendientes(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])
        self.order(self.token, [self.line("Americano")], device=ANA, name="Ana", key="pedido-ana-01")
        response = self.checkout(account_id, [{"method": "cash", "amount": "55"}])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "pending_orders")

    def test_no_se_cobra_dos_veces(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])
        self.assertEqual(self.checkout(account_id, [{"method": "card", "amount": "55"}]).status_code, 200)
        response = self.checkout(account_id, [{"method": "card", "amount": "55"}])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["code"], "account_closed")
        with self.app.app_context():
            self.assertEqual(Payment.query.count(), 1)

    def test_cuenta_ajena_o_inexistente(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])
        self.assertEqual(self.checkout("no-es-uuid", [{"method": "card", "amount": "55"}]).status_code, 404)
        response = self.client.post(
            self.business_url(f"/accounts/{account_id}/checkout"),
            json={"payments": [{"method": "card", "amount": "55"}]},
            headers=self.auth(self.outsider_token),
        )
        self.assertEqual(response.status_code, 403)

    def test_cuenta_sin_consumo_se_cierra_sin_pagos(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])
        order_id = self.only_order_id()
        self.client.patch(self.business_url(f"/orders/{order_id}"), json={"status": "cancelled"}, headers=self.auth())
        response = self.checkout(account_id, [])
        self.assertEqual(response.status_code, 200, response.json)
        report = self.cash().json["session"]
        self.assertEqual(report["accounts_paid"], 0)
        self.assertEqual(report["accounts_cancelled"], 1)
        self.assertEqual(report["accounts_unpaid"], [])

    def test_cerrar_sin_cobrar_aparece_en_el_reporte(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])
        response = self.client.post(self.business_url(f"/accounts/{account_id}/close"), headers=self.auth())
        self.assertEqual(response.status_code, 200)
        unpaid = self.cash().json["session"]["accounts_unpaid"]
        self.assertEqual(len(unpaid), 1)
        self.assertEqual(unpaid[0]["total"], "55.00")
        self.assertEqual(unpaid[0]["table"]["number"], 4)

    def test_el_pago_sobrevive_si_se_borra_la_mesa(self):
        self.open_cash()
        account_id = self.serve([self.line("Latte")])
        self.checkout(account_id, [{"method": "card", "amount": "55"}])
        response = self.client.delete(self.business_url(f"/tables/{self.table['id']}"), headers=self.auth())
        self.assertEqual(response.status_code, 200, response.json)
        report = self.cash().json["session"]
        self.assertEqual(report["sales_total"], "55.00")
        self.assertEqual(report["accounts_paid"], 1)
        self.assertEqual(report["checkouts"][0]["table_number"], 4)

    # --- Movimientos -------------------------------------------------------------------

    def test_entradas_y_retiros(self):
        self.open_cash("100")
        self.assertEqual(self.post("/cash/movements", {"kind": "in", "amount": "200", "reason": "  Cambio   del banco "}).status_code, 201)
        response = self.post("/cash/movements", {"kind": "out", "amount": 80.5, "reason": "Hielo"})
        self.assertEqual(response.status_code, 201)
        report = response.json["session"]
        self.assertEqual(report["cash_in"], "200.00")
        self.assertEqual(report["cash_out"], "80.50")
        self.assertEqual(report["expected_cash"], "219.50")
        self.assertEqual([m["reason"] for m in report["movements"]], ["Cambio del banco", "Hielo"])

    def test_movimientos_invalidos(self):
        self.assertEqual(self.post("/cash/movements", {"kind": "in", "amount": "10", "reason": "x"}).json["code"], "cash_closed")
        self.open_cash()
        for body in (
            {"kind": "loan", "amount": "10", "reason": "x"},
            {"kind": "in", "amount": "0", "reason": "x"},
            {"kind": "in", "amount": "10", "reason": "   "},
            {"kind": "in", "amount": "10"},
            {"kind": "out", "amount": "10", "reason": "x" * 121},
        ):
            with self.subTest(body=body):
                self.assertEqual(self.post("/cash/movements", body).status_code, 400)

    # --- Corte -------------------------------------------------------------------------

    def test_corte_con_faltante(self):
        self.open_cash("500")
        account_id = self.serve([self.line("Latte", 2)])  # 110
        self.checkout(account_id, [{"method": "cash", "amount": "110", "tip": "10"}])
        self.post("/cash/movements", {"kind": "out", "amount": "20", "reason": "Gas"})
        response = self.post("/cash/close", {"counted_cash": "580", "notes": "Faltó un billete"})
        self.assertEqual(response.status_code, 200, response.json)
        report = response.json["session"]
        self.assertEqual(report["status"], "closed")
        self.assertEqual(report["expected_cash"], "600.00")
        self.assertEqual(report["counted_cash"], "580.00")
        self.assertEqual(report["difference"], "-20.00")
        self.assertEqual(report["notes"], "Faltó un billete")

        current = self.cash().json
        self.assertIsNone(current["session"])
        self.assertEqual(current["last_closed"]["difference"], "-20.00")
        self.assertEqual(current["last_closed"]["sales_total"], "110.00")

        # Con la caja cerrada ya no se cobra ni se corta otra vez.
        self.assertEqual(self.post("/cash/close", {"counted_cash": "0"}).json["code"], "cash_closed")

    def test_historial_y_detalle_del_corte(self):
        first = self.open_cash("100")
        self.post("/cash/close", {"counted_cash": "100"})
        second = self.open_cash("200")
        history = self.cash("/sessions").json["sessions"]
        self.assertEqual([entry["id"] for entry in history], [second["id"], first["id"]])
        self.assertEqual(history[1]["difference"], "0.00")

        detail = self.cash(f"/sessions/{first['id']}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json["session"]["counted_cash"], "100.00")
        self.assertEqual(self.cash("/sessions/no-es-uuid").status_code, 404)
        self.assertEqual(self.cash(f"/sessions/{first['id']}", token=self.outsider_token).status_code, 403)

    def test_cada_turno_suma_solo_sus_cobros(self):
        self.open_cash("0")
        account_id = self.serve([self.line("Latte")])
        self.checkout(account_id, [{"method": "transfer", "amount": "55"}])
        self.post("/cash/close", {"counted_cash": "0"})
        self.open_cash("0")
        account_id = self.serve([self.line("Americano")], device=ANA, name="Ana")
        self.checkout(account_id, [{"method": "other", "amount": "40"}])
        report = self.cash().json["session"]
        self.assertEqual(report["sales_total"], "40.00")
        self.assertEqual(self.method(report, "other")["amount"], "40.00")
        self.assertEqual(self.method(report, "transfer")["amount"], "0.00")

    def test_corte_invalido(self):
        self.open_cash()
        for body in ({}, {"counted_cash": "-1"}, {"counted_cash": "10", "notes": "x" * 201}):
            with self.subTest(body=body):
                self.assertEqual(self.post("/cash/close", body).status_code, 400)
        with self.app.app_context():
            db.session.remove()
        self.assertEqual(self.cash().json["session"]["status"], "open")
