# Configuración de seguridad

El flujo de recuperación requiere estas variables de entorno en cada ambiente:

```text
FRONTEND_URL=https://app.eniu.app
PASSWORD_RESET_SECRET_KEY=<clave-aleatoria-exclusiva-y-larga>
PASSWORD_RESET_TOKEN_MINUTES=15
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=eniumenu@gmail.com
MAIL_PASSWORD=<contraseña de aplicación de Google, 16 caracteres>
MAIL_FROM=eniumenu@gmail.com
MAIL_USE_TLS=true
```

`PASSWORD_RESET_SECRET_KEY` debe ser distinta de `JWT_SECRET_KEY` y no debe
compartirse con el frontend.

`FRONTEND_URL` es la única base con la que se construyen los enlaces de
recuperación, que salen como `${FRONTEND_URL}/reset-password?token=...`. Esa
ruta la sirve **el panel**, así que tiene que apuntar a `app.eniu.app`. No se
confunda con `PUBLIC_WEB_BASE_URL`, que es de dónde cuelgan los menús
publicados y apunta a `menu.eniu.app`: son dos dominios distintos y cruzarlos
deja el correo llegando con un enlace que da 404.

## Enviar con Gmail

Cuatro cosas que no dan error y aun así rompen el envío:

1. **Hace falta una contraseña de aplicación**, no la del correo. Se activa
   antes la verificación en dos pasos de la cuenta y luego se genera desde la
   configuración de Google. Va en `MAIL_PASSWORD` y en ningún archivo del
   repositorio.
2. **El puerto es el 587.** El 465 también funciona --el cliente detecta que
   es TLS implícito y abre la conexión ya cifrada-- pero cualquier otro
   número deja la petición colgada hasta agotar el timeout.
3. **`MAIL_FROM` tiene que ser la misma cuenta de `MAIL_USERNAME`.** Gmail
   reescribe el remitente en silencio cuando no coinciden: no falla, sale con
   otra dirección de la que se creía. Si se deja sin definir se usa
   `MAIL_USERNAME`, que es lo que casi siempre se quiere.
4. **El límite son 500 correos al día.** De sobra para empezar, no para una
   campaña.

Enviar avisos de contraseña desde una dirección `@gmail.com` funciona, pero
cae en spam bastante más que hacerlo desde el dominio propio. Cuando haya
usuarios reales conviene mover esto a un servicio transaccional sobre
`eniu.app`; el código no cambia, sólo estas variables.

## Comprobarlo antes de enviar la app a revisión

«¿Olvidaste tu contraseña?» está a la vista en el inicio de sesión, así que un
revisor de Apple puede probarlo. Si no llega nada, lo reporta como función
rota. La comprobación es pedir una recuperación con una cuenta real, recibir
el correo, abrir el enlace y cambiar la contraseña de verdad --y mirar también
la carpeta de spam, porque llegar ahí cuenta como no llegar.

Si el envío falla, la petición sigue devolviendo el mismo mensaje genérico
para no revelar qué correos existen; el motivo real queda en el registro del
servidor.

## Limitación de rate limiting

El proyecto no tenía infraestructura distribuida de rate limiting. Esta
implementación limita el tamaño de los payloads, invalida solicitudes previas,
evita reenvíos inmediatos y utiliza respuestas genéricas, pero producción debe
agregar un limitador compartido entre workers (por ejemplo, respaldado por
Redis o aplicado en el gateway) para login, cambio de contraseña y ambos
endpoints de recuperación. No se deben usar contadores en memoria por proceso.
