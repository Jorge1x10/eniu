# Costos y escalamiento

Este documento resume los cambios hechos para reducir el costo por usuario y
preparar la API para correr en más de una instancia.

## 1. Imágenes con caché ajustada a cada URL

Los nombres de archivo de fotos de negocio, imágenes de producto, portadas y
fondos de catálogo se generan con un UUID nuevo en cada subida (ver
`app/modules/*/services.py`), pero eso solo hace inmutable la URL en el
único endpoint donde el nombre de archivo vive en la propia ruta:
`GET /products/<product_id>/images/<filename>`. Ese es el único caso que usa
`Cache-Control: public, max-age=31536000, immutable`
(`storage.serve_file(..., immutable=True)`).

El resto de endpoints de imagen (foto de negocio por `business_id`, portada y
fondo de catálogo por `catalogue_id` o por slug del menú público, imagen de
producto por posición en el menú) están *indexados por un identificador
estable*, no por el archivo — el usuario puede reemplazar la foto y la URL
sigue siendo la misma, solo cambia qué archivo hay detrás. Marcarlos como
`immutable` haría que el navegador o un CDN sirvieran la imagen vieja para
siempre después de una actualización. Por eso usan una vida corta y
revalidable: `Cache-Control: public, max-age=60` (`private, max-age=60` en
los endpoints que requieren JWT, como la vista previa de plantilla en el
dashboard).

Esto no cuesta nada y ya reduce tráfico repetido en el navegador. El
beneficio grande llega al poner un CDN (Cloudflare, por ejemplo) delante del
dominio de la API: con estas cabeceras, el CDN puede servir las imágenes sin
volver a pegarle a Render en absoluto durante su ventana de caché.

## 2. Caché del menú público

`GET /api/public/menus/<slug>` (lo que golpea cada escaneo de QR) ahora se
cachea en el servidor por `PUBLIC_MENU_CACHE_SECONDS` (20s por defecto) antes
de tocar Postgres. Editar el menú puede tardar hasta ese tiempo en reflejarse
públicamente; es un costo aceptable a cambio de no repetir la misma consulta
en cada escaneo durante una hora pico.

```text
PUBLIC_MENU_CACHE_SECONDS=20
```

## 3. Redis opcional para caché y rate limiting

Con una sola instancia, memoria de proceso (`SimpleCache` / `memory://`) es
suficiente y es lo que se usa por defecto. En cuanto la API corra en más de
una instancia, define:

```text
REDIS_URL=redis://usuario:password@host:6379/0
```

Esto activa automáticamente:
- `Flask-Limiter` con almacenamiento compartido en Redis (antes cada
  instancia contaba peticiones por separado).
- `Flask-Caching` con `RedisCache` para el punto 2, compartido entre
  instancias en vez de aislado por proceso.

Render ofrece un addon de Key Value (Redis-compatible); también sirve
Upstash u otro proveedor administrado.

## 4. Storage externo (S3-compatible) opcional

Hoy los uploads se guardan en disco local dentro del proceso de la API
(`BUSINESS_UPLOAD_FOLDER`, etc.), lo cual se pierde en cada redeploy y no se
comparte entre instancias — es el principal bloqueador para escalar a más de
un dyno/instancia. `app/storage.py` agrega un backend alterno:

```text
STORAGE_BACKEND=s3
S3_BUCKET=eniu-uploads
S3_REGION=auto
S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://cdn.eniu.app
```

Funciona con cualquier proveedor compatible con S3 (recomendado: **Cloudflare
R2** por no cobrar egress, que es el costo que más se dispara al servir
imágenes). Con `STORAGE_BACKEND=s3`:
- Las subidas van directo al bucket, con `Cache-Control` inmutable puesto en
  el objeto mismo (el *objeto* sí es content-addressed por su key aunque la
  URL de la API que apunta a él no lo sea — ver punto 1).
- Los endpoints públicos que antes streameaban el archivo ahora hacen un
  `redirect` 302 a `S3_PUBLIC_BASE_URL`, así que el ancho de banda de esas
  imágenes deja de pasar por la API.
- Los endpoints privados (los que requieren JWT, como la vista previa de
  plantilla) redirigen en cambio a una URL firmada de un minuto de vigencia:
  así el bucket no necesita ser público para que esto funcione, y quien
  guarde o comparta ese enlace no puede reusarlo después de que expire —
  el JWT sigue siendo lo que controla el acceso en cada visita.
- Sin `STORAGE_BACKEND` (o con `local`), el comportamiento es exactamente el
  de antes: nada cambia si no se configuran estas variables.

Antes de activarlo en producción, crea el bucket, publícalo (o ponle un
dominio propio delante) y confirma que `S3_PUBLIC_BASE_URL` resuelve a los
objetos subidos.

## Qué falta después de esto

- Poner Cloudflare (u otro CDN/proxy) delante del dominio de la API para que
  las cabeceras de caché del punto 1 se aprovechen a nivel de borde, no solo
  en el navegador del visitante.
- Migrar los uploads existentes en disco al bucket antes de activar
  `STORAGE_BACKEND=s3` en un ambiente con datos reales (este cambio no migra
  archivos ya subidos).
