import unittest
from unittest.mock import patch

from app import create_app
from app.database.db import db


class SystemApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "JWT_SECRET_KEY": "system-jwt-secret-at-least-32-bytes",
            "SECRET_KEY": "system-secret",
        })
        cls.client = cls.app.test_client()

    def test_both_paths_report_the_service_alive(self):
        # Lo correcto es apuntar el health check a `/api/health`, pero la raíz
        # es lo que piden por defecto varias plataformas y antes daba 404: un
        # servicio dado por enfermo se reinicia, y un reinicio a destiempo deja
        # a alguien sin poder entrar.
        for path in ("/", "/api/health"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.get_json(), {"status": "ok", "service": "eniu-api"})

    def test_the_root_answers_head_too(self):
        # Muchos comprobadores usan HEAD en vez de GET.
        self.assertEqual(self.client.head("/").status_code, 200)

    def test_it_does_not_touch_the_database(self):
        # Se llama muchas veces por minuto. Si dependiera de la base, cualquier
        # hipo de la conexión se convertiría en un reinicio del servicio.
        with patch.object(db, "session") as session:
            self.assertEqual(self.client.get("/").status_code, 200)
            session.execute.assert_not_called()

    def test_an_unknown_path_still_returns_404(self):
        # La raíz responde, pero no se ha convertido en un comodín que tape
        # rutas mal escritas.
        self.assertEqual(self.client.get("/no-existe").status_code, 404)
        self.assertEqual(self.client.get("/api/no-existe").status_code, 404)


if __name__ == "__main__":
    unittest.main()
