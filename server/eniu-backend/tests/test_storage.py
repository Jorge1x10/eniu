import io
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from werkzeug.datastructures import FileStorage

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
            def url_for(self, folder, filename, *, private=False):
                kind = "signed" if private else "public"
                return f"https://cdn.example.com/{kind}/{Path(folder).name}/{filename}"

        original_backend = storage._backend
        storage._backend = FakeRemoteBackend()
        try:
            with self.app.test_request_context():
                response = storage.serve_file("uploads/products", "a.png")
                self.assertEqual(response.status_code, 302)
                self.assertEqual(
                    response.headers["Location"], "https://cdn.example.com/public/products/a.png"
                )
                self.assertEqual(response.headers["Cache-Control"], "public, max-age=60")

                # A private redirect must never be marked immutable: a signed
                # URL can expire well before a long browser cache would.
                private_response = storage.serve_file(
                    "uploads/covers", "b.png", private=True, immutable=True
                )
                self.assertEqual(
                    private_response.headers["Location"],
                    "https://cdn.example.com/signed/covers/b.png",
                )
                self.assertEqual(private_response.headers["Cache-Control"], "private, max-age=60")
        finally:
            storage._backend = original_backend

    def test_s3_backend_signs_private_urls_and_uses_public_base_url_for_public_ones(self):
        s3_backend = storage.S3Storage(
            bucket="eniu-uploads",
            prefix="",
            region="auto",
            endpoint_url=None,
            access_key="AKIAFAKEACCESSKEY",
            secret_key="fakesecretkey",
            public_base_url="https://cdn.eniu.app",
        )
        public_url = s3_backend.url_for("uploads/products", "a.png")
        self.assertEqual(public_url, "https://cdn.eniu.app/products/a.png")

        signed_url = s3_backend.url_for("uploads/covers", "b.png", private=True)
        self.assertIn("eniu-uploads", signed_url)
        self.assertIn("covers/b.png", signed_url)
        self.assertIn("X-Amz-Signature", signed_url)


if __name__ == "__main__":
    unittest.main()
