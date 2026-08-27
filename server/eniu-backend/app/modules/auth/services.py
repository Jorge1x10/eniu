from app.modules.users.model import User
from flask import current_app
from app.extensions import bcrypt
from app.database.db import db
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import UUID, uuid4

import jwt as pyjwt
from flask_jwt_extended import create_access_token, create_refresh_token

from app.modules.auth.mailer import build_password_reset_email, send_email
from app.modules.auth.model import PasswordResetToken
from app.modules.auth.validators import validate_password

def register_user(data):
    username = data["username"].strip()
    email = data["email"].strip().lower()
    phone_number = data["phone"].strip()

    existing_user = User.query.filter(
        or_(
            User.email == email,
            User.username == username,
            User.phone_number == phone_number
        )
    ).first()

    if existing_user:
        if existing_user.email == email:
            return None, {
                "code": "email_already_exists",
                "message": "El correo ya está registrado"
            }

        if existing_user.username == username:
            return None, {
                "code": "username_already_exists",
                "message": "El nombre de usuario ya está registrado"
            }

        if existing_user.phone_number == phone_number:
            return None, {
                "code": "phone_already_exists",
                "message": "El teléfono ya está registrado"
            }

    password_error = validate_password(data.get("password"))
    if password_error:
        return None, {"code": "invalid_password", "message": password_error}

    password_hash = bcrypt.generate_password_hash(
        data["password"]
    ).decode("utf-8")

    new_user = User(
        username=username,
        email=email,
        phone_number=phone_number,
        password=password_hash
    )

    try:
        db.session.add(new_user)
        db.session.commit()

        return new_user, None

    except IntegrityError as error:
        db.session.rollback()
        current_app.logger.exception(error)

        return None, {
            "code": "integrity_error",
            "message": "El correo, usuario o teléfono ya está registrado"
        }

    except Exception as error:
        db.session.rollback()
        current_app.logger.exception(error)

        return None, {
            "code": "database_error",
            "message": "No fue posible registrar al usuario"
        }
    
def authenticate_user(identifier, password):
    identifier = identifier.strip()

    user = User.query.filter(
        or_(
            User.email == identifier.lower(),
            User.username == identifier
        )
    ).first()

    if not user:
        return None

    if not user.password:
        return None

    password_is_valid = bcrypt.check_password_hash(
        user.password,
        password
    )

    if not password_is_valid:
        return None

    return user

def get_user_by_id(user_id):
    try:
        return db.session.get(User, UUID(str(user_id)))
    except (TypeError, ValueError):
        return None


def _session_tokens(user):
    identity = str(user.id)
    return {
        "access_token": create_access_token(identity=identity, expires_delta=timedelta(hours=2)),
        "refresh_token": create_refresh_token(identity=identity, expires_delta=timedelta(hours=2)),
    }


def change_password(user_id, current_password, new_password):
    user = get_user_by_id(user_id)
    if not user:
        return None, "Usuario no encontrado", 404
    if not user.password:
        return None, "Usa la recuperación por correo para establecer una contraseña", 400
    if not isinstance(current_password, str) or not bcrypt.check_password_hash(user.password, current_password):
        return None, "La contraseña actual es incorrecta", 400

    error = validate_password(new_password)
    if error:
        return None, error, 400
    if bcrypt.check_password_hash(user.password, new_password):
        return None, "La nueva contraseña debe ser diferente de la actual", 400

    try:
        user.password = bcrypt.generate_password_hash(new_password).decode("utf-8")
        user.auth_version += 1
        db.session.commit()
        return _session_tokens(user), None, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return None, "No fue posible actualizar la contraseña", 500


def revoke_other_sessions(user_id):
    user = get_user_by_id(user_id)
    if not user:
        return None, "Usuario no encontrado", 404
    try:
        user.auth_version += 1
        db.session.commit()
        return _session_tokens(user), None, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return None, "No fue posible cerrar las sesiones", 500


def _jti_hash(jti):
    return sha256(jti.encode("utf-8")).hexdigest()


