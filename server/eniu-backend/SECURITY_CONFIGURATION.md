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
