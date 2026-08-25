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

## Validar

```powershell
npm run typecheck
npm run lint
```
