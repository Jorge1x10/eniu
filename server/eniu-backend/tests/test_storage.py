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
                response = storage.serve_file(folder, "a.png")
                self.assertEqual(response.status_code, 200)
                self.assertIn("immutable", response.headers["Cache-Control"])
                self.assertIn("public", response.headers["Cache-Control"])
                response.close()

                private_response = storage.serve_file(folder, "a.png", private=True)
                self.assertIn("private", private_response.headers["Cache-Control"])
                private_response.close()

            storage.delete_file(folder, "a.png")
            self.assertFalse((Path(folder) / "a.png").exists())

    def test_redirects_to_a_public_url_when_the_backend_exposes_one(self):
        class FakeRemoteBackend:
            def url_for(self, folder, filename):
                return f"https://cdn.example.com/{Path(folder).name}/{filename}"

        original_backend = storage._backend
        storage._backend = FakeRemoteBackend()
        try:
            with self.app.test_request_context():
                response = storage.serve_file("uploads/products", "a.png")
                self.assertEqual(response.status_code, 302)
                self.assertEqual(
                    response.headers["Location"], "https://cdn.example.com/products/a.png"
                )
                self.assertEqual(response.headers["Cache-Control"], "public, max-age=300")

                private_response = storage.serve_file("uploads/covers", "b.png", private=True)
                self.assertEqual(private_response.headers["Cache-Control"], "no-store")
        finally:
            storage._backend = original_backend


if __name__ == "__main__":
    unittest.main()
