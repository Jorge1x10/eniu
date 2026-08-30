import unittest
from email.utils import parseaddr
from unittest.mock import MagicMock, patch

from app import create_app
from app.modules.auth.mailer import build_password_reset_email, send_email


def make_app(**overrides):
    config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "mailer-jwt-secret-at-least-32-bytes",
        "SECRET_KEY": "mailer-secret",
        "MAIL_HOST": "smtp.example.com",
        "MAIL_PORT": 587,
        "MAIL_USE_TLS": True,
        "MAIL_USERNAME": "cuenta@example.com",
        "MAIL_PASSWORD": "contraseña",
        "MAIL_FROM": "cuenta@example.com",
        "MAIL_SUPPRESS_SEND": False,
    }
    config.update(overrides)
    return create_app(config)


class PasswordResetEmailTestCase(unittest.TestCase):
    def build(self, **overrides):
        with make_app(**overrides).app_context():
            return build_password_reset_email("alguien@example.com", "https://app.eniu.app/reset-password?token=abc", 15)

    def test_a_bare_address_gets_a_visible_name(self):
        # Un aviso de contraseña que llega de una dirección pelada se parece
        # demasiado a los que intentan robarla.
        message = self.build(MAIL_FROM="eniumenu@gmail.com")
        self.assertEqual(parseaddr(message["From"]), ("Eniu", "eniumenu@gmail.com"))

    def test_a_configured_name_is_left_alone(self):
        message = self.build(MAIL_FROM="Eniu Soporte <hola@eniu.app>")
        self.assertEqual(parseaddr(message["From"]), ("Eniu Soporte", "hola@eniu.app"))

    def test_it_carries_date_and_message_id(self):
        # Sin ellos el correo puntúa peor en los filtros, y uno de recuperación
        # que cae en spam es una cuenta que no se recupera.
        message = self.build(MAIL_FROM="eniumenu@gmail.com")
        self.assertTrue(message["Date"])
        self.assertTrue(message["Message-ID"].endswith("@gmail.com>"))

    def test_the_link_and_the_deadline_reach_the_body(self):
        body = self.build().get_content()
        self.assertIn("https://app.eniu.app/reset-password?token=abc", body)
        self.assertIn("15 minutos", body)


class SendEmailTransportTestCase(unittest.TestCase):
    def send_on_port(self, port):
        message = None
        with make_app(MAIL_PORT=port).app_context():
            message = build_password_reset_email("alguien@example.com", "https://app.eniu.app/x", 15)
            with patch("smtplib.SMTP") as plain, patch("smtplib.SMTP_SSL") as implicit:
                plain.return_value = MagicMock()
                implicit.return_value = MagicMock()
                send_email(message)
                return plain, implicit

    def test_port_587_negotiates_starttls(self):
        plain, implicit = self.send_on_port(587)
        implicit.assert_not_called()
        plain.assert_called_once()
        plain.return_value.__enter__.return_value.starttls.assert_called_once()

    def test_port_465_opens_an_already_encrypted_connection(self):
        # En el 465 no hay STARTTLS que negociar. Pedirlo deja la petición
        # colgada hasta el timeout sin ningún error que explique el motivo.
        plain, implicit = self.send_on_port(465)
        plain.assert_not_called()
        implicit.assert_called_once()
        implicit.return_value.__enter__.return_value.starttls.assert_not_called()

    def test_it_refuses_to_send_without_a_host(self):
        with make_app(MAIL_HOST=None).app_context():
            message = build_password_reset_email("alguien@example.com", "https://app.eniu.app/x", 15)
            with self.assertRaises(RuntimeError):
                send_email(message)

    def test_suppressed_sending_lands_in_the_outbox(self):
        app = make_app(MAIL_SUPPRESS_SEND=True)
        with app.app_context():
            message = build_password_reset_email("alguien@example.com", "https://app.eniu.app/x", 15)
            send_email(message)
            self.assertEqual(app.extensions["mail_outbox"], [message])


if __name__ == "__main__":
    unittest.main()
