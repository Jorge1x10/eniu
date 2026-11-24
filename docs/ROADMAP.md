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

## En curso

### 1. Estadísticas de lo más pedido
- [ ] Endpoint que suma pedidos aceptados por periodo, en la zona horaria del
      negocio: pedidos, unidades, ingresos, ticket promedio, productos más
      pedidos, pedidos por día y por hora.
- [ ] Sección en Analíticas del panel web.
- [ ] "Pedidos hoy" en Inicio (pendiente del rediseño).

## Siguiente

### 2. Comanda impresa al aceptar
- Ticket de 58/80 mm. Primero con la impresión del navegador (Chrome puede
  imprimir sin diálogo en modo kiosco); después, impresora USB directa
  (Web Serial/WebUSB) o impresoras que toman trabajos del servidor.
- Un solo dispositivo marcado como "el que imprime": si no, cada panel
  abierto imprimiría la misma comanda.
- Se dispara con el evento "pedido aceptado" que ya usan las notificaciones.
- Reimprimir desde la comanda.
- Más adelante: separar por estación (cocina, barra) según la categoría.

### 3. Caja, cobro y corte
- "Cerrar cuenta" pasa a "Cobrar y cerrar": pagos por método (efectivo,
  tarjeta, transferencia, otro), mixtos y con propina.
- Abrir caja con fondo inicial; entradas y retiros de efectivo; corte con
  esperado contra contado y diferencia.
- Reporte del turno: totales por método, propinas, cuentas cobradas y
  canceladas.
- Los pagos se diseñan ligados a una cuenta de mesa **o** a un pedido a
  domicilio, para no rehacerlos en el punto 4.

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

- **Personal y roles:** hoy todos entran con la misma cuenta. Con caja y
  cortes importa quién abrió, cobró o cortó; puede empezar como un PIN por
  empleado (mesero, cocina, cajero).
- **Impresora:** térmica USB, de red o Bluetooth; 58 u 80 mm.
- **Cobro:** ¿propinas? ¿dividir la cuenta entre comensales o pagos mixtos
  sobre el total?
- **Domicilio:** ¿repartidores propios? ¿sólo pago contra entrega o también
  en línea? (en línea implica que el dinero llegue a cada restaurante).
