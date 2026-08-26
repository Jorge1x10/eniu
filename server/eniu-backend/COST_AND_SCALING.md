# Costos y escalamiento

Este documento resume los cambios hechos para reducir el costo por usuario y
preparar la API para correr en más de una instancia.

## 1. Imágenes con caché inmutable

Los nombres de archivo de fotos de negocio, imágenes de producto, portadas y
fondos de catálogo se generan con un UUID nuevo en cada subida (ver
`app/modules/*/services.py`), así que una URL nunca cambia de contenido.
Todos los endpoints que sirven esas imágenes ahora responden con
`Cache-Control: public, max-age=31536000, immutable` (o `private` cuando el
endpoint requiere JWT, como la vista previa de plantilla en el dashboard).

Esto no cuesta nada y ya reduce tráfico repetido en el navegador. El
beneficio grande llega al poner un CDN (Cloudflare, por ejemplo) delante del
dominio de la API: con esta cabecera, el CDN puede servir las imágenes sin
volver a pegarle a Render en absoluto.

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
  el objeto mismo.
- Los endpoints que antes streameaban el archivo ahora hacen un `redirect`
  302 a `S3_PUBLIC_BASE_URL`, así que el ancho de banda de las imágenes deja
  de pasar por la API.
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
