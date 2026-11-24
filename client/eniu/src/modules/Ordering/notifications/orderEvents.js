/**
 * Qué cambió entre dos consultas en vivo de pedidos.
 *
 * Es una función pura a propósito: las notificaciones del panel dependen de
 * ella y así se prueba sin temporizadores ni red.
 *
 * - `new`: apareció un pedido por aceptar.
 * - `accepted`: un pedido que estaba por aceptar ya entró a la cuenta.
 * - `rejected`: un pedido que estaba por aceptar se rechazó.
 * - `ready`: un pedido pasó a "Listo" (hay que llevarlo a la mesa).
 * - `gone`: el pedido ya no está en ninguna cuenta abierta (se cerró).
 *
 * `previous` es el mapa que devolvió la llamada anterior, o `null` en la
 * primera carga: lo que ya estaba al abrir el panel no es "nuevo".
 */
export function snapshotOrders(accounts) {
  const map = new Map();
  for (const account of accounts || []) {
    for (const order of account.orders || []) map.set(order.id, { status: order.status, order, table: account.table });
  }
  return map;
}

const ACCEPTED = new Set(["received", "preparing", "ready"]);

export function diffOrders(previous, accounts) {
  const current = snapshotOrders(accounts);
  const events = [];
  if (!previous) return { current, events };
  for (const [id, entry] of current) {
    const before = previous.get(id)?.status;
    const base = { orderId: id, order: entry.order, table: entry.table };
    if (!before) {
      if (entry.status === "pending") events.push({ type: "new", ...base });
      continue;
    }
    if (before === "pending" && ACCEPTED.has(entry.status)) events.push({ type: "accepted", ...base });
    if (before === "pending" && entry.status === "cancelled") events.push({ type: "rejected", ...base });
    if (before !== "ready" && entry.status === "ready") events.push({ type: "ready", ...base });
  }
  for (const [id, entry] of previous) {
    if (!current.has(id)) events.push({ type: "gone", orderId: id, order: entry.order, table: entry.table });
  }
  return { current, events };
}

/** "2× Latte, 1× Chilaquiles verdes", sin lo que el restaurante quitó. */
export function itemsSummary(order) {
  return (order.items || [])
    .filter((item) => !item.is_cancelled)
    .map((item) => `${item.quantity}× ${item.name}`)
    .join(", ");
}
