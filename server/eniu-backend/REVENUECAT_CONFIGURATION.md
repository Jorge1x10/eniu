# Configuración de RevenueCat (compras dentro de la app)

Stripe cobra las contrataciones hechas desde el panel web; RevenueCat cobra las
que se hacen dentro de la app de iOS/Android, donde Apple y Google obligan a
usar su propio sistema de compras.

Las dos rutas terminan escribiendo la **misma fila** de `billing_subscriptions`,
así que el resto del backend (`plans.py`, `guards.py`) no distingue quién cobró:
una compra en la App Store desbloquea exactamente lo mismo que un pago por web.

## Secretos

```text
REVENUECAT_WEBHOOK_AUTH=<cadena larga y aleatoria que tú inventas>
REVENUECAT_ALLOW_SANDBOX=false
```

`REVENUECAT_WEBHOOK_AUTH` no lo da RevenueCat: lo eliges tú y lo escribes en su
panel como cabecera `Authorization` del webhook. Sin esta variable el endpoint
responde 503 en lugar de aceptar entregas sin verificar.

`REVENUECAT_ALLOW_SANDBOX` debe quedarse en `false` en producción: los eventos
de sandbox llegan al mismo webhook que las compras reales, y aceptarlos
permitiría regalarse el plan de pago con una cuenta de prueba de Apple. Ponlo en
`true` sólo en el entorno donde estés probando.

## Antes de tocar código: App Store Connect

Esto es lo que más tarda y no depende del repositorio.

1. Firma el **Contrato de Apps de Pago** y completa datos bancarios y fiscales.
   Sin esto no se puede crear ningún producto de suscripción.
2. Crea un grupo de suscripción y dentro un producto auto-renovable
   (ej. `eniu_essential_monthly`), con precio, localizaciones y la captura de
   pantalla de revisión.
3. Genera una **In-App Purchase Key** para dársela a RevenueCat.
4. Crea cuentas de prueba (Sandbox Testers) en Users and Access.

En Google Play Console el equivalente son la suscripción en Monetize y una
cuenta de servicio con acceso a la API de Play.

## Panel de RevenueCat

1. Crea el proyecto y añade las apps de iOS y Android con sus bundle ids
   (`com.eniu.app`).
2. Conecta App Store Connect con la In-App Purchase Key y Google Play con la
   cuenta de servicio.
3. Crea el **entitlement** con el identificador `essential` (o `pro`) y
   engánchale los productos de cada tienda. El identificador importa: el
   backend traduce entitlement → plan en `REVENUECAT_ENTITLEMENTS`
   (`app/modules/billing/plans.py`). Un entitlement que no esté ahí no concede
   nada y queda registrado como error.
4. Crea una oferta (offering) con esos productos, que es lo que la app pedirá
   para pintar el paywall con el precio real de la tienda.

## Webhook

Registra en RevenueCat (Integrations → Webhooks):

```text
URL:            POST https://<api>/api/billing/revenuecat/webhook
Authorization:  <el mismo valor de REVENUECAT_WEBHOOK_AUTH>
```

El endpoint verifica la cabecera en tiempo constante, deduplica por `event.id`
—RevenueCat reintenta hasta recibir un 2xx— y traduce los eventos así:

| Evento de RevenueCat | Efecto en Eniu |
|---|---|
| `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `PRODUCT_CHANGE`, `NON_RENEWING_PURCHASE` | Concede el plan (`trialing` si es periodo de prueba) |
| `CANCELLATION` | Apaga la renovación pero **conserva el acceso** hasta el fin del periodo pagado; si el vencimiento ya pasó (reembolso), corta de inmediato |
| `EXPIRATION` | Quita el acceso y aplica la bajada a gratuito (despublica menús) |
| `BILLING_ISSUE` | `past_due`: **no** despublica nada, la tienda sigue reintentando el cobro |
| `SUBSCRIPTION_PAUSED` | `paused`, sin destruir nada |
| `TEST` | Se acepta y no toca ninguna cuenta |

Aplica la migración con `flask db upgrade` antes de habilitar el flujo.

## Lo que la app móvil tiene que hacer

- Llamar a `Purchases.logIn(user.id)` al iniciar sesión: el `app_user_id` de
  RevenueCat **debe** ser el id de usuario de Eniu, porque es lo único con lo
  que el webhook sabe a quién aplicarle la compra. Un `app_user_id` que no
  corresponda a nadie se registra y se descarta.
- Llamar a `Purchases.logOut()` al cerrar sesión, para no dejar la compra
  atada a la siguiente persona que use el teléfono.
- Tras comprar, volver a pedir `/api/auth/me` (o `/api/billing/subscription`)
  para refrescar el plan: la fuente de verdad sigue siendo el backend.
- El paywall necesita, por exigencia de Apple: botón visible de **Restaurar
  compras**, el precio traído de la tienda (no escrito a mano) y enlaces a los
  Términos y al Aviso de Privacidad.

## Dos casos que ya están resueltos en el backend

**Alguien que ya paga por Stripe compra en la app.** No se le quita nada —pagó,
tiene derecho a lo que compró—, pero los identificadores de Stripe se conservan
y el caso queda en el log como `ERROR` con ambos ids, porque a esa persona le
están cobrando dos veces y hay que devolvérselo. Para que no llegue a pasar, el
plan que viaja a los clientes incluye `provider`: la app no debe ofrecer el
botón de comprar a quien ya tiene `provider: "stripe"` con acceso activo.

**Borrar la cuenta con una suscripción de tienda activa.** Eniu no puede
cancelarla: sólo el usuario, desde los ajustes de su teléfono. El borrado sigue
adelante igual (Apple exige poder borrar la cuenta desde la app), pero la
respuesta incluye `store_subscription_active: true` y un `warning` para
decírselo. La app debe mostrar ese aviso.
