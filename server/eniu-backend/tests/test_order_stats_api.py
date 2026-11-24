"""Estadísticas de pedidos: lo más pedido, ventas y horas pico."""
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from app.database.db import db
from app.modules.ordering.model import Order
from app.modules.products.model import Product
from tests.test_ordering_api import ANA, DAVID, OrderingTestCase

ZONE = ZoneInfo("America/Mexico_City")


def local_at(days_ago, hour, minute=0):
    """Un instante en la hora local del negocio, `days_ago` días atrás."""
    day = datetime.now(ZONE).date() - timedelta(days=days_ago)
    return datetime.combine(day, time(hour, minute), ZONE).astimezone(timezone.utc)


class OrderStatsTestCase(OrderingTestCase):
    expected_scope = "full"

    def setUp(self):
        super().setUp()
        self.table = self.create_table(4)
        self.token = self.qr_token(self.table)
        self.keys = 0

    def place(self, items, when, status="received", device=DAVID, name="David"):
        """Un pedido en la mesa, aceptado (o no) y fechado en `when`."""
        self.keys += 1
        response = self.order(self.token, items, device=device, name=name, key=f"pedido-{self.keys:04d}")
        self.assertEqual(response.status_code, 201, response.json)
        with self.app.app_context():
            order = Order.query.filter_by(idempotency_key=f"pedido-{self.keys:04d}").one()
            order.created_at = when
            db.session.commit()
            order_id = str(order.id)
        if status != "pending":
            response = self.client.patch(self.business_url(f"/orders/{order_id}"), json={"status": status}, headers=self.auth())
            self.assertEqual(response.status_code, 200, response.json)
        return order_id

    def stats(self, query="", token=None):
        return self.client.get(self.business_url(f"/orders/stats{query}"), headers=self.auth(token))

    def test_cuenta_solo_lo_aceptado_y_ordena_lo_mas_pedido(self):
        self.place([self.line("Latte", 2), self.line("Americano", 1)], local_at(1, 14, 30))
        self.place([self.line("Latte", 1)], local_at(1, 14, 50), status="ready", device=ANA, name="Ana")
        # Pendiente y rechazado no son ventas.
        self.place([self.line("Americano", 5)], local_at(1, 15), status="pending", device="device-luis-0123456789ab", name="Luis")
        self.place([self.line("Americano", 3)], local_at(1, 16), status="cancelled", device="device-sofi-0123456789ab", name="Sofía")
        # Un producto quitado por el restaurante tampoco.
        order_id = self.place([self.line("Latte", 1), self.line("Americano", 4)], local_at(0, 9), device="device-paco-0123456789ab", name="Paco")
        live = self.live()
        item = next(item for account in live["accounts"] for order in account["orders"] if order["id"] == order_id for item in order["items"] if item["name"] == "Americano")
        self.client.post(self.business_url(f"/orders/{order_id}/items/{item['id']}/cancel"), headers=self.auth())

        response = self.stats()
        self.assertEqual(response.status_code, 200, response.json)
        data = response.json
        self.assertEqual(data["scope"], self.expected_scope)
        self.assertEqual(data["period"]["timezone"], "America/Mexico_City")
        self.assertEqual(data["summary"]["orders"], 3)
        self.assertEqual(data["summary"]["units"], 5)  # 2+1 Latte, 1 Americano, 1 Latte
        self.assertEqual(data["summary"]["revenue"], "260.00")  # 4×55 + 40
        self.assertEqual(data["summary"]["average_order"], "86.67")
        self.assertEqual(
            [(product["name"], product["units"], product["revenue"], product["orders"]) for product in data["top_products"]],
            [("Latte", 4, "220.00", 3), ("Americano", 1, "40.00", 1)],
        )
        self.assertEqual(data["top_products"][0]["share"], 80.0)

    def test_agrupa_por_dia_y_por_hora_del_negocio(self):
        self.place([self.line("Latte")], local_at(2, 14, 10))
        self.place([self.line("Latte")], local_at(2, 14, 40), device=ANA, name="Ana")
        self.place([self.line("Americano")], local_at(0, 20, 5), device="device-luis-0123456789ab", name="Luis")

        data = self.stats().json
        hours = {entry["hour"]: entry["orders"] for entry in data["by_hour"]}
        self.assertEqual(len(data["by_hour"]), 24)
        self.assertEqual((hours[14], hours[20], hours[3]), (2, 1, 0))
        self.assertEqual(data["summary"]["busiest_hour"], 14)
        self.assertEqual(len(data["by_day"]), 7)
        days = {entry["date"]: entry for entry in data["by_day"]}
        two_days_ago = (datetime.now(ZONE).date() - timedelta(days=2)).isoformat()
        self.assertEqual((days[two_days_ago]["orders"], days[two_days_ago]["revenue"]), (2, "110.00"))

    def test_hoy_sirve_para_pedidos_hoy(self):
        self.place([self.line("Latte")], local_at(0, 1))
        self.place([self.line("Latte")], local_at(1, 23, 50), device=ANA, name="Ana")
        today = datetime.now(ZONE).date().isoformat()
        data = self.stats(f"?from={today}&to={today}").json
        self.assertEqual(data["summary"]["orders"], 1)
        self.assertEqual(data["summary"]["previous_orders"], 1)
        self.assertEqual(data["summary"]["orders_change"], 0.0)

    def test_compara_con_el_periodo_anterior(self):
        self.place([self.line("Latte", 2)], local_at(10, 13))
        self.place([self.line("Latte", 1)], local_at(1, 13), device=ANA, name="Ana")
        summary = self.stats().json["summary"]
        self.assertEqual((summary["orders"], summary["previous_orders"]), (1, 1))
        self.assertEqual((summary["revenue"], summary["previous_revenue"]), ("55.00", "110.00"))
        self.assertEqual(summary["revenue_change"], -50.0)

    def test_un_producto_borrado_conserva_su_nombre(self):
        self.place([self.line("Americano", 2)], local_at(1, 12))
        with self.app.app_context():
            db.session.delete(Product.query.filter_by(name="Americano").one())
            db.session.commit()
        self.assertEqual(self.stats().json["top_products"][0]["name"], "Americano")

    def test_sin_pedidos_no_falla(self):
        data = self.stats().json
        self.assertEqual(data["summary"]["orders"], 0)
        self.assertEqual(data["summary"]["average_order"], "0.00")
        self.assertIsNone(data["summary"]["busiest_hour"])
        self.assertEqual(data["top_products"], [])

    def test_valida_fechas_y_rango(self):
        self.assertEqual(self.stats("?from=ayer").status_code, 400)
        self.assertEqual(self.stats("?from=2026-05-10&to=2026-05-01").status_code, 400)
        self.assertEqual(self.stats("?from=2026-01-01&to=2026-12-31").status_code, 400)

    def test_solo_el_dueno(self):
        self.assertEqual(self.stats(token=self.outsider_token).status_code, 403)


class FreePlanOrderStatsTestCase(OrderStatsTestCase):
    paid_owner = False
    expected_scope = "summary"

    def setUp(self):
        super().setUp()
        # El gratuito recibe pedidos durante la prueba; sus estadísticas son
        # las de los últimos 7 días, como el resumen de visitas.
        self.app.config["ORDERS_FREE_PLAN_UNTIL"] = "2999-12-31"

    def tearDown(self):
        self.app.config.pop("ORDERS_FREE_PLAN_UNTIL", None)
        super().tearDown()

    def test_ve_los_ultimos_siete_dias(self):
        data = self.stats().json
        self.assertEqual(data["scope"], "summary")

    def test_no_puede_pedir_periodos_mas_largos(self):
        start = (datetime.now(ZONE).date() - timedelta(days=29)).isoformat()
        response = self.stats(f"?from={start}")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json["code"], "plan_limit")

    # Las pruebas heredadas valen igual para el gratuito dentro de 7 días;
    # éstas piden más atrás y no aplican.
    def test_compara_con_el_periodo_anterior(self):
        pass

    def test_valida_fechas_y_rango(self):
        pass
