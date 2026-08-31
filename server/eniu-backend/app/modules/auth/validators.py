from app.shared.i18n import _

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def validate_password(value):
    if not isinstance(value, str) or not value.strip():
        return _("La contraseña es obligatoria")
    if len(value) < PASSWORD_MIN_LENGTH:
        return _("La contraseña debe tener al menos {min} caracteres", min=PASSWORD_MIN_LENGTH)
    if len(value) > PASSWORD_MAX_LENGTH:
        return _("La contraseña no puede superar {max} caracteres", max=PASSWORD_MAX_LENGTH)
    return None
