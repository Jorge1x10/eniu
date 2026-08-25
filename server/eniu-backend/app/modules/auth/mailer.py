import smtplib
from email.message import EmailMessage

from flask import current_app


def build_password_reset_email(recipient, reset_url, minutes):
    message = EmailMessage()
    message["Subject"] = "Restablece tu contraseña de ENIU"
    message["From"] = current_app.config["MAIL_FROM"]
    message["To"] = recipient
    message.set_content(
        "Recibimos una solicitud para cambiar tu contraseña.\n\n"
        f"Abre este enlace para continuar: {reset_url}\n\n"
        f"El enlace estará disponible durante {minutes} minutos.\n\n"
        "Si tú no realizaste esta solicitud, puedes ignorar este mensaje."
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
