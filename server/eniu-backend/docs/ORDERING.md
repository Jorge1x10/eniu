# Pedidos desde la mesa

El comensal escanea el QR de su mesa, ve el menú, escribe su nombre, arma un
carrito y lo manda. El negocio lo recibe en el panel con la etiqueta
**David | Mesa 4**, lo acepta y lo hace avanzar. El comensal ve en todo momento
en qué va su pedido.

Código: `app/modules/ordering/`. Pruebas: `tests/test_ordering_api.py`.

## Conceptos

| Concepto | Qué es | Quién lo crea |
|---|---|---|
| **Mesa** (`dining_tables`) | Número, nombre opcional, el menú que abre y el `qr_token` de su QR | El negocio, una vez |
| **Cuenta** (`table_accounts`) | Lo que consume la mesa. Una sola para todos los comensales | Se abre sola con el primer pedido |
| **Pedido** (`orders`) | Cada envío del carrito de un comensal, con su nombre | El comensal |
| **Línea** (`order_items`) | Un producto del pedido, con **copia del nombre y del precio** | El comensal |

## Reglas

- **Una cuenta abierta por mesa**, garantizado por un índice único parcial
  (`status = 'open'`). Si dos comensales piden a la vez en una mesa vacía, los
  dos quedan en la misma cuenta.
- **Solo el negocio cierra la cuenta.** No se puede cerrar con pedidos sin
  aceptar: hay que aceptarlos o cancelarlos antes. Después de cerrarla, el
  siguiente pedido abre una cuenta nueva.
- **Estados del pedido:** `pending` (Enviado) → `received` (Recibido) →
  `preparing` (Preparando) → `ready` (Listo). Solo avanzan. Si se salta un paso,
  se marcan también los intermedios.
- **Cancelar** lo hace solo el negocio, a petición del comensal: un producto
  suelto, o el pedido entero (`status: cancelled`). Si se cancelan todos sus
  productos, el pedido queda cancelado.
- **El total lo calcula el servidor:** suma solo los pedidos aceptados y los
  productos sin cancelar. El comensal nunca manda precios, y si lo intenta, el
  pedido se rechaza.
- **Qué se puede pedir:** lo que el menú público muestra, que está disponible y
  que **tiene precio**. Un producto sin precio ("Consultar") se ve en el menú,
  pero se pide al mesero.
- **Activación:** `Business.ordering_enabled`, apagado por defecto. Apagarlo es
  también el botón de **pausar pedidos**: el menú se sigue viendo, pero no se
  puede pedir.

## Es una función de pago

Los pedidos son lo que más carga el servidor, así que están en los planes de
pago (`allow_orders` en `billing/plans.py`). El plan gratuito solo los tiene
durante una **prueba** que se controla sin desplegar código:

```text
ORDERS_FREE_PLAN_UNTIL=2027-03-31   # último día de la prueba, incluido (UTC)
```

- **Vacía o ilegible:** no hay prueba. Un error de configuración nunca regala la
  función.
- **Durante la prueba**, el plan del usuario dice `allow_orders: true` y
  `orders_free_until: "2027-03-31"`, para que los clientes avisen hasta cuándo
  sin nombrar precios (la app de iOS no puede ofrecer compras fuera de Apple).
- **Al pasar la fecha**, los negocios gratuitos dejan de recibir pedidos nuevos.
  Lo que ya estaba en curso se atiende, y las cuentas abiertas se cierran con
  normalidad. El panel recibe `ordering: {"enabled": false, "reason": "plan"}`
  (si el negocio los pausó, `reason` es `"paused"`).
- **Los planes de pago** no dependen de la fecha.

## Identificar al comensal sin cuentas

El navegador del comensal genera un token aleatorio una vez (16 a 128
caracteres `A-Z a-z 0-9 _ -`), lo guarda y lo manda en cada petición:

```text
X-Eniu-Diner: <token>
```

El servidor solo guarda su HMAC. Sirve para tres cosas:
- mostrarle **sus** pedidos en el carrito;
- que **solo quien pidió en la mesa** vea la cuenta. Con una foto del QR no
  basta para ver lo que consumió la mesa ni el nombre de quienes están en ella;
- aplicar los límites de peticiones por teléfono y no por IP. En un
  restaurante, todos los comensales comparten la IP del Wi-Fi.

## API del comensal (sin sesión)

El QR de la mesa lleva a `{PUBLIC_WEB_BASE_URL}/m/<slug>/mesa/<qr_token>`. El
menú se pide con su endpoint de siempre (`/api/public/menus/<slug>`, cacheado),
y lo de la mesa con estos:

| Método y ruta | Qué hace |
|---|---|
| `GET /api/public/tables/<qr_token>` | Número y nombre de la mesa, el `public_slug` del menú y si se aceptan pedidos |
| `POST /api/public/tables/<qr_token>/orders` | Manda el carrito. Abre la cuenta si no hay una |
| `GET /api/public/tables/<qr_token>/orders?version=N` | Los pedidos de este comensal con su estado (el carrito) |
| `GET /api/public/tables/<qr_token>/account` | La cuenta de toda la mesa: lo aceptado, por comensal, con el total |

