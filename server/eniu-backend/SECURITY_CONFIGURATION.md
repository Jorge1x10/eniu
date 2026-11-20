# Configuración de seguridad

El flujo de recuperación requiere estas variables de entorno en cada ambiente:

```text
FRONTEND_URL=https://app.example.com
PASSWORD_RESET_SECRET_KEY=<clave-aleatoria-exclusiva-y-larga>
PASSWORD_RESET_TOKEN_MINUTES=15
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=<usuario-smtp>
MAIL_PASSWORD=<contraseña-smtp>
MAIL_FROM=no-reply@example.com
MAIL_USE_TLS=true
```

`PASSWORD_RESET_SECRET_KEY` debe ser distinta de `JWT_SECRET_KEY` y no debe
compartirse con el frontend. `FRONTEND_URL` es la única base utilizada para
construir enlaces de recuperación.

## Limitación de rate limiting

El proyecto no tenía infraestructura distribuida de rate limiting. Esta
implementación limita el tamaño de los payloads, invalida solicitudes previas,
evita reenvíos inmediatos y utiliza respuestas genéricas, pero producción debe
agregar un limitador compartido entre workers (por ejemplo, respaldado por
Redis o aplicado en el gateway) para login, cambio de contraseña y ambos
endpoints de recuperación. No se deben usar contadores en memoria por proceso.

Hoy ya se puede: con `REDIS_URL` (o `RATELIMIT_STORAGE_URI`) el limitador
cuenta en Redis y lo comparten todos los workers. Sin él cada worker de
gunicorn lleva su propio contador, así que el límite real es el nominal
multiplicado por `WEB_CONCURRENCY`.

## IP del cliente detrás del proxy

El limitador cuenta peticiones por IP. Detrás del balanceador de Render, la
IP que ve Flask es la del balanceador, así que sin ajuste todos los usuarios
compartían un solo contador (diez logins por minuto para el servicio entero).

```text
TRUSTED_PROXY_COUNT=1   # Render
TRUSTED_PROXY_COUNT=2   # Render con un CDN delante (Cloudflare, etc.)
TRUSTED_PROXY_COUNT=0   # local, sin proxy
```

El valor es cuántos proxies añaden una entrada a `X-Forwarded-For`; Flask se
queda con la IP que puso el último de confianza. Un número mayor que el real
deja que cualquiera falsee su IP mandando la cabecera; uno menor vuelve a
juntar a todos los usuarios en el contador del proxy. El valor por defecto es
`1` porque la API corre en Render.

Para confirmarlo en producción, manda seis veces desde tu conexión una
petición vacía (no envía ningún correo):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' https://eniu-backend.onrender.com/api/auth/forgot-password
```

La sexta debe responder `429`. Repite una vez desde otra red (por ejemplo, los
datos del teléfono): si también recibe `429`, el valor no corresponde a la
cadena de proxies real. Con `WEB_CONCURRENCY=2` y sin Redis cada worker cuenta
aparte, así que el `429` puede tardar hasta el doble de intentos.

## Duración de las sesiones

```text
JWT_ACCESS_TOKEN_MINUTES=60
JWT_REFRESH_TOKEN_DAYS=30
```

Son las mismas para correo, Google, Apple y registro. Un refresh largo no deja
una sesión robada viva: cambiar la contraseña o "cerrar las demás sesiones"
sube `auth_version` e invalida todos los tokens emitidos antes.
