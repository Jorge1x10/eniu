# Roadmap de Eniu

**Meta:** que un negocio pueda administrar su restaurante por completo desde
Eniu: menú, pedidos, cocina, caja y reparto.

Cada función nace en el backend y el panel web; la app móvil la adopta
después. Las que son de pago van como límites del plan (`billing/plans.py`),
igual que los pedidos.

## Hecho

- [x] Menú digital con 13 plantillas, QR y analíticas de visitas.
- [x] Pedidos desde la mesa: QR por mesa, cuenta unificada por mesa, estados
      Recibido → Preparando → Listo, cancelar productos y cerrar la cuenta
      (`server/eniu-backend/docs/ORDERING.md`).
- [x] Panel web y app rediseñados; tablero de pedidos en vivo.
- [x] Lado del comensal en las 13 plantillas: nombre, carrito con notas,
      envío, seguimiento y cuenta de la mesa.
- [x] Notificaciones en el panel web: pedido nuevo (fijo hasta aceptarlo o
      rechazarlo), aceptado con su mesa y listo para llevar; avisos del
      navegador con la pestaña oculta.

### 1. Estadísticas de lo más pedido
- [x] Endpoint que suma pedidos aceptados por periodo, en la zona horaria del
      negocio: pedidos, unidades, ingresos, ticket promedio, productos más
      pedidos, pedidos por día y por hora (`GET /orders/stats`).
- [x] "Ventas y lo más pedido" en Analíticas del panel web.
- [x] "Pedidos hoy" en Inicio (pendiente del rediseño).
- [ ] La misma sección en la app (con el resto de la app).

### 2. Comanda impresa al aceptar
- [x] Ticket de 80 o 58 mm con la impresión del navegador, a la medida del
      contenido; en Chrome con `--kiosk-printing` sale sin diálogo.
- [x] Un solo dispositivo marcado como "el que imprime" (ajuste del
      navegador, no del negocio); candado para no imprimir dos veces en dos
      pestañas del mismo equipo.
- [x] Se dispara con el evento "pedido aceptado", lo acepte quien lo acepte.
- [x] Reimprimir desde la comanda (marcada como REIMPRESIÓN).
- [ ] Impresoras que toman trabajos del servidor (Star CloudPRNT, Epson
      Server Direct Print), para no depender de un panel abierto.
- [ ] Bluetooth de 58 mm desde la app.
- [ ] Separar por estación (cocina, barra) según la categoría.

### 3. Caja, cobro y corte
- [x] "Cerrar cuenta" pasa a "Cobrar": pagos por método (efectivo, tarjeta,
      transferencia, otro), varios en una cuenta, propina por pago y cambio
      en efectivo (`server/eniu-backend/docs/CASH.md`).
- [x] Abrir caja con fondo inicial (también desde el cobro); entradas y
      retiros de efectivo con motivo.
- [x] Corte: esperado contra contado, diferencia y notas; reporte impreso en
      la misma impresora de tickets.
- [x] Reporte del turno: totales por método, propinas, cobros, cuentas
      cerradas sin cobrar y canceladas; historial de cortes.
- [x] Los pagos guardan la mesa y sobreviven si se borra; quedan listos para
      ligarse a un pedido a domicilio en el punto 4.
- [ ] Cobro y caja en la app (hoy cierra la cuenta sin cobrar).
- [ ] Quién abrió, cobró y cortó (con personal y PIN).

## Siguiente

### 4. Para llevar y a domicilio
- Canal del pedido: mesa, para llevar o a domicilio. Hoy todo pedido
  pertenece a la cuenta de una mesa; hay que separarlo.
- Pedir desde el enlace del menú sin QR de mesa: nombre, teléfono,
  dirección y referencias; en efectivo, con cuánto paga.
- Configuración del negocio: zonas, costo de envío, pedido mínimo, horario.
- Estados nuevos: En camino y Entregado. Filtro de domicilio en Pedidos.

## Pendientes ya identificados

- Notificaciones push (con el panel cerrado y en la app): backend con
  suscripciones y `expo-notifications` en la app.
- Mesas y QR desde la app (hoy sólo en el panel web).
- Pedidos de pago: decidir qué planes los incluyen y crear los productos en
  RevenueCat y Stripe; definir `ORDERS_FREE_PLAN_UNTIL` en producción.
- Datos que el rediseño dejó con `TODO(diseño)`: cambio de contraseña, filtro
  de agotados, sonido en la app.

## Decisiones abiertas

- **Personal y roles:** hoy todos entran con la misma cuenta. Decidido por
  ahora: la caja funciona sin PIN. Más adelante, un PIN por empleado (mesero,
  cocina, cajero) para saber quién abrió, cobró o cortó.
- ~~**Impresora**~~: decidido. Cualquier térmica de 80 o 58 mm instalada en el
  equipo (la más común en México es la Epson TM-T20; Star TSP143 y genéricas
  ESC/POS también sirven). Bluetooth de 58 mm, con la app.
- ~~**Cobro**~~: decidido. Con propina, y la cuenta se cobra completa con uno
  o varios métodos (no se divide por comensal).
- **Domicilio:** ¿repartidores propios? ¿sólo pago contra entrega o también
  en línea? (en línea implica que el dinero llegue a cada restaurante).
