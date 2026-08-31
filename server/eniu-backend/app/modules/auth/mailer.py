import smtplib
from email.message import EmailMessage

from flask import current_app

from app.shared.i18n import _


def build_password_reset_email(recipient, reset_url, minutes, language=None):
    """Redacta el correo de recuperación en el idioma de la cuenta.

    El idioma se recibe explícitamente en lugar de deducirlo de la petición:
    quien pide recuperar su contraseña no tiene sesión, así que la cabecera del
    navegador diría poco y la preferencia guardada dice justo lo que hace falta.
    """
    message = EmailMessage()
    message["Subject"] = _("Restablece tu contraseña de ENIU", language=language)
    message["From"] = current_app.config["MAIL_FROM"]
    message["To"] = recipient
    message.set_content(
        _("Recibimos una solicitud para cambiar tu contraseña.", language=language)
        + "\n\n"
        + _("Abre este enlace para continuar: {url}", language=language, url=reset_url)
        + "\n\n"
        + _(
            "El enlace estará disponible durante {minutes} minutos.",
            language=language,
            minutes=minutes,
        )
        + "\n\n"
        + _(
            "Si tú no realizaste esta solicitud, puedes ignorar este mensaje.",
            language=language,
        )
    )
    return message


def send_email(message):
    if current_app.config.get("MAIL_SUPPRESS_SEND"):
        current_app.extensions.setdefault("mail_outbox", []).append(message)
        return

    host = current_app.config.get("MAIL_HOST")
    if not host:
        raise RuntimeError("MAIL_HOST no está configurado")

    with smtplib.SMTP(host, current_app.config["MAIL_PORT"], timeout=10) as smtp:
        if current_app.config.get("MAIL_USE_TLS"):
            smtp.starttls()
        username = current_app.config.get("MAIL_USERNAME")
        if username:
            smtp.login(username, current_app.config.get("MAIL_PASSWORD", ""))
        smtp.send_message(message)
