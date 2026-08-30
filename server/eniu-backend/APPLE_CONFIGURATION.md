# Configuración de Sign in with Apple

Entrar con Apple funciona sin nada de esto: el identity token se valida contra
las llaves públicas de Apple. Lo que sí necesita configuración es **revocar la
sesión cuando alguien borra su cuenta**, que Apple exige a toda app que ofrezca
Sign in with Apple (guía 5.1.1 v de App Review) y revisa en el envío.

```text
APPLE_CLIENT_IDS=com.eniu.app
APPLE_TEAM_ID=<Team ID de 10 caracteres>
APPLE_KEY_ID=<Key ID de 10 caracteres>
APPLE_PRIVATE_KEY=<contenido del .p8, con \n para los saltos de línea>
```

## De dónde salen

1. En [developer.apple.com](https://developer.apple.com/account) → **Certificates,
   Identifiers & Profiles** → **Keys** → crea una llave nueva y marca
   **Sign in with Apple**.
2. Al crearla se descarga un archivo `AuthKey_XXXXXXXXXX.p8`. **Apple sólo
   permite descargarlo una vez**; si se pierde hay que revocar la llave y crear
   otra.
3. `APPLE_KEY_ID` son los diez caracteres del nombre del archivo.
4. `APPLE_TEAM_ID` está arriba a la derecha del portal, en la ficha de la
   membresía.
5. `APPLE_PRIVATE_KEY` es el contenido íntegro del `.p8`, incluidas las líneas
   `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`. Como los paneles
   de entorno no admiten saltos de línea, se pega con `\n` literales; la
   configuración los deshace al leerla.

`APPLE_CLIENT_IDS` es la lista de audiencias válidas del identity token. El
primero de la lista es además el `client_id` con el que se piden y se revocan
los tokens, así que **el bundle id de la app va primero**.

## Qué pasa si falta

El borrado de cuenta sigue funcionando y no se bloquea nunca: eso sería peor
que no revocar. Pero cada intento deja en el registro
`Falta la clave de Sign in with Apple: no se pudo revocar la sesión`, y la app
queda autorizada en el Apple ID de alguien que ya se fue. Es motivo de rechazo
en App Store Connect.
