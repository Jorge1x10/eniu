"""Pluggable storage for uploaded images (business photos, product photos,
catalogue covers/backgrounds).

Defaults to local disk, which is what this app has always done. That is
fine for a single instance, but local files do not survive a redeploy and
are not shared across instances, so it blocks running more than one
instance of the API.

Set STORAGE_BACKEND=s3 (plus the S3_* config below) to store uploads in an
S3-compatible bucket instead: AWS S3, Cloudflare R2, Backblaze B2,
DigitalOcean Spaces, etc. Point S3_PUBLIC_BASE_URL at whatever serves that
bucket's objects publicly (a custom domain on a public R2 bucket, a
CloudFront distribution, ...) so `serve_file` can redirect straight to it
for public assets instead of streaming the bytes through this API.

Los assets privados (private=True) son la excepción: esos sí viajan por la
API. Redirigirlos al bucket parece más barato, pero el dashboard los pide con
`fetch()` para poder mandar el JWT, y el navegador aplica CORS también al
destino del redirect: la petición al bucket se bloquea con «No
'Access-Control-Allow-Origin' header is present». Se podría configurar CORS en
el bucket, pero entonces cada origen nuevo del frontend obligaría a tocar la
consola de Cloudflare, y el ancho de banda que se ahorra es el de tres
imágenes que sólo mira el dueño mientras edita su plantilla. El tráfico que
importa —el de los comensales— sigue sin pasar por aquí.
"""
import os
from pathlib import Path

from flask import current_app, redirect, send_from_directory
from werkzeug.exceptions import NotFound

from app.http_cache import asset_cache_control


class LocalStorage:
    def save(self, folder, filename, file_obj):
        directory = Path(folder)
        directory.mkdir(parents=True, exist_ok=True)
        file_obj.stream.seek(0)
        file_obj.save(directory / filename)

    def delete(self, folder, filename):
        try:
            (Path(folder) / filename).unlink(missing_ok=True)
        except OSError:
            current_app.logger.warning("No fue posible eliminar el archivo %s", filename)

    def url_for(self, folder, filename):
        return None

    def serve(self, folder, filename):
        # El disco local no necesita nada especial: `serve_file` cae a
        # `send_from_directory`, que es lo que siempre hizo.
        return None


class S3Storage:
    def __init__(self, *, bucket, prefix, region, endpoint_url, access_key, secret_key, public_base_url):
        if not bucket:
            raise RuntimeError("S3_BUCKET is required when STORAGE_BACKEND=s3")

        self._bucket = bucket
        self._prefix = (prefix or "").strip("/")
        self._public_base_url = public_base_url.rstrip("/") if public_base_url else None
        self._client_options = {
            "region_name": region,
            "endpoint_url": endpoint_url or None,
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
        }
        self._client_cache = None
        self._client_pid = None

    @property
    def _client(self):
        """El cliente de boto3, creado perezosamente y por proceso.

        Dos razones para no construirlo en `__init__`:

        1. Importar boto3 carga los modelos JSON de botocore, que son decenas
           de MB de RSS. Diferirlo hasta la primera subida deja ese costo
           fuera del arranque, y sobre todo fuera de los workers que sólo
           sirven lecturas.
        2. Con `preload_app` en gunicorn, `__init__` corre antes del fork. Un
           cliente de botocore mantiene un pool de conexiones HTTP, y esos
           sockets no se pueden compartir entre procesos: heredarlos produce
           los mismos errores cruzados que un pool de Postgres compartido.
           Al recordar el PID que lo creó, cada worker construye el suyo la
           primera vez que lo necesita.
        """
        import boto3  # only imported when this backend is actually used

        pid = os.getpid()
        if self._client_cache is None or self._client_pid != pid:
            self._client_cache = boto3.client("s3", **self._client_options)
            self._client_pid = pid
        return self._client_cache

    def _key(self, folder, filename):
        parts = [self._prefix, Path(folder).name, filename]
        return "/".join(part for part in parts if part)

    def save(self, folder, filename, file_obj):
        file_obj.stream.seek(0)
        extra_args = {
            # The S3 *object* really is content-addressed: filenames are
            # UUIDs minted per upload and a deleted/replaced upload gets a
            # new key, so a far-future cache lifetime on the object itself
            # is safe regardless of whether the API's own URL for it is.
            "CacheControl": "public, max-age=31536000, immutable",
        }
        if file_obj.mimetype:
            extra_args["ContentType"] = file_obj.mimetype
        self._client.upload_fileobj(
            file_obj.stream,
            self._bucket,
            self._key(folder, filename),
            ExtraArgs=extra_args,
        )

    def delete(self, folder, filename):
        try:
            self._client.delete_object(Bucket=self._bucket, Key=self._key(folder, filename))
        except Exception:
            current_app.logger.warning(
                "No fue posible eliminar %s de S3", self._key(folder, filename)
            )

    def url_for(self, folder, filename):
        if not self._public_base_url:
            return None
        return f"{self._public_base_url}/{self._key(folder, filename)}"

    def serve(self, folder, filename):
        """Devuelve el objeto del bucket como respuesta de esta API.

        Sólo se usa para los assets privados. Se transmite por trozos en vez
        de cargarlo entero en memoria: la instancia tiene 512 MB y no hay
        razón para que una portada de varios megabytes viva en RAM mientras
        se envía.
        """
        key = self._key(folder, filename)
        try:
            stored = self._client.get_object(Bucket=self._bucket, Key=key)
        except Exception as error:
            # Que el objeto no esté es un 404 para quien lo pide, no un error
            # del servidor: el archivo pudo borrarse entre que se guardó el
            # nombre en la base y alguien lo pidió.
            current_app.logger.warning("No fue posible leer %s de S3", key)
            raise NotFound() from error
        body = stored["Body"]
        response = current_app.response_class(
            body.iter_chunks(64 * 1024),
            mimetype=stored.get("ContentType") or "application/octet-stream",
        )
        if stored.get("ContentLength") is not None:
            response.headers["Content-Length"] = str(stored["ContentLength"])
        response.call_on_close(body.close)
        return response


