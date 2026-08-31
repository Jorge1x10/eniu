import ast
import pathlib
import re
import string
import unittest

from flask_jwt_extended import create_access_token

from app import create_app
from app.database.db import db
from app.extensions import bcrypt
from app.modules.auth.mailer import build_password_reset_email
from app.modules.users.model import User
from app.shared.i18n import normalize_language, resolve_language, translate
from app.shared.translations import CATALOGS

APP_ROOT = pathlib.Path(__file__).resolve().parent.parent / "app"


def _placeholders(text):
    """Nombres de los marcadores `{...}` de una cadena de formato."""
    return {
        name
        for _literal, name, _spec, _conv in string.Formatter().parse(text)
        if name
    }


class TranslationCatalogTestCase(unittest.TestCase):
    """Comprobaciones sobre el catálogo que no necesitan una app."""

    def test_every_catalog_entry_keeps_the_same_placeholders(self):
        # Una traducción a la que le falta un marcador reventaría al formatear,
        # y una que inventa uno se quedaría sin valor que poner.
        for language, catalog in CATALOGS.items():
            for source, translated in catalog.items():
                with self.subTest(language=language, source=source):
                    self.assertEqual(
                        _placeholders(source),
                        _placeholders(translated),
                        "los marcadores deben coincidir con los del español",
                    )

    def test_no_catalog_entry_is_left_untranslated(self):
        for language, catalog in CATALOGS.items():
            for source, translated in catalog.items():
                with self.subTest(language=language, source=source):
                    self.assertTrue(translated.strip(), "la traducción está vacía")
                    self.assertNotEqual(
                        source,
                        translated,
                        "quedó el texto en español como traducción",
                    )

    def test_every_message_wrapped_in_the_code_has_a_translation(self):
        """Red que atrapa el mensaje nuevo que nadie tradujo.

        Recorre las llamadas a `_()` del backend y exige que su texto exista
        como clave del catálogo. Sin esto, un mensaje añadido después saldría
        en español a un usuario en inglés y nadie se enteraría.
        """
        missing = []
        for path in sorted(APP_ROOT.rglob("*.py")):
            if "site-packages" in str(path):
                continue
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if not isinstance(node, ast.Call):
                    continue
                name = getattr(node.func, "id", None) or getattr(node.func, "attr", None)
                if name not in {"_", "translate"} or not node.args:
                    continue
                first = node.args[0]
                # Sólo se puede comprobar el literal: si el mensaje se arma en
                # una variable, esta prueba no tiene nada que mirar.
                if not isinstance(first, ast.Constant) or not isinstance(first.value, str):
                    continue
                for language, catalog in CATALOGS.items():
                    if first.value not in catalog:
                        missing.append(
                            f"{path.relative_to(APP_ROOT)}:{node.lineno} [{language}] {first.value!r}"
                        )

        self.assertEqual(
            [],
            missing,
            "hay mensajes sin traducción en el catálogo:\n" + "\n".join(missing),
        )


class LanguageResolutionTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "i18n-jwt-secret-at-least-32-bytes-long",
            "PASSWORD_RESET_SECRET_KEY": "i18n-reset-secret-at-least-32-bytes-long",
            "PASSWORD_RESET_TOKEN_MINUTES": 15,
            "FRONTEND_URL": "http://frontend.test",
            "MAIL_SUPPRESS_SEND": True,
            "MAIL_FROM": "test@eniu.app",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()
            speaker = User(
                email="english@example.com",
                username="english_user",
                phone_number="3311111111",
                password=bcrypt.generate_password_hash("CurrentPass1").decode("utf-8"),
                language="en",
            )
            db.session.add(speaker)
            db.session.commit()
            self.user_id = str(speaker.id)
            self.token = create_access_token(identity=self.user_id)
        self.client = self.app.test_client()

    def test_normalize_accepts_regional_tags_and_rejects_the_unknown(self):
        self.assertEqual("en", normalize_language("en-US"))
        self.assertEqual("es", normalize_language("es_MX"))
        self.assertEqual("en", normalize_language("  EN  "))
        self.assertIsNone(normalize_language("fr"))
        self.assertIsNone(normalize_language(None))
        self.assertIsNone(normalize_language(""))

    def test_new_accounts_default_to_spanish(self):
        with self.app.app_context():
            user = db.session.get(User, __import__("uuid").UUID(self.user_id))
            self.assertEqual("en", user.language)
            other = User(
                email="default@example.com",
                username="default_user",
                phone_number="3399999999",
            )
            db.session.add(other)
            db.session.commit()
            self.assertEqual("es", other.language)

    def test_the_header_decides_when_there_is_no_session(self):
        with self.app.test_request_context(headers={"Accept-Language": "en-US,en;q=0.9"}):
            self.assertEqual("en", resolve_language())
        with self.app.test_request_context(headers={"Accept-Language": "es-MX,es;q=0.9"}):
            self.assertEqual("es", resolve_language())
        # Un idioma que no hablamos cae al español en lugar de fallar.
        with self.app.test_request_context(headers={"Accept-Language": "fr-FR"}):
            self.assertEqual("es", resolve_language())
        with self.app.test_request_context():
            self.assertEqual("es", resolve_language())

    def test_the_account_preference_beats_the_browser_header(self):
        """El idioma elegido manda sobre el del navegador.

        Es el caso de quien tiene el teléfono en español pero quiere Eniu en
        inglés: si ganara la cabecera, su elección no serviría de nada.
        """
        response = self.client.patch(
            "/api/users/me",
            json={"name": "Sin cambios"},
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept-Language": "es-MX,es;q=0.9",
            },
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("Profile updated successfully", response.get_json()["message"])

    def test_errors_come_back_in_the_language_of_the_account(self):
        response = self.client.patch(
            "/api/users/me",
            json={"username": "ab"},
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            "Your username must be at least 4 characters long",
            response.get_json()["message"],
        )

    def test_an_invalid_session_answers_in_the_language_of_the_browser(self):
        # Sin sesión válida no hay preferencia guardada que consultar, así que
        # lo único que queda es lo que pide el navegador.
        response = self.client.patch(
            "/api/users/me",
            json={"name": "x"},
            headers={
                "Authorization": "Bearer not-a-real-token",
                "Accept-Language": "en-US",
            },
        )
        self.assertEqual(401, response.status_code)
        self.assertEqual("Your session is not valid", response.get_json()["message"])

    def test_changing_the_language_answers_already_in_the_new_one(self):
        response = self.client.patch(
            "/api/users/me",
            json={"language": "es"},
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(200, response.status_code)
        body = response.get_json()
        self.assertEqual("Perfil actualizado correctamente", body["message"])
        self.assertEqual("es", body["user"]["language"])

    def test_an_unsupported_language_is_rejected(self):
        response = self.client.patch(
            "/api/users/me",
            json={"language": "fr"},
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(400, response.status_code)
        self.assertEqual("That language is not valid", response.get_json()["message"])

    def test_the_reset_email_is_written_in_the_language_of_the_account(self):
        with self.app.test_request_context():
            english = build_password_reset_email(
                "english@example.com", "http://frontend.test/r?token=x", 15, "en"
            )
            spanish = build_password_reset_email(
                "spanish@example.com", "http://frontend.test/r?token=x", 15, "es"
            )

        self.assertEqual("Reset your ENIU password", english["Subject"])
        self.assertIn("The link will work for the next 15 minutes.", english.get_content())
        self.assertEqual("Restablece tu contraseña de ENIU", spanish["Subject"])
        self.assertIn("El enlace estará disponible durante 15 minutos.", spanish.get_content())

    def test_a_message_without_translation_falls_back_to_spanish(self):
        # El respaldo es lo que evita que una cadena nueva rompa la respuesta.
        self.assertEqual(
            "Un mensaje que nadie tradujo",
            translate("Un mensaje que nadie tradujo", language="en"),
        )

    def test_plan_names_follow_the_language_of_the_account(self):
        response = self.client.patch(
            "/api/users/me",
            json={"name": "Quien sea"},
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual("Free plan", response.get_json()["user"]["plan"]["name"])

    def test_no_user_facing_message_carries_broken_encoding(self):
        """Vigila el texto mal codificado que ya se coló una vez.

        `jwt_security.py` llegó a responder "La sesiÃ³n no es vÃ¡lida": UTF-8
        leído como latin-1. Se lee igual de mal en cualquier idioma, así que
        conviene que salte una prueba y no un usuario.
        """
        suspicious = re.compile(r"Ã|Â|â€")
        offenders = []
        for path in sorted(APP_ROOT.rglob("*.py")):
            if "site-packages" in str(path):
                continue
            for number, line in enumerate(
                path.read_text(encoding="utf-8").splitlines(), start=1
            ):
                if suspicious.search(line):
                    offenders.append(f"{path.relative_to(APP_ROOT)}:{number}")

        self.assertEqual([], offenders, "hay texto mal codificado en: " + ", ".join(offenders))


if __name__ == "__main__":
    unittest.main()
