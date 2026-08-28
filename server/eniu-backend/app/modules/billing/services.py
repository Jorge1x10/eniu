import random
import string
from datetime import datetime, timezone
from uuid import UUID

import stripe
from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.db import db
from app.modules.billing.model import BillingSubscription, StripeWebhookEvent
from app.modules.billing import plans
from app.modules.billing.plans import FREE, plan_payload
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.template.model import CatalogueTemplate
from app.modules.users.model import User


OPEN_SUBSCRIPTION_STATUSES = {"active", "trialing", "past_due", "unpaid", "incomplete", "paused"}

# Estados de los que ya no se vuelve: sólo con estos se aplica la bajada de
# plan. `past_due` queda fuera a propósito, porque Stripe sigue reintentando el
# cobro y sería destructivo despublicar los menús de alguien cuya tarjeta se
# recupera dos días después.
TERMINAL_STATUSES = {"canceled", "unpaid", "incomplete_expired"}


def _stripe_configured(require_webhook=False):
    required = ["STRIPE_API_KEY"]
    if require_webhook:
        required.append("STRIPE_WEBHOOK_SECRET")
    return all(current_app.config.get(key) for key in required)


def _configure_stripe():
    stripe.api_key = current_app.config["STRIPE_API_KEY"]
    stripe.api_version = current_app.config["STRIPE_API_VERSION"]


def _user(user_id):
    try:
        return db.session.get(User, UUID(str(user_id)))
    except (TypeError, ValueError):
        return None


def _get_or_create_record(user):
    record = user.billing_subscription
    if not record:
        record = BillingSubscription(user_id=user.id)
        db.session.add(record)
        db.session.flush()
    return record


def _essential_price():
    prices = stripe.Price.list(
        lookup_keys=[current_app.config["STRIPE_ESSENTIAL_LOOKUP_KEY"]],
        active=True,
        limit=1,
    )
    if not prices.data:
        raise RuntimeError("No se encontró el precio activo del Plan Esencial")
    price = prices.data[0]
    if not price.recurring or price.recurring.interval != "month":
        raise RuntimeError("El precio del Plan Esencial no es mensual")
    return price


def get_subscription(user_id):
    user = _user(user_id)
    if not user:
        return {"message": "Usuario no encontrado"}, 404
    plan = user.billing_subscription.to_plan_dict() if user.billing_subscription else plan_payload(FREE)
    return {"plan": plan}, 200


def create_checkout(user_id):
    if not _stripe_configured():
        return {"message": "Stripe no está configurado"}, 503
    user = _user(user_id)
    if not user:
        return {"message": "Usuario no encontrado"}, 404
    record = _get_or_create_record(user)
    if record.stripe_subscription_id and record.status in OPEN_SUBSCRIPTION_STATUSES:
        db.session.rollback()
        return {"message": "Ya existe una suscripción. Adminístrala desde el portal."}, 409

    try:
        _configure_stripe()
        if not record.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.name or user.username,
                metadata={"eniu_user_id": str(user.id)},
            )
            record.stripe_customer_id = customer.id
            db.session.commit()

        price = _essential_price()
        suffix = "".join(random.SystemRandom().choice(string.ascii_lowercase) for _ in range(8))
        frontend_url = current_app.config["FRONTEND_URL"]
        session = stripe.checkout.Session.create(
            mode="subscription",
            # Sin esto la pantalla de pago no ofrece dónde escribir un código,
            # y los cupones de Stripe quedan imposibles de canjear.
            allow_promotion_codes=True,
            customer=record.stripe_customer_id,
            client_reference_id=str(user.id),
            line_items=[{"price": price.id, "quantity": 1}],
            subscription_data={
                "billing_mode": {"type": "flexible"},
                "metadata": {"eniu_user_id": str(user.id), "plan_key": "essential"},
            },
            metadata={"eniu_user_id": str(user.id), "plan_key": "essential"},
            success_url=f"{frontend_url}/dashboard/settings?billing=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/dashboard/settings?billing=cancelled",
            integration_identifier=f"eniu_checkout_{suffix}",
        )
        return {"url": session.url}, 201
    except RuntimeError as error:
        db.session.rollback()
        return {"message": str(error)}, 503
    except stripe.StripeError as error:
        db.session.rollback()
        current_app.logger.warning("Stripe checkout error: %s", getattr(error, "code", type(error).__name__))
        return {"message": "No fue posible iniciar la contratación"}, 502
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": "No fue posible preparar la suscripción"}, 500


def create_portal(user_id):
    if not _stripe_configured():
        return {"message": "Stripe no está configurado"}, 503
    user = _user(user_id)
    if not user or not user.billing_subscription or not user.billing_subscription.stripe_customer_id:
        return {"message": "Aún no existe una cuenta de facturación"}, 404
    try:
        _configure_stripe()
        session = stripe.billing_portal.Session.create(
            customer=user.billing_subscription.stripe_customer_id,
            return_url=f"{current_app.config['FRONTEND_URL']}/dashboard/settings",
        )
        return {"url": session.url}, 201
    except stripe.StripeError as error:
        current_app.logger.warning("Stripe portal error: %s", getattr(error, "code", type(error).__name__))
        return {"message": "No fue posible abrir el portal de facturación"}, 502


def _period_end(subscription):
    timestamp = subscription.get("current_period_end")
    if not timestamp:
        ends = [item.get("current_period_end") for item in subscription.get("items", {}).get("data", [])]
        timestamp = max((value for value in ends if value), default=None)
    return datetime.fromtimestamp(timestamp, timezone.utc) if timestamp else None


