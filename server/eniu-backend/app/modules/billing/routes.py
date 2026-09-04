from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .services import (
    create_checkout,
    create_portal,
    get_subscription,
    process_revenuecat_webhook,
    process_webhook,
)


billing_bp = Blueprint("billing", __name__, url_prefix="/api/billing")


@billing_bp.get("/subscription")
@jwt_required()
def subscription():
    result, status = get_subscription(get_jwt_identity())
    return jsonify(result), status


@billing_bp.post("/checkout")
@jwt_required()
def checkout():
    result, status = create_checkout(get_jwt_identity())
    return jsonify(result), status


@billing_bp.post("/portal")
@jwt_required()
def portal():
    result, status = create_portal(get_jwt_identity())
    return jsonify(result), status


@billing_bp.post("/webhook")
def webhook():
    result, status = process_webhook(request.get_data(cache=False), request.headers.get("Stripe-Signature", ""))
    return jsonify(result), status


@billing_bp.post("/revenuecat/webhook")
def revenuecat_webhook():
    """Compras hechas dentro de la app (App Store / Google Play).

    RevenueCat no firma el cuerpo como Stripe: autentica con el valor que uno
    mismo configura como cabecera `Authorization` en su panel.
    """
    result, status = process_revenuecat_webhook(
        request.get_data(cache=False), request.headers.get("Authorization", "")
    )
    return jsonify(result), status