def request_password_reset(email):
    normalized_email = email.strip().lower()
    user = User.query.filter(db.func.lower(User.email) == normalized_email).first()
    if not user:
        return

    now = datetime.now(timezone.utc)
    recent = PasswordResetToken.query.filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.created_at >= now - timedelta(seconds=60),
    ).first()
    if recent:
        return

    PasswordResetToken.query.filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({PasswordResetToken.used_at: now}, synchronize_session=False)

    minutes = current_app.config["PASSWORD_RESET_TOKEN_MINUTES"]
    expires_at = now + timedelta(minutes=minutes)
    jti = uuid4().hex
    claims = {
        "sub": str(user.id),
        "jti": jti,
        "iat": now,
        "exp": expires_at,
        "aud": "eniu-password-reset",
        "purpose": "password_reset",
    }
    token = pyjwt.encode(
        claims,
        current_app.config["PASSWORD_RESET_SECRET_KEY"],
        algorithm="HS256",
    )
    record = PasswordResetToken(
        user_id=user.id,
        jti_hash=_jti_hash(jti),
        expires_at=expires_at,
    )
    db.session.add(record)
    db.session.commit()

    reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
    try:
        send_email(build_password_reset_email(user.email, reset_url, minutes))
    except Exception:
        record.used_at = datetime.now(timezone.utc)
        db.session.commit()
        raise


def _decode_reset_token(token):
    if not current_app.config.get("PASSWORD_RESET_SECRET_KEY"):
        return None, "El enlace de recuperación no es válido"
    try:
        payload = pyjwt.decode(
            token,
            current_app.config["PASSWORD_RESET_SECRET_KEY"],
            algorithms=["HS256"],
            audience="eniu-password-reset",
            options={"require": ["sub", "jti", "iat", "exp", "aud", "purpose"]},
        )
    except pyjwt.ExpiredSignatureError:
        return None, "El enlace de recuperación venció"
    except pyjwt.PyJWTError:
        return None, "El enlace de recuperación no es válido"
    if payload.get("purpose") != "password_reset":
        return None, "El enlace de recuperación no es válido"
    return payload, None


def reset_password(token, new_password):
    payload, decode_error = _decode_reset_token(token)
    if decode_error:
        return decode_error, 400
    password_error = validate_password(new_password)
    if password_error:
        return password_error, 400

    try:
        record = PasswordResetToken.query.filter_by(
            jti_hash=_jti_hash(payload["jti"]),
        ).with_for_update().first()
        user = get_user_by_id(payload["sub"])
        if not record or record.used_at or not user or record.user_id != user.id:
            db.session.rollback()
            return "El enlace de recuperación ya fue utilizado o no es válido", 400
        if user.password and bcrypt.check_password_hash(user.password, new_password):
            db.session.rollback()
            return "La nueva contraseña debe ser diferente de la actual", 400

        now = datetime.now(timezone.utc)
        user.password = bcrypt.generate_password_hash(new_password).decode("utf-8")
        user.auth_version += 1
        PasswordResetToken.query.filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({PasswordResetToken.used_at: now}, synchronize_session=False)
        db.session.commit()
        return None, 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return "No fue posible actualizar la contraseña", 500

def update_user_profile(user_id, data):
    user = get_user_by_id(user_id)

    if not user:
        return None, "Usuario no encontrado"

    if "phone" in data:
        phone = data["phone"].strip()

        existing_user = User.query.filter(
            User.phone_number == phone,
            User.id != user.id
        ).first()

        if existing_user:
            return None, "El teléfono ya está registrado"

        user.phone_number = phone

    if "username" in data:
        username = data["username"].strip()

        existing_user = User.query.filter(
            User.username == username,
            User.id != user.id
        ).first()

        if existing_user:
            return None, "El nombre de usuario ya está registrado"

        user.username = username

    try:
        db.session.commit()
        return user, None

    except Exception:
        db.session.rollback()
        return None, "No fue posible actualizar el perfil"
    
