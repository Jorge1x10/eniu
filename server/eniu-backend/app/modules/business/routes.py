from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from .services import (
    create_business,
    get_business_by_id,
    get_businesses_by_owner,
    update_business,
)

business_bp = Blueprint('bussines', __name__, url_prefix="/api/businesses")

@business_bp.post('')
@jwt_required()
def new_business():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    required_fields = ["name"]
    missing_fields = [
            field for field in required_fields
        if not data.get(field)
            ]
        
    if missing_fields:
        return jsonify({
            "message" : "Faltan campos necesarios",
            "fields" : missing_fields
        }), 400

    result, status_code = create_business(
        owner_id=user_id,
        data=data
    )

    return jsonify(result), status_code

@business_bp.get("")
@jwt_required()
def get_my_businesses():
    user_id = get_jwt_identity()

    result, status_code = get_businesses_by_owner(user_id)

    return jsonify(result), status_code


@business_bp.patch("/<business_id>")
@jwt_required()
def edit_business(business_id):
    user_id = get_jwt_identity()

    if request.mimetype == "multipart/form-data":
        data = request.form.to_dict()
        photo = request.files.get("photo")
    else:
        data = request.get_json(silent=True) or {}
        photo = None

    allowed_fields = {
        "name", "description", "phone", "whatsapp", "address", "currency",
        "timezone", "website", "is_active", "remove_photo",
    }
    unknown_fields = set(data) - allowed_fields
    if unknown_fields:
        return jsonify({
            "message": "Se enviaron campos no permitidos",
            "fields": sorted(unknown_fields),
        }), 400

    if not data and not photo:
        return jsonify({"message": "No se enviaron datos"}), 400

    result, status_code = update_business(
        owner_id=user_id,
        business_id=business_id,
        data=data,
        photo=photo,
    )

    return jsonify(result), status_code


@business_bp.get("/<business_id>/photo")
def get_business_photo(business_id):
    business = get_business_by_id(business_id)

    if not business or not business.photo_filename:
        return jsonify({"message": "Foto no encontrada"}), 404

    return send_from_directory(
        current_app.config["BUSINESS_UPLOAD_FOLDER"],
        business.photo_filename,
    )
