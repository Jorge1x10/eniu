PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def validate_password(value):
    if not isinstance(value, str) or not value.strip():
        return "La contraseña es obligatoria"
    if len(value) < PASSWORD_MIN_LENGTH:
        return f"La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres"
    if len(value) > PASSWORD_MAX_LENGTH:
        return f"La contraseña no puede superar {PASSWORD_MAX_LENGTH} caracteres"
    return None
