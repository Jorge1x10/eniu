# Configuración de Stripe Billing

La integración usa Stripe Checkout alojado para contratar **ENIU Esencial** y
Customer Portal para administrar la suscripción.

## Secretos

Configura estos valores fuera del repositorio (en el gestor de secretos del
entorno de despliegue):

```text
STRIPE_API_KEY=rk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ESSENTIAL_LOOKUP_KEY=eniu_essential_monthly
STRIPE_API_VERSION=2026-06-24.dahlia
FRONTEND_URL=https://app.eniu.example
STRIPE_AUTOMATIC_TAX=off
STRIPE_TERMS_CONSENT=off
```

La llave restringida necesita acceso a Customers, Prices, Checkout Sessions,
Subscriptions y Billing Portal. Nunca debe llegar al cliente web ni registrarse
en logs.

## Webhook

Registra `POST https://<api>/api/billing/webhook` en Stripe Workbench y suscribe
como mínimo estos eventos:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

El endpoint valida la firma y deduplica por `event.id` antes de sincronizar el
estado local. Aplica la migración con `flask db upgrade` antes de habilitar el
flujo.

En Billing > Customer Portal habilita actualización del método de pago y
cancelación al final del periodo. En Billing > Revenue Recovery habilita Smart
Retries y los correos de pago fallido.

## Vender fuera de México

Checkout ya pide la dirección de facturación, guarda lo que recoge en el
cliente y ofrece la casilla del NIF-IVA, y tanto la pantalla de pago como el
portal salen en el idioma de la cuenta. Eso no depende de ninguna variable.

Lo que sí está detrás de un interruptor son las dos cosas que fallan si la
cuenta de Stripe no se ha preparado antes. Mientras estén apagadas la
integración funciona exactamente como hasta ahora: **se cobra sin IVA y sin
recoger la renuncia al desistimiento**, lo que es correcto en México y una
infracción en la Unión Europea y el Reino Unido.

### `STRIPE_AUTOMATIC_TAX`

Enciéndelo cuando Stripe Tax esté listo. Antes hay que, en el panel:

1. Activar **Tax** y declarar la dirección de origen del negocio.
2. Registrar las jurisdicciones donde se declara. Vender un servicio digital a
   un consumidor de la UE obliga a cobrar el IVA de **su** país y a declararlo
   por la ventanilla única (OSS); el Reino Unido va aparte, con su propio
   registro ante el HMRC. No son el mismo trámite y no se cubren el uno al
   otro.
3. Marcar el precio del plan como servicio digital, con el código de impuesto
   que le corresponda.

Con el interruptor apagado cada creación de sesión de pago deja un aviso en el
log recordando que ese cobro sale sin IVA.

### `STRIPE_TERMS_CONSENT`

Un consumidor europeo tiene catorce días para desistir de una compra a
distancia. En un servicio digital que empieza a usarse de inmediato ese plazo
sólo decae si el comprador lo acepta expresamente, y la casilla de Checkout es
donde se recoge esa aceptación.

Stripe exige una URL de términos configurada en **Settings > Public details**
para poder mostrarla; sin ella la petición falla. Configúrala y enciende el
interruptor.

### Monedas

El importe que se anuncia sale de `currency_options` del precio, no escrito en
el código, y cada cliente enseña la del país desde el que se mira. Para que
haya euros y libras hay que añadirlas como opciones de moneda al precio del
plan en el panel de Stripe; hasta entonces esos países ven la moneda base.
Quién paga en qué moneda lo decide Checkout por la ubicación del cliente.

### Portal de cliente

En Billing > Customer Portal habilita además la edición de la **dirección de
facturación** y de los **identificadores fiscales**. Sin eso, un cliente que se
muda o que consigue su NIF-IVA después de contratar no puede corregirlo, y sus
renovaciones se siguen calculando con los datos viejos.
