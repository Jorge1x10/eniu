import { describe, expect, it } from "vitest";

import { diffOrders, itemsSummary } from "./orderEvents";

const table = { id: "t4", number: 4, name: null };
const account = (...orders) => [{ id: "a", table, orders }];
const order = (id, status, items = [{ name: "Latte", quantity: 2, is_cancelled: false }]) => ({ id, status, diner_name: "David", items });

describe("diffOrders", () => {
  it("en la primera carga no hay eventos: lo que ya estaba no es nuevo", () => {
    const { events, current } = diffOrders(null, account(order("o1", "pending")));
    expect(events).toEqual([]);
    expect(current.get("o1").status).toBe("pending");
  });

  it("detecta pedidos nuevos, aceptados, rechazados y listos", () => {
    const { current: first } = diffOrders(null, account(order("o1", "pending"), order("o2", "pending"), order("o3", "preparing")));
    const { events } = diffOrders(first, account(order("o1", "received"), order("o2", "cancelled"), order("o3", "ready"), order("o4", "pending")));
    expect(events.map((event) => `${event.type}:${event.orderId}`)).toEqual(["accepted:o1", "rejected:o2", "ready:o3", "new:o4"]);
    expect(events[0].table.number).toBe(4);
  });

  it("si un pedido salta de por aceptar a listo, cuenta como aceptado y como listo", () => {
    const { current } = diffOrders(null, account(order("o1", "pending")));
    expect(diffOrders(current, account(order("o1", "ready"))).events.map((event) => event.type)).toEqual(["accepted", "ready"]);
  });

  it("avisa cuando un pedido sale del tablero porque se cerró la cuenta", () => {
    const { current } = diffOrders(null, account(order("o1", "ready")));
    expect(diffOrders(current, []).events).toMatchObject([{ type: "gone", orderId: "o1" }]);
  });
});

describe("itemsSummary", () => {
  it("lista los productos sin los quitados", () => {
    expect(itemsSummary(order("o", "pending", [
      { name: "Latte", quantity: 2, is_cancelled: false },
      { name: "Pan", quantity: 1, is_cancelled: true },
    ]))).toBe("2× Latte");
  });
});
