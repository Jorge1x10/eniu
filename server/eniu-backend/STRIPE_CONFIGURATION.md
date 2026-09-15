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
