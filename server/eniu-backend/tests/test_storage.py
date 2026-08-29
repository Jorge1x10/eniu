import io
import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from flask import Response
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import NotFound

from app import create_app, storage


class StorageTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "JWT_SECRET_KEY": "storage-tests-secret-at-least-32-bytes",
        })

    def setUp(self):
        storage.configure(self.app)  # local backend, regardless of env vars

    def test_local_backend_saves_serves_and_deletes(self):
        with TemporaryDirectory() as tmp_dir:
            folder = str(Path(tmp_dir) / "products")
            upload = FileStorage(
                stream=io.BytesIO(b"hello"), filename="a.png", content_type="image/png"
            )
            storage.save_file(folder, "a.png", upload)
            self.assertTrue((Path(folder) / "a.png").exists())

            with self.app.test_request_context():
                # Not content-addressed (caller didn't pass immutable=True):
                # short, revalidated lifetime, never "immutable".
                response = storage.serve_file(folder, "a.png")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers["Cache-Control"], "public, max-age=60")
                response.close()

                private_response = storage.serve_file(folder, "a.png", private=True)
                self.assertEqual(private_response.headers["Cache-Control"], "private, max-age=60")
                private_response.close()

                # Only safe when the URL itself embeds the filename.
                immutable_response = storage.serve_file(folder, "a.png", immutable=True)
                self.assertEqual(
                    immutable_response.headers["Cache-Control"],
                    "public, max-age=31536000, immutable",
                )
                immutable_response.close()

            storage.delete_file(folder, "a.png")
            self.assertFalse((Path(folder) / "a.png").exists())

    def test_delete_of_a_missing_local_file_does_not_raise(self):
        with TemporaryDirectory() as tmp_dir, self.app.app_context():
            storage.delete_file(str(Path(tmp_dir) / "missing"), "a.png")

    def test_redirects_to_a_public_url_when_the_backend_exposes_one(self):
        class FakeRemoteBackend:
            def url_for(self, folder, filename):
                return f"https://cdn.example.com/{Path(folder).name}/{filename}"

            def serve(self, folder, filename):
                return Response(b"bytes privados", mimetype="image/png")

        original_backend = storage._backend
        storage._backend = FakeRemoteBackend()
        try:
            with self.app.test_request_context():
                response = storage.serve_file("uploads/products", "a.png")
                self.assertEqual(response.status_code, 302)
                self.assertEqual(
                    response.headers["Location"], "https://cdn.example.com/products/a.png"
                )
                self.assertEqual(response.headers["Cache-Control"], "public, max-age=60")

                # Lo privado no se redirige nunca: el dashboard lo pide con
                # `fetch()` para mandar el JWT, y el navegador aplica CORS
                # también al destino del redirect, así que el bucket lo
                # bloquearía.
                private_response = storage.serve_file(
                    "uploads/covers", "b.png", private=True, immutable=True
                )
                self.assertEqual(private_response.status_code, 200)
                self.assertNotIn("Location", private_response.headers)
                self.assertEqual(private_response.get_data(), b"bytes privados")
                # Aunque se pida inmutable: la respuesta es del dueño y de ahora.
                self.assertEqual(private_response.headers["Cache-Control"], "private, max-age=60")
        finally:
            storage._backend = original_backend

    def test_public_assets_come_from_the_bucket_when_there_is_no_public_url(self):
        """Con S3 activo y sin S3_PUBLIC_BASE_URL, el disco local está vacío.

        Caer a `send_from_directory` ahí sería un 404 para cada comensal que
        abre el menú, que es justo lo que no puede pasar.
        """
        class BucketWithoutPublicUrl:
            def url_for(self, folder, filename):
                return None

            def serve(self, folder, filename):
                return Response(b"desde el bucket", mimetype="image/webp")

        original_backend = storage._backend
        storage._backend = BucketWithoutPublicUrl()
        try:
            with self.app.test_request_context():
                response = storage.serve_file("uploads/products", "a.webp")

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.get_data(), b"desde el bucket")
                self.assertEqual(response.headers["Cache-Control"], "public, max-age=60")
        finally:
            storage._backend = original_backend

    def test_s3_backend_builds_public_urls_from_the_public_base_url(self):
        s3_backend = storage.S3Storage(
            bucket="eniu-uploads",
            prefix="",
            region="auto",
            endpoint_url=None,
            access_key="AKIAFAKEACCESSKEY",
            secret_key="fakesecretkey",
            public_base_url="https://cdn.eniu.app",
        )

        self.assertEqual(
            s3_backend.url_for("uploads/products", "a.png"),
            "https://cdn.eniu.app/products/a.png",
        )

    def test_s3_backend_streams_a_private_object_instead_of_redirecting(self):
        s3_backend = storage.S3Storage(
            bucket="eniu-uploads", prefix="", region="auto", endpoint_url=None,
            access_key="AKIAFAKEACCESSKEY", secret_key="fakesecretkey",
            public_base_url="https://cdn.eniu.app",
        )
        requested = {}

        class FakeBody:
            def __init__(self):
                self.closed = False

            def iter_chunks(self, size):
                yield b"portada"

            def close(self):
                self.closed = True

        body = FakeBody()

        class FakeClient:
            def get_object(self, Bucket, Key):  # noqa: N803 - la firma es la de boto3
                requested.update(bucket=Bucket, key=Key)
                return {"Body": body, "ContentType": "image/webp", "ContentLength": 7}

        # El cliente se construye perezosamente y se cachea por PID; sustituirlo
        # aquí evita tocar la red desde una prueba.
        s3_backend._client_cache = FakeClient()
        s3_backend._client_pid = os.getpid()

        with self.app.test_request_context():
            response = s3_backend.serve("uploads/covers", "b.webp")

            self.assertEqual(requested, {"bucket": "eniu-uploads", "key": "covers/b.webp"})
            self.assertEqual(response.mimetype, "image/webp")
            self.assertEqual(response.headers["Content-Length"], "7")
            self.assertEqual(response.get_data(), b"portada")

    def test_a_missing_private_object_is_a_404_not_a_server_error(self):
        s3_backend = storage.S3Storage(
            bucket="eniu-uploads", prefix="", region="auto", endpoint_url=None,
            access_key="AKIAFAKEACCESSKEY", secret_key="fakesecretkey",
            public_base_url="https://cdn.eniu.app",
        )

        class MissingClient:
            def get_object(self, Bucket, Key):  # noqa: N803
                raise RuntimeError("NoSuchKey")

        s3_backend._client_cache = MissingClient()
        s3_backend._client_pid = os.getpid()

        # El archivo pudo borrarse entre que su nombre se guardó en la base y
        # alguien lo pidió; para quien pide, eso es un 404.
        with self.app.test_request_context(), self.assertRaises(NotFound):
            s3_backend.serve("uploads/covers", "b.webp")


if __name__ == "__main__":
    unittest.main()
