import smtplib
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid, parseaddr

from flask import current_app

# Puerto de TLS implícito. No es lo mismo que STARTTLS y no se negocia igual.
IMPLICIT_TLS_PORT = 465


def _sender():
    """Remitente con nombre visible.

    Un aviso de contraseña que llega de una dirección pelada de gmail.com se
    parece mucho a los que intentan robarla, y tanto los filtros como quien lo
    recibe lo notan. Si `MAIL_FROM` ya trae un nombre se respeta tal cual.
    """
    configured = current_app.config["MAIL_FROM"]
    name, address = parseaddr(configured)
    if name or not address:
        return configured
    return formataddr(("Eniu", address))


def build_password_reset_email(recipient, reset_url, minutes):
    message = EmailMessage()
    message["Subject"] = "Restablece tu contraseña de ENIU"
    message["From"] = _sender()
    message["To"] = recipient
    # Ni `EmailMessage` ni `send_message` los ponen, y un correo sin fecha ni
    # identificador puntúa peor en los filtros de spam. Hoy los añadiría Gmail
    # al reenviarlo, pero eso deja de ser cierto el día que se cambie de
    # proveedor, y un correo de recuperación que cae en spam es una cuenta que
    # no se recupera.
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = make_msgid(domain=parseaddr(message["From"])[1].partition("@")[2] or None)
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

    port = current_app.config["MAIL_PORT"]

    # En el 465 la conexión nace ya cifrada y no hay STARTTLS que negociar. Con
    # `SMTP` a secas el cliente manda un saludo en claro que el servidor nunca
    # contesta, y la petición se queda colgada hasta agotar el timeout sin un
    # error que explique el motivo. Elegir la clase por el puerto evita esa
    # media hora de depuración.
    connect = smtplib.SMTP_SSL if port == IMPLICIT_TLS_PORT else smtplib.SMTP

    with connect(host, port, timeout=10) as smtp:
        if current_app.config.get("MAIL_USE_TLS") and connect is smtplib.SMTP:
            smtp.starttls()
        username = current_app.config.get("MAIL_USERNAME")
        if username:
            smtp.login(username, current_app.config.get("MAIL_PASSWORD", ""))
        smtp.send_message(message)