Cuerpo del pedido:

```json
{
  "diner_name": "David",
  "idempotency_key": "c0a8f1e2-…",
  "items": [
    { "product_key": "<tracking_key del menú público>", "quantity": 2, "notes": "Sin cebolla" }
  ]
}
```

- `product_key` es el `tracking_key` que el menú público ya publica por
  producto; no se exponen ids internos.
- `idempotency_key` (8 a 64 caracteres) la genera el cliente **una vez por
  envío** y la reutiliza en los reintentos. Un doble toque o un reintento por
  mala red devuelven el mismo pedido (`200`) en vez de crear otro.
- Límites: nombre de hasta 40 caracteres, hasta 30 líneas, de 1 a 20 unidades
  por línea, notas de hasta 200 caracteres y hasta 5 pedidos sin aceptar por
  teléfono en una mesa.

Respuestas que el cliente debe tratar aparte (todas llevan `code`):

| `code` | Estado | Qué hacer |
|---|---|---|
| `products_unavailable` | 409 | Viene `product_keys`: quitar esos productos del carrito y avisar |
| `ordering_disabled` | 409 | El negocio pausó los pedidos: dejar ver el menú, ocultar "Ordenar" |
| `too_many_pending` | 429 | Esperar a que el negocio acepte lo enviado |
| `no_account` | 404 | (cuenta) Aún no ha pedido en esta mesa |

## Para llevar

El cliente pide desde el enlace del menú, sin QR de mesa:
`{PUBLIC_WEB_BASE_URL}/m/<slug>/para-llevar`. Con los pedidos para llevar
activos, el menú público (`/m/<slug>`) muestra además un botón "Pedir para
llevar" (`menu.ordering.takeaway` en `/api/public/menus/<slug>`).

- **Activación:** `Business.takeaway_enabled`, apagado por defecto, con
  `PATCH /api/businesses/<id>/ordering` y `{"takeaway": true}`. Se suma a
  `ordering_enabled` y al plan: pausar pedidos pausa también los para llevar.
  `ordering.takeaway` llega en `orders/live`.
- **Una cuenta por pedido:** cada pedido para llevar abre su propia cuenta
  (`channel: "takeaway"`, sin mesa) con el nombre y el teléfono de quien pide.
  En `orders/live` llega con `table: null` y `customer: {name, phone}`. La
  base exige mesa en las cuentas de mesa y ninguna en las de llevar
  (`ck_table_accounts_channel_table`).
- **Mismos estados:** Enviado → Recibido → Preparando → Listo (para
  recoger). Se paga al recoger, en efectivo o con terminal, con el mismo
  "Cobrar" de la caja; cobrar cierra la cuenta, y para el cliente eso es
  "Entregado". Cerrar sin cobrar también existe.
- **Límites más estrictos**, porque no hay nadie sentado detrás: 3 pedidos sin
  aceptar por teléfono en el negocio, 5 envíos por minuto por teléfono y 60
  por hora por menú.
- **Teléfono:** obligatorio; de 8 a 15 dígitos, con `+`, espacios, guiones o
  paréntesis (se guardan sin ellos).

| Método y ruta | Qué hace |
|---|---|
| `GET /api/public/takeaway/<slug>` | Nombre del negocio, si acepta pedidos para llevar ahora y `delivery` (`enabled`, `fee`, `min_order`, `zones`) |
| `POST /api/public/takeaway/<slug>/orders` | Manda el pedido. Mismo cuerpo que en la mesa, más `"phone"` |
| `GET /api/public/takeaway/<slug>/orders` | Los pedidos para llevar de este teléfono en las últimas 12 horas, con `account.status` (`closed` = entregado) y `account.total` |

Los códigos de error son los mismos que en la mesa.

## A domicilio

Con los repartidores del restaurante. El cliente entra por
`/m/<slug>/a-domicilio` (o elige "A domicilio" dentro de `/para-llevar`). El
botón del menú público dice "Pedir a domicilio" o "Pedir para llevar o a
domicilio" según lo activo (`menu.ordering.delivery`).

- **Ajustes del negocio:** `GET`/`PATCH /api/businesses/<id>/delivery` con
  `enabled`, `fee` (el **mismo costo para todas las colonias**), `min_order`
  (sin el envío; `null` es sin mínimo) y `zones` (las colonias que atiende;
  sin vacías ni repetidas). No se puede activar sin colonias
  (`code: "zones_required"`). Como para llevar, depende de `ordering_enabled`
  y del plan; `ordering.delivery` llega en `orders/live`.
