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
instead of streaming the bytes through this API.
"""
from pathlib import Path

from flask import redirect, send_from_directory

from app.http_cache import cache_immutable_asset


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
            pass

    def url_for(self, folder, filename):
        return None


class S3Storage:
    def __init__(self, *, bucket, prefix, region, endpoint_url, access_key, secret_key, public_base_url):
        import boto3  # only imported when this backend is actually selected

        if not bucket:
            raise RuntimeError("S3_BUCKET is required when STORAGE_BACKEND=s3")

        self._bucket = bucket
        self._prefix = (prefix or "").strip("/")
        self._public_base_url = public_base_url.rstrip("/") if public_base_url else None
        self._client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url or None,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    def _key(self, folder, filename):
        parts = [self._prefix, Path(folder).name, filename]
        return "/".join(part for part in parts if part)

    def save(self, folder, filename, file_obj):
        file_obj.stream.seek(0)
        extra_args = {
            # Filenames are UUIDs minted per upload, so the same key never
            # changes content: safe to hand out a far-future cache lifetime.
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
        self._client.delete_object(Bucket=self._bucket, Key=self._key(folder, filename))

    def url_for(self, folder, filename):
        if not self._public_base_url:
            return None
        return f"{self._public_base_url}/{self._key(folder, filename)}"


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


def save_file(folder, filename, file_obj):
    _backend.save(folder, filename, file_obj)


def delete_file(folder, filename):
    _backend.delete(folder, filename)


def serve_file(folder, filename, *, private=False):
    """Return a Flask response for `filename`: a redirect straight to the
    bucket/CDN when one is configured, otherwise the file streamed from
    local disk."""
    url = _backend.url_for(folder, filename)
    if url:
        response = redirect(url, code=302)
        response.headers["Cache-Control"] = "no-store" if private else "public, max-age=300"
        return response
    response = send_from_directory(folder, filename)
    return cache_immutable_asset(response, private=private)