_backend = LocalStorage()


def configure(app):
    global _backend
    if app.config.get("STORAGE_BACKEND") == "s3":
        _backend = S3Storage(
            bucket=app.config.get("S3_BUCKET"),
            prefix=app.config.get("S3_PREFIX"),
            region=app.config.get("S3_REGION"),
            endpoint_url=app.config.get("S3_ENDPOINT_URL"),
            access_key=app.config.get("S3_ACCESS_KEY_ID"),
            secret_key=app.config.get("S3_SECRET_ACCESS_KEY"),
            public_base_url=app.config.get("S3_PUBLIC_BASE_URL"),
        )
    else:
        _backend = LocalStorage()


def public_url(folder, filename):
    """La URL desde la que un visitante puede pedir el archivo sin pasar por
    esta API, o `None` si no hay una.

    Sirve para que el menú público anuncie directamente la del bucket: cada
    escaneo pide una imagen por producto, y aunque el 302 no mueva los bytes,
    la petición sí llega hasta aquí. Devolver `None` —almacenamiento local, o
    S3 sin `S3_PUBLIC_BASE_URL`— deja que el llamador use su ruta por la API.
    """
    if not filename:
        return None
    return _backend.url_for(folder, filename)


def save_file(folder, filename, file_obj):
    _backend.save(folder, filename, file_obj)


def delete_file(folder, filename):
    _backend.delete(folder, filename)


def serve_file(folder, filename, *, private=False, immutable=False):
    """Return a Flask response for `filename`: a redirect straight to the
    bucket/CDN when one is configured, otherwise the file streamed from
    local disk.

    Pass immutable=True only when `filename` (or something equally unique
    to this exact file) is itself part of the request URL, so a changed
    file is guaranteed to live at a different URL. Endpoints keyed by a
    stable id (business_id, catalogue_id, a menu slug, a product's position
    in the menu) must leave this False: the file behind that URL can change
    on a re-upload while the URL stays the same, so a long cache lifetime
    would keep serving the old image long after it was replaced.
    """
    immutable = immutable and not private  # lo privado nunca se cachea para siempre
    cache_control = asset_cache_control(private=private, immutable=immutable)

    if private:
        # Por qué no un redirect al bucket: ver el comentario de arriba.
        response = _backend.serve(folder, filename)
    else:
        url = _backend.url_for(folder, filename)
        # Sin URL pública configurada, el archivo se sirve desde el bucket en
        # vez de buscarlo en el disco: con STORAGE_BACKEND=s3 y sin
        # S3_PUBLIC_BASE_URL, en el disco no está, y caer ahí sería un 404 para
        # cada comensal. Cuesta ancho de banda, pero un menú que se ve mal
        # cuesta más.
        response = redirect(url, code=302) if url else _backend.serve(folder, filename)

    if response is None:
        response = send_from_directory(folder, filename)
    response.headers["Cache-Control"] = cache_control
    return response
