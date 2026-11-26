# Caja, cobro y corte

El negocio abre la caja con un fondo, cobra la cuenta de cada mesa con uno o
varios métodos (con propina) y, al terminar el turno, hace el corte: cuenta el
efectivo y lo compara con lo que debería haber.

Código: `app/modules/cash/`. Pruebas: `tests/test_cash_api.py`. Las cuentas y
los pedidos son los de [`ORDERING.md`](ORDERING.md).

## Conceptos

| Concepto | Qué es |
|---|---|
| **Turno de caja** (`cash_sessions`) | Del fondo inicial al corte. **Uno abierto por negocio**, con un índice único parcial (`status = 'open'`) |
| **Movimiento** (`cash_movements`) | Efectivo que entra (`in`) o sale (`out`) sin ser una venta: cambio del banco, pago a un proveedor. Lleva motivo |
| **Pago** (`payments`) | Lo cobrado de una cuenta: método, importe, propina y, en efectivo, con cuánto pagó |

Métodos: `cash` (efectivo), `card` (tarjeta), `transfer` (transferencia) y
`other` (otro: vales, apps de pago).

## Reglas

- **Sin caja abierta no se cobra** (`409`, `code: "cash_closed"`). Cada pago
  queda en el turno en que entró, y el corte sólo suma los suyos.
- **Se cobra la cuenta completa de una vez.** La suma de los importes (sin
  propinas) debe ser **exactamente** el total que calcula el servidor; si no,
  `400` con `code: "amount_mismatch"`, `total` y `paid`. Cobrar cierra la
  cuenta. No se puede cobrar con pedidos sin aceptar (`pending_orders`).
- **Propina por pago.** Así el reporte sabe cuánta propina entró en efectivo
  (está en el cajón) y cuánta con tarjeta (no lo está).
- **Cambio.** En efectivo se puede mandar `tendered` (con cuánto paga). Si no
  alcanza para importe + propina: `400`, `code: "tendered_short"`.
- **Un solo cobro por cuenta.** La cuenta se cierra con
  `UPDATE ... WHERE status = 'open'`: un doble toque o dos cajeros a la vez
  no cobran dos veces (el segundo recibe `account_closed`).
- **Cerrar sin cobrar** sigue existiendo (`POST .../accounts/<id>/close`). El
  reporte del turno muestra aparte esas cuentas (`accounts_unpaid`) y las que
  se cerraron en cero porque todo se canceló (`accounts_cancelled`).
- **El pago sobrevive a la mesa.** Si se borra una mesa, sus cuentas se borran,
  pero los pagos no: `account_id` pasa a nulo y quedan `table_number`,
  `channel` y, para llevar, `customer_name`. Los
  pagos de un mismo cobro comparten `checkout_id`.
- Importes: texto o número, sin signo ni notación científica, hasta 2
  decimales y menores a 1,000,000 (`"150"`, `"150.5"`, `150.50`).

### Efectivo esperado

```text
esperado = fondo + ventas en efectivo + propinas en efectivo + entradas − retiros
diferencia = contado − esperado     (negativa: faltante; positiva: sobrante)
```

En el corte se guardan `expected_cash` y `counted_cash`: el reporte de un turno
cerrado no cambia después.

## API (con sesión, dueño del negocio)

| Método y ruta | Qué hace |
|---|---|
| `GET /api/businesses/<id>/cash` | `{session, last_closed}`: el turno abierto con su reporte en vivo, o `null` y el resumen del último corte |
| `POST /api/businesses/<id>/cash/open` | `{"opening_float": "500.00"}` (opcional, 0 por defecto). `409 cash_already_open` si ya hay uno |
| `POST /api/businesses/<id>/cash/movements` | `{"kind": "in"\|"out", "amount": "200", "reason": "Cambio del banco"}` |
| `POST /api/businesses/<id>/cash/close` | El corte: `{"counted_cash": "580.00", "notes": "..."}` |
| `GET /api/businesses/<id>/cash/sessions` | Los últimos 30 turnos, del más reciente al más antiguo |
| `GET /api/businesses/<id>/cash/sessions/<session_id>` | El reporte completo de un turno |
| `POST /api/businesses/<id>/accounts/<account_id>/checkout` | Cobrar y cerrar la cuenta (abajo) |

### Cobrar

```json
{
  "payments": [
    {"method": "cash", "amount": "100.00", "tip": "10.00", "tendered": "200.00"},
    {"method": "card", "amount": "50.00", "tip": "7.50"}
  ]
}
```

Responde la cuenta cerrada y los pagos con su `change` (cambio, sólo en
efectivo con `tendered`). Hasta 10 pagos; cada uno con importe o propina
mayor que cero. Una cuenta en cero (todo cancelado) se cobra con
`"payments": []`.

### Reporte del turno

`session` trae:

- `by_method`: por cada método, `amount`, `tips` y `payments` (cantidad).
- `sales_total`, `tips_total`, `accounts_paid`, `average_ticket`.
- `checkouts`: cada cobro (mesa, hora, importe, propina y métodos), del más
  reciente al más antiguo.
- `movements`, `cash_in`, `cash_out`.
- `opening_float`, `expected_cash` y, ya cerrado, `counted_cash`,
  `difference` y `notes`.
- `accounts_unpaid` y `accounts_cancelled`.

## Lo que falta

- **Quién:** hoy todos entran con la misma cuenta, así que no se registra quién
  abrió, cobró o cortó. Cuando haya personal con PIN, cada turno, pago y
  movimiento llevará a su autor.
- **Domicilio:** los pedidos para llevar ya son cuentas sin mesa
  (`channel: "takeaway"`) y se cobran igual; los pagos guardan `channel` y
  `customer_name`. A domicilio será otro canal de cuenta, sin columnas nuevas
  en los pagos.
- **App móvil:** sigue cerrando cuentas sin cobrar; adoptará el cobro y la caja.
