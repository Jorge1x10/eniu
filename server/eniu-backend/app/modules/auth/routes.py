from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from app import db, bcrypt, jwt
from app.extensions import limiter
from datetime import timedelta, datetime, date
from .services import (
    authenticate_apple_user,
    authenticate_google_user,
    authenticate_user,
    change_password,
    get_user_by_id,
    register_user,
    request_password_reset,
    reset_password,
    revoke_other_sessions,
    update_user_profile,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.post('/register')
@limiter.limit("10 per hour")
def register():
    data = request.get_json(silent=True)
    # `username` ya no se pide: se deriva del correo cuando no llega.
    required_fields = ["email", "phone", "password"]
    missing_fields = [
        field for field in required_fields
        if not data.get(field)
        ]
    
    if missing_fields:
        return jsonify({
            "message" : "Faltan campos necesarios",
            "fields" : missing_fields
        }), 400
    
    user, error = register_user(data)

    if error:
        return jsonify({
            "message": error.get("message", "No fue posible registrar al usuario"),
            "code": error.get("code"),
        }), 400 if error.get("code") == "invalid_password" else 409
    
    access_token = create_access_token(
        identity=str(user.id)
    )

    refresh_token = create_refresh_token(
        identity=str(user.id)
    )

    return jsonify({
        "message": "Usuario registrado correctamente",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 201

@auth_bp.post("/login")
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Debes enviar información en formato JSON"
        }), 400

    identifier = data.get("identifier")
    password = data.get("password")

    if not identifier or not password:
        return jsonify({
            "message": "Usuario/correo y contraseña son obligatorios"
        }), 400

    user = authenticate_user(identifier, password)

    if not user:
        return jsonify({
            "message": "Credenciales incorrectas"
        }), 401

    access_token = create_access_token(
        identity=str(user.id)
    )

    refresh_token = create_refresh_token(
        identity=str(user.id),
        expires_delta=timedelta(hours=2)
    )

    return jsonify({
        "message": "Inicio de sesión correcto",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200

@auth_bp.get("/me")
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = get_user_by_id(user_id)

    if not user:
        return jsonify({
            "message": "Usuario no encontrado"
        }), 404

    return jsonify({
        "user": user.to_dict()
    }), 200

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()

    access_token = create_access_token(
        identity=user_id,
        expires_delta=timedelta(hours=2)
    )

    return jsonify({
        "access_token": access_token
    }), 200

@auth_bp.patch("/complete-profile")
@jwt_required()
def complete_profile():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "No se enviaron datos"
        }), 400

    user, error = update_user_profile(user_id, data)

    if error:
        return jsonify({
            "message": error
        }), 400

    return jsonify({
        "message": "Perfil actualizado correctamente",
        "user": user.to_dict()
    }), 200


@auth_bp.post("/google")
@limiter.limit("20 per minute")
def google_auth():
    data = request.get_json(silent=True)
    credential = data.get("credential") if data else None

    if not credential:
        return jsonify({
            "message": "La credencial de Google es obligatoria"
        }), 400

    user, error = authenticate_google_user(credential)

    if error:
        return jsonify({
            "message": error.get("message", "No fue posible autenticar con Google"),
            "code": error.get("code"),
        }), 401

    access_token = create_access_token(
        identity=str(user.id)
    )

    refresh_token = create_refresh_token(
        identity=str(user.id)
    )

    return jsonify({
        "message": "Autenticación con Google correcta",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200


@auth_bp.post("/apple")
@limiter.limit("20 per minute")
def apple_auth():
    data = request.get_json(silent=True) or {}
    identity_token = data.get("identity_token")

    if not identity_token:
        return jsonify({
            "message": "La credencial de Apple es obligatoria"
        }), 400

    # Apple entrega el nombre sólo en la primera autorización, así que el
    # cliente lo reenvía junto con el token.
    full_name = data.get("full_name")
    full_name = full_name.strip()[:50] if isinstance(full_name, str) else None

    # Apple entrega el authorization code junto a la credencial; se canjea por
    # el refresh token que hace falta para revocar la sesión al borrar la cuenta.
    authorization_code = data.get("authorization_code")
    authorization_code = authorization_code if isinstance(authorization_code, str) else None

    user, error = authenticate_apple_user(
        identity_token, full_name or None, authorization_code
    )

    if error:
        return jsonify({
            "message": error.get("message", "No fue posible autenticar con Apple"),
            "code": error.get("code"),
        }), 401

    access_token = create_access_token(
        identity=str(user.id)
    )

    refresh_token = create_refresh_token(
        identity=str(user.id)
    )

    return jsonify({
        "message": "Autenticación con Apple correcta",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200


@auth_bp.patch("/password")
@jwt_required()
@limiter.limit("10 per hour")
def update_password():
    if request.content_length and request.content_length > 16 * 1024:
        return jsonify({"message": "La solicitud es demasiado grande"}), 400
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "Debes enviar información en formato JSON"}), 400
    allowed = {"current_password", "new_password"}
    unknown = set(data) - allowed
    if unknown:
        return jsonify({"message": "Se enviaron campos no permitidos", "fields": sorted(unknown)}), 400
    if not all(data.get(field) for field in allowed):
        return jsonify({"message": "La contraseña actual y la nueva son obligatorias"}), 400

    tokens, error, status = change_password(
        get_jwt_identity(), data["current_password"], data["new_password"]
    )
    if error:
        return jsonify({"message": error}), status
    return jsonify({
        "message": "Contraseña actualizada correctamente",
        **tokens,
    }), 200


@auth_bp.post("/sessions/revoke")
@jwt_required()
def revoke_sessions():
    tokens, error, status = revoke_other_sessions(get_jwt_identity())
    if error:
        return jsonify({"message": error}), status
    return jsonify({
        "message": "Las demás sesiones fueron cerradas",
        **tokens,
    }), 200


RESET_REQUEST_MESSAGE = (
    "Si existe una cuenta asociada, recibirás instrucciones para "
    "restablecer tu contraseña."
)


@auth_bp.post("/forgot-password")
@limiter.limit("5 per hour")
def forgot_password():
    if request.content_length and request.content_length > 8 * 1024:
        return jsonify({"message": RESET_REQUEST_MESSAGE}), 200
    data = request.get_json(silent=True)
    email = data.get("email") if isinstance(data, dict) else None
    if isinstance(email, str) and email.strip() and len(email) <= 120:
        try:
            request_password_reset(email)
        except Exception as error:
            db.session.rollback()
            current_app.logger.exception(error)
    return jsonify({"message": RESET_REQUEST_MESSAGE}), 200


@auth_bp.post("/reset-password")
@limiter.limit("10 per hour")
def confirm_password_reset():
    if request.content_length and request.content_length > 16 * 1024:
        return jsonify({"message": "La solicitud es demasiado grande"}), 400
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "Debes enviar información en formato JSON"}), 400
    unknown = set(data) - {"token", "new_password"}
    if unknown:
        return jsonify({"message": "Se enviaron campos no permitidos"}), 400
    token = data.get("token")
    new_password = data.get("new_password")
    if not isinstance(token, str) or not token or not isinstance(new_password, str):
        return jsonify({"message": "El enlace y la nueva contraseña son obligatorios"}), 400

    error, status = reset_password(token, new_password)
    if error:
        return jsonify({"message": error}), status
    return jsonify({
        "message": "Tu contraseña fue actualizada. Ya puedes iniciar sesión."
    }), 200
