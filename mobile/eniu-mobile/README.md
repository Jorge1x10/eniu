# Eniu móvil

Aplicación móvil de Eniu construida con React Native, Expo Router y Expo SDK 57. Comparte el backend Flask con el frontend web.

## Ejecutar

1. Inicia el backend en `server/eniu-backend` sobre el puerto 5000.
2. Configura `EXPO_PUBLIC_API_URL` en `.env`:

   - Emulador Android: `http://10.0.2.2:5000/api`
   - Simulador iOS: `http://localhost:5000/api`
   - Expo Go o development build en teléfono: `http://<IP-LAN-DE-TU-PC>:5000/api`

3. Para usar Expo Go en un teléfono, expón Flask en la red local:

   ```powershell
   $env:FLASK_RUN_HOST = "0.0.0.0"
   python run.py
   ```

4. Desde esta carpeta ejecuta:

   ```powershell
   npm install
   npx expo start
   ```

El acceso por correo funciona en Expo Go. El acceso y registro con Google usa el SDK nativo de Google y necesita un development build; Expo Go no admite módulos OAuth nativos.

## Development build con Google

Configura `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en `.env`. En Google Cloud también debe existir un cliente OAuth de Android para el paquete `com.eniu.app` y la huella SHA-1 con la que se firme el APK. Para iOS agrega un cliente OAuth de iOS y configura `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.

Para Android con el SDK instalado localmente:

```powershell
npm run android:dev
```

O genera un APK interno mediante EAS:

```powershell
npx eas-cli build --profile development --platform android
```

Después inicia Metro para el development client:

```powershell
npm run start:dev
```

La app incluye inicio de sesión y registro por correo o Google, selección de negocio, dashboard, menús, productos, categorías, publicación con QR, analíticas y configuración de cuenta. Los tokens se almacenan con `expo-secure-store` en iOS y Android.

## Builds de preview y producción

`eas.json` fija `EXPO_PUBLIC_API_URL` y los dos client id de Google en los
perfiles `preview` y `production`, para que una build no salga apuntando al
backend local. Los tres valores son públicos —viajan dentro del bundle y el de
iOS ya está en `app.json`—, así que viven en el repositorio a propósito.

Para revocar la sesión de Apple al borrar una cuenta, el backend necesita
además la clave privada de Sign in with Apple; está documentado en
`server/eniu-backend/APPLE_CONFIGURATION.md`.

## Enviar a la App Store

`eas.json` fija sólo el `appleTeamId` en el perfil `submit`. Es el mismo Team ID
con el que el backend valida los tokens de Apple, no es secreto y no cambia.

Lo demás se queda deliberadamente fuera del archivo, que está versionado:

- **El Apple ID de la cuenta** se pasa por `EXPO_APPLE_ID`, para no dejar un
  correo personal en el repositorio.
- **La llave de App Store Connect API** conviene subirla a EAS con
  `eas credentials` en vez de guardar el `.p8` en disco. El `.gitignore` de la
  raíz ignora `*.p8` por si acaso.
- **El `ascAppId`** no existe hasta que la ficha de la app está creada en App
  Store Connect. El primer `eas submit --platform ios` la crea si hace falta y
  lo imprime; conviene añadirlo aquí después para que los siguientes envíos no
  vuelvan a preguntarlo.

No confundir las dos claves privadas del proyecto: la de **Sign in with Apple**
va en Render y sirve para revocar sesiones al borrar una cuenta
(`server/eniu-backend/APPLE_CONFIGURATION.md`); la de **App Store Connect API**
sirve para publicar y nunca toca el servidor.

## Validar

```powershell
npm run typecheck
npm run lint
```