def _deactivate_paid_template_features(catalogue_ids):
    """Apaga en la base las funciones de plantilla que el plan gratuito no incluye.

    No basta con ajustar el menú al dibujarlo: si la configuración guardada
    contradice al plan, el usuario queda con una plantilla que su plan no
    permite y cualquier intento de guardar tropieza con ella. Las imágenes se
    conservan, así que volver a pagar sólo requiere reactivarlas.
    """
    if not catalogue_ids:
        return
    free = plans.limits_for(plans.FREE)
    configs = CatalogueTemplate.query.filter(
        CatalogueTemplate.catalogue_id.in_(catalogue_ids)
    ).all()
    for config in configs:
        if not plans.allows_template(plans.FREE, config.template_key):
            config.template_key = plans.DEFAULT_TEMPLATE_KEY
        if not plans.allows_font(plans.FREE, config.font_key):
            config.font_key = plans.DEFAULT_FONT_KEY
        if not free["allow_cover"]:
            config.show_cover = False
        if not free["allow_background"]:
            config.background_opacity = plans.DEFAULT_BACKGROUND_OPACITY
        if not free["allow_splash"]:
            config.splash_enabled = False


def apply_free_plan_state(user):
    """Deja la cuenta como la ve el plan gratuito tras perder el de pago.

    Despublica todos los menús, desactiva todos los negocios salvo el más
    reciente y apaga las funciones de plantilla que el plan gratuito no
    incluye. No borra nada: el `public_slug` de cada menú se conserva —así que
    volver a publicar recupera la misma URL y los códigos QR ya impresos siguen
    sirviendo— y las imágenes subidas se quedan donde estaban.
    """
    businesses = (
        Business.query
        .filter_by(owner_id=user.id)
        # El desempate por id evita que dos negocios creados en el mismo
        # instante hagan que "el más reciente" cambie entre consultas.
        .order_by(Business.created_at.desc(), Business.id.desc())
        .all()
    )
    if not businesses:
        return
    kept = businesses[0]
    business_ids = [business.id for business in businesses]
    catalogue_ids = [
        row[0] for row in
        db.session.query(Catalogue.id).filter(Catalogue.business_id.in_(business_ids)).all()
    ]
    Catalogue.query.filter(Catalogue.business_id.in_(business_ids)).update(
        {"is_published": False, "published_at": None}, synchronize_session=False
    )
    _deactivate_paid_template_features(catalogue_ids)
    for business in businesses:
        business.is_active = business.id == kept.id


def _sync_subscription(subscription, fallback_user_id=None):
    metadata = subscription.get("metadata") or {}
    user_id = metadata.get("eniu_user_id") or fallback_user_id
    customer_id = subscription.get("customer")
    record = None
    if user_id:
        user = _user(user_id)
        record = _get_or_create_record(user) if user else None
    if not record and customer_id:
        record = BillingSubscription.query.filter_by(stripe_customer_id=customer_id).first()
    if not record:
        current_app.logger.warning("Stripe subscription without matching ENIU user: %s", subscription.get("id"))
        return

    had_access = record.has_access
    items = subscription.get("items", {}).get("data", [])
    price = items[0].get("price") if items else None
    record.stripe_customer_id = customer_id or record.stripe_customer_id
    record.stripe_subscription_id = subscription.get("id")
    record.stripe_price_id = price.get("id") if price else record.stripe_price_id
    record.plan_key = metadata.get("plan_key", "essential")
    record.status = subscription.get("status", "inactive")
    record.cancel_at_period_end = bool(subscription.get("cancel_at_period_end"))
    record.current_period_end = _period_end(subscription)

    if had_access and record.status in TERMINAL_STATUSES:
        owner = db.session.get(User, record.user_id)
        if owner:
            apply_free_plan_state(owner)


def _invoice_subscription_id(invoice):
    return invoice.get("subscription") or (
        invoice.get("parent", {}).get("subscription_details", {}).get("subscription")
    )


def process_webhook(payload, signature):
    if not _stripe_configured(require_webhook=True):
        return {"message": "Stripe no está configurado"}, 503
    _configure_stripe()
    try:
        event = stripe.Webhook.construct_event(payload, signature, current_app.config["STRIPE_WEBHOOK_SECRET"])
    except (ValueError, stripe.SignatureVerificationError):
        return {"message": "Webhook inválido"}, 400

    event_id = event.get("id")
    if StripeWebhookEvent.query.filter_by(event_id=event_id).first():
        return {"received": True, "duplicate": True}, 200

    try:
        event_type = event.get("type")
        data_object = event.get("data", {}).get("object", {})
        if event_type == "checkout.session.completed":
            subscription_id = data_object.get("subscription")
            if subscription_id:
                _sync_subscription(stripe.Subscription.retrieve(subscription_id), data_object.get("client_reference_id"))
        elif event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
            _sync_subscription(data_object)
        elif event_type in {"invoice.paid", "invoice.payment_failed"}:
            subscription_id = _invoice_subscription_id(data_object)
            if subscription_id:
                _sync_subscription(stripe.Subscription.retrieve(subscription_id))

        db.session.add(StripeWebhookEvent(event_id=event_id, event_type=event_type))
        db.session.commit()
        return {"received": True}, 200
    except IntegrityError:
        db.session.rollback()
        return {"received": True, "duplicate": True}, 200
    except (stripe.StripeError, SQLAlchemyError) as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": "No fue posible procesar el webhook"}, 500