- **Pedido:** `POST /api/public/delivery/<slug>/orders`, el cuerpo de para
  llevar más:

  ```json
  "delivery": {
    "zone": "Roma Norte", "address": "Colima 120, depto 3", "references": "Portón negro",
    "pay_with": "cash", "cash_tendered": "500"
  }
  ```

  - `zone` debe ser una de las colonias del negocio (sin importar mayúsculas):
    si no, `code: "zone_not_served"`.
  - `pay_with`: `cash` o `card` (el repartidor lleva terminal). Con efectivo,
    `cash_tendered` es opcional; si no alcanza para productos + envío,
    `code: "tendered_short"`.
  - Si los productos no llegan al mínimo: `409`, `code: "below_minimum"` con
    `min_order`.
- **La cuenta** (`channel: "delivery"`) copia el costo de envío al pedir: si el
  negocio lo cambia después, el pedido no cambia. En `orders/live` trae
  `delivery: {address, zone, references, fee, pay_with, cash_tendered}`.
- **Total:** productos aceptados + envío. Si el negocio cancela todo, el envío
  tampoco se cobra (total en cero).
- **Estados:** los de siempre y uno más, `on_the_way` (En camino), sólo para
  domicilio (`on_the_way_at`). Entregado es cobrar con la caja al volver el
  repartidor. En una mesa o para llevar, `on_the_way` responde `409`
  (`invalid_transition`).
- **Estadísticas:** cuentan "En camino" como venta; los ingresos son de
  productos, sin el envío.
- **Seguimiento del cliente:** `GET /api/public/takeaway/<slug>/orders`
  devuelve los dos canales, con `channel` y `account.delivery`. El límite de
  3 pedidos sin aceptar por teléfono es para los dos juntos.

## API del negocio (con sesión)

| Método y ruta | Qué hace |
|---|---|
| `GET/POST /api/businesses/<id>/tables` | Listar y crear mesas (`number`, `name`, `catalogue_id`) |
| `PATCH/DELETE /api/businesses/<id>/tables/<table_id>` | Editar, desactivar (`is_active`) o borrar. No se borra con la cuenta abierta |
| `POST /api/businesses/<id>/tables/<table_id>/regenerate-qr` | QR nuevo; el impreso deja de funcionar |
| `PATCH /api/businesses/<id>/ordering` | `{"enabled": true\|false}` activa o pausa los pedidos; `{"takeaway": true\|false}`, los para llevar |
| `GET /api/businesses/<id>/orders/live?version=N` | Cuentas abiertas con sus pedidos |
| `PATCH /api/businesses/<id>/orders/<order_id>` | `{"status": "received"\|"preparing"\|"ready"\|"cancelled"}` |
| `POST /api/businesses/<id>/orders/<order_id>/items/<item_id>/cancel` | Cancelar un producto |
| `POST /api/businesses/<id>/accounts/<account_id>/close` | Cerrar la cuenta de la mesa **sin cobrar** (cortesías, errores). Para cobrar: `.../checkout`, en [`CASH.md`](CASH.md) |
| `GET /api/businesses/<id>/orders/stats?from=AAAA-MM-DD&to=AAAA-MM-DD` | Estadísticas de lo vendido (ver abajo) |

## Estadísticas

`GET /api/businesses/<id>/orders/stats` (código: `app/modules/ordering/stats.py`,
pruebas: `tests/test_order_stats_api.py`).

- Cuenta sólo lo **aceptado** y sin los productos quitados: la misma regla que
  la cuenta de la mesa. Pendientes y rechazados no son ventas.
- Fechas y horas en la zona del negocio (`Business.timezone`). Sin `from`/`to`,
  los últimos 7 días; como máximo 90.
- Devuelve `summary` (pedidos, unidades, ingresos, ticket promedio, la
  comparación con el periodo anterior de la misma duración y la hora con más
  pedidos), `top_products` (los 10 más pedidos por unidades, con ingresos,
  pedidos y porcentaje), `by_day` y `by_hour` (las 24 horas).
- Plan: con `allow_analytics`, cualquier periodo; con `analytics_summary`
  (gratuito), sólo dentro de los últimos 7 días (`scope: "summary"`); fuera de
  eso, `403` con `code: "plan_limit"`.

## Consultar en vivo sin cargar el servidor

No hay conexiones abiertas (WebSocket o SSE): con los hilos de gunicorn
actuales, cada una ocuparía un hilo. En su lugar, cada cambio sube un contador
en la misma transacción:

- `Business.orders_version` para el panel;
- `TableAccount.version` para el comensal.

El cliente manda el último que vio (`?version=N`). Si no cambió, la respuesta es
`{"changed": false, "version": N}`, una sola lectura por clave primaria.

Ritmo recomendado:
- **Panel:** cada 5 segundos mientras está visible.
- **Comensal:** cada 10 segundos, **solo mientras tiene pedidos sin terminar** y
  la pestaña está visible. Cuando todo está "Listo", deja de preguntar.

Si el volumen crece, el siguiente paso es responder el "sin cambios" desde Redis
sin tocar Postgres, y después conexiones abiertas con un servidor asíncrono
aparte.