def authenticate_google_user(credential):
    try:
        google_data = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            current_app.config["GOOGLE_CLIENT_ID"],
            clock_skew_in_seconds=5
        )

    except (ValueError, Exception):
        return None, {
            "code": "invalid_google_credential",
            "message": "La credencial de Google no es válida"
        }

    if not google_data.get("email_verified"):
        return None, {
            "code": "unverified_email",
            "message": "Google no ha verificado este correo"
        }

    google_id = google_data["sub"]
    email = google_data["email"].strip().lower()
    name = google_data.get("name")
    picture = google_data.get("picture")

    user = User.query.filter_by(
        google_id=google_id
    ).first()

    if user:
        return user, None

    user = User.query.filter_by(
        email=email
    ).first()

    if user:
        if user.google_id and user.google_id != google_id:
            return None, {
                "code": "google_account_conflict",
                "message": "El correo ya está vinculado con otra cuenta de Google"
            }

        user.google_id = google_id

        if not user.name:
            user.name = name

        if not user.profile_picture:
            user.profile_picture = picture

    else:
        user = User(
            name=name,
            email=email,
            google_id=google_id,
            profile_picture=picture,
            password=None,
            username=None,
            phone_number=None
        )

        db.session.add(user)

    try:
        db.session.commit()
        return user, None

    except IntegrityError:
        db.session.rollback()

        return None, {
            "code": "google_account_conflict",
            "message": "No fue posible vincular esta cuenta de Google"
        }

    except Exception:
        db.session.rollback()

        return None, {
            "code": "database_error",
            "message": "No fue posible autenticar al usuario"
        }


APPLE_ISSUER = "https://appleid.apple.com"
APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"

# El cliente cachea el JWKS de Apple, así que se crea una sola vez por proceso.
_apple_jwk_client = None


def _apple_jwks():
    global _apple_jwk_client

    if _apple_jwk_client is None:
        _apple_jwk_client = pyjwt.PyJWKClient(APPLE_KEYS_URL, cache_keys=True)

    return _apple_jwk_client


def _apple_claims(identity_token):
    """Valida la firma, el emisor y la audiencia del identity token de Apple."""
    signing_key = _apple_jwks().get_signing_key_from_jwt(identity_token)

    return pyjwt.decode(
        identity_token,
        signing_key.key,
        algorithms=["RS256"],
        audience=current_app.config["APPLE_CLIENT_IDS"],
        issuer=APPLE_ISSUER,
        leeway=5,
    )


def authenticate_apple_user(identity_token, full_name=None):
    """Autentica con Sign in with Apple.

    Apple sólo manda el nombre la primera vez que el usuario autoriza la app, y
    lo hace por fuera del token; por eso llega aparte en `full_name` y se guarda
    únicamente si todavía no hay uno.
    """
    try:
        apple_data = _apple_claims(identity_token)

    except Exception:
        return None, {
            "code": "invalid_apple_credential",
            "message": "La credencial de Apple no es válida"
        }

    apple_id = apple_data.get("sub")

    if not apple_id:
        return None, {
            "code": "invalid_apple_credential",
            "message": "La credencial de Apple no es válida"
        }

    user = User.query.filter_by(apple_id=apple_id).first()

    if user:
        if full_name and not user.name:
            user.name = full_name

            try:
                db.session.commit()

            except Exception:
                db.session.rollback()

        return user, None

    # Apple manda email_verified como cadena ("true") o como booleano.
    verified = apple_data.get("email_verified")
    verified = verified if isinstance(verified, bool) else str(verified).lower() == "true"
    email = (apple_data.get("email") or "").strip().lower()

    if not email:
        return None, {
            "code": "apple_email_unavailable",
            "message": "Apple no compartió un correo con Eniu. Inicia sesión con el método que usaste al registrarte"
        }

    if not verified:
        return None, {
            "code": "unverified_email",
            "message": "Apple no ha verificado este correo"
        }

    user = User.query.filter_by(email=email).first()

    if user:
        if user.apple_id and user.apple_id != apple_id:
            return None, {
                "code": "apple_account_conflict",
                "message": "El correo ya está vinculado con otra cuenta de Apple"
            }

        user.apple_id = apple_id

        if full_name and not user.name:
            user.name = full_name

    else:
        user = User(
            name=full_name,
            email=email,
            apple_id=apple_id,
            password=None,
            username=None,
            phone_number=None
        )

        db.session.add(user)

    try:
        db.session.commit()
        return user, None

    except IntegrityError:
        db.session.rollback()

        return None, {
            "code": "apple_account_conflict",
            "message": "No fue posible vincular esta cuenta de Apple"
        }

    except Exception:
        db.session.rollback()

        return None, {
            "code": "database_error",
            "message": "No fue posible autenticar al usuario"
        }
