# Versiones de la API y de la app móvil

La API la usan tres clientes que no se actualizan al mismo ritmo:

| Cliente | Cómo se actualiza | ¿Puede quedarse viejo? |
|---|---|---|
| Panel web y menú público (`client/eniu`) | Vercel, al desplegar | Sólo una pestaña abierta durante el despliegue |
| App móvil (`mobile/eniu-mobile`) | App Store y Google Play | **Sí, meses**: cada quien actualiza cuando quiere |
| Webhooks (Stripe, RevenueCat) | Lo decide el proveedor | Versión fija por configuración |

El problema real es la app: siempre hay teléfonos con versiones viejas.

## La política: una sola API, compatible hacia atrás

No hay `/api/v1` y `/api/v2`. Mantener dos árboles de rutas duplica el código y
las pruebas para un equipo pequeño. En su lugar:

1. **Añadir es libre.** Endpoints nuevos, campos nuevos en una respuesta y
   campos opcionales nuevos en una petición no rompen a nadie.
2. **Quitar o cambiar no lo es.** No se borra, renombra ni cambia de tipo un
   campo, ni se vuelve obligatorio uno que no lo era, mientras haya una
   versión admitida de la app que lo use.
3. **Si hace falta romper, se distingue al cliente.** `client_version()`
   (`app/modules/system/client_version.py`) dice qué app y qué versión hacen
   la petición, para responder distinto a la vieja mientras siga admitida:

   ```python
   from app.modules.system.client_version import client_version, parse_version

   client = client_version()  # None: web, webhook o app 2.2.0 o anterior
   if client and client[1] >= parse_version("3.0.0"):
       return jsonify(nuevo_formato)
   return jsonify(formato_anterior)
   ```

4. **Cuando ya no compensa, se obliga a actualizar** con la versión mínima
   (abajo), y entonces se borra el código de compatibilidad.

## Cómo sabe la API qué versión es

Desde la versión que incluye este cambio, la app manda en cada petición:

```text
X-Eniu-Platform: ios | android
X-Eniu-App-Version: 2.3.0
```

**La 2.2.0 y anteriores no las mandan**, y una petición sin ellas nunca se
bloquea (también es lo que manda el panel web). A esas versiones no se las
puede obligar a actualizar: sólo se puede no romperlas. Por eso hay que
publicar en las tiendas una versión con este cambio **antes** de cualquier
cambio incompatible, y esperar a que la mayoría actualice.

## Versión mínima y última versión

Variables de entorno del backend (vacías por defecto, sin efecto):

```text
MOBILE_MIN_VERSION=            # ambas plataformas
MOBILE_MIN_VERSION_IOS=        # anula la general para iOS
MOBILE_MIN_VERSION_ANDROID=    # anula la general para Android
MOBILE_LATEST_VERSION=         # (y _IOS / _ANDROID) para sugerir actualizar
MOBILE_STORE_URL_IOS=https://apps.apple.com/app/id6806468732
MOBILE_STORE_URL_ANDROID=https://play.google.com/store/apps/details?id=com.eniu.app
```

- **Por debajo de la mínima**, cualquier petición responde
  `426 Upgrade Required` con `code: "app_update_required"` y el enlace a la
  tienda, y la app se tapa con una pantalla que sólo lleva a actualizar.
  `GET /api/health` y `GET /api/app/version` siguen respondiendo.
- **Por debajo de la última**, la app sugiere actualizar una vez por versión,
  sin bloquear.
- La app consulta `GET /api/app/version?platform=ios&version=2.3.0` al abrirse
  y al volver del segundo plano. La respuesta se cachea 5 minutos.

Se cambian en el panel de Render, sin desplegar código.

## Procedimiento para un cambio incompatible (por ejemplo, la v3)

1. **Ya:** publicar en las tiendas una versión 2.x con las cabeceras (esta).
2. Construir la v3 con el backend **compatible con las dos**: lo nuevo para la
   v3 y lo de antes para la 2.x, usando `client_version()` donde haga falta.
3. Desplegar el backend antes que nada. Después, el panel web.
4. Publicar la v3 en App Store y en Google Play.
5. Cuando cada tienda la apruebe, poner `MOBILE_LATEST_VERSION_<PLATAFORMA>=3.0.0`:
   se sugiere actualizar.
6. Cuando la adopción lo permita, poner `MOBILE_MIN_VERSION_<PLATAFORMA>=3.0.0`.
   **Nunca antes de que la versión esté aprobada en esa tienda**: dejaría a sus
   usuarios sin ninguna app que funcione. Por eso hay una variable por
   plataforma.
7. Borrar el código de compatibilidad con la 2.x.

Las versiones 2.2.0 y anteriores no ven la pantalla de actualizar. Mientras
existan, lo que usan no se puede romper.
