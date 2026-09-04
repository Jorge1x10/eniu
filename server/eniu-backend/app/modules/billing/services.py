import hmac
import json
import random
import string
from datetime import datetime, timezone
from uuid import UUID

import stripe
from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.db import db
from app.extensions import cache
from app.modules.billing.model import BillingSubscription, RevenueCatWebhookEvent, StripeWebhookEvent
from app.modules.billing import plans
from app.modules.billing.plans import FREE, plan_payload
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.template.model import CatalogueTemplate
from app.modules.users.model import User
from app.shared.i18n import _


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
        raise RuntimeError(_("No se encontró el precio activo del Plan Esencial"))
    price = prices.data[0]
    if not price.recurring or price.recurring.interval != "month":
        raise RuntimeError(_("El precio del Plan Esencial no es mensual"))
    return price


# Stripe expresa los importes en la unidad mínima de la moneda, salvo en estas,
# que no tienen fracción: ahí el importe ya viene entero.
# https://docs.stripe.com/currencies#zero-decimal
ZERO_DECIMAL_CURRENCIES = {
    "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
    "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
}

PRICE_CACHE_KEY = "billing:essential_price"
PRICE_CACHE_SECONDS = 300


def _amount_from_minor(minor, currency):
    if minor is None:
        return None
    return minor if currency.lower() in ZERO_DECIMAL_CURRENCIES else minor / 100


def essential_price_payload():
    """Precio del Plan Esencial tal como lo cobra Stripe, con sus monedas.

    Los clientes lo dibujan en lugar de llevar la cifra escrita a mano: un
    importe cableado se queda atrás en cuanto el precio cambia en Stripe, y
    desde que hay más de una moneda además sería incorrecto para media
    audiencia. Se devuelven todas las opciones para que cada cliente muestre
    la que corresponde; quién paga en qué moneda lo decide Checkout según la
    ubicación del cliente, no esta respuesta.

    Devuelve `None` si Stripe no está configurado o no contesta: es preferible
    que la pantalla no enseñe precio a que enseñe uno inventado.
    """
    if not _stripe_configured():
        return None

    cached = cache.get(PRICE_CACHE_KEY)
    if cached is not None:
        return cached

    try:
        _configure_stripe()
        prices = stripe.Price.list(
            lookup_keys=[current_app.config["STRIPE_ESSENTIAL_LOOKUP_KEY"]],
            active=True,
            limit=1,
            expand=["data.currency_options"],
        )
        if not prices.data:
            return None
        price = prices.data[0]

        options = {}
        for code, option in (price.get("currency_options") or {}).items():
            amount = _amount_from_minor(option.get("unit_amount"), code)
            if amount is not None:
                options[code] = amount
        # Un precio sin `currency_options` expandidas sigue teniendo la suya.
        options.setdefault(
            price.currency, _amount_from_minor(price.unit_amount, price.currency)
        )

        payload = {
            "currency": price.currency,
            "amount": options.get(price.currency),
            "interval": price.recurring.interval if price.recurring else None,
            "currencies": options,
        }
        cache.set(PRICE_CACHE_KEY, payload, timeout=PRICE_CACHE_SECONDS)
        return payload
    except stripe.StripeError as error:
        current_app.logger.warning("Stripe price lookup failed: %s", _error_detail(error))
        return None


def get_subscription(user_id):
    user = _user(user_id)
    if not user:
        return {"message": _("Usuario no encontrado")}, 404
    plan = user.billing_subscription.to_plan_dict() if user.billing_subscription else plan_payload(FREE)
    return {"plan": plan, "price": essential_price_payload()}, 200


def create_checkout(user_id):
    if not _stripe_configured():
        return {"message": _("Stripe no está configurado")}, 503
    user = _user(user_id)
    if not user:
        return {"message": _("Usuario no encontrado")}, 404
    record = _get_or_create_record(user)
    if record.stripe_subscription_id and record.status in OPEN_SUBSCRIPTION_STATUSES:
        db.session.rollback()
        return {"message": _("Ya existe una suscripción. Adminístrala desde el portal.")}, 409

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
        current_app.logger.warning("Stripe checkout error: %s", _error_detail(error))
        return {"message": _("No fue posible iniciar la contratación")}, 502
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible preparar la suscripción")}, 500


def create_portal(user_id):
    if not _stripe_configured():
        return {"message": _("Stripe no está configurado")}, 503
    user = _user(user_id)
    if not user or not user.billing_subscription or not user.billing_subscription.stripe_customer_id:
        return {"message": _("Aún no existe una cuenta de facturación")}, 404
    try:
        _configure_stripe()
        session = stripe.billing_portal.Session.create(
            customer=user.billing_subscription.stripe_customer_id,
            return_url=f"{current_app.config['FRONTEND_URL']}/dashboard/settings",
        )
        return {"url": session.url}, 201
    except stripe.StripeError as error:
        current_app.logger.warning("Stripe portal error: %s", _error_detail(error))
        return {"message": _("No fue posible abrir el portal de facturación")}, 502


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
        # `template_key`, no `layout_key`: es el campo siempre poblado de
        # forma confiable (ver nota equivalente en `billing/guards.py`).
        if not plans.allows_layout(plans.FREE, config.template_key):
            config.template_key = plans.DEFAULT_LAYOUT_KEY
            config.layout_key = plans.DEFAULT_LAYOUT_KEY
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
    record.provider = plans.PROVIDER_STRIPE

    _downgrade_if_access_lost(record, had_access)


def _downgrade_if_access_lost(record, had_access):
    """Deja la cuenta como el plan gratuito si acaba de perder el acceso.

    Se llama desde los dos webhooks (Stripe y RevenueCat) para que perder el
    acceso signifique exactamente lo mismo sin importar quién cobraba.
    """
    if not had_access or record.status not in TERMINAL_STATUSES:
        return
    owner = db.session.get(User, record.user_id)
    if owner:
        apply_free_plan_state(owner)


def _error_detail(error):
    """Detalle útil de un error de Stripe para el registro.

    `code` existe siempre pero llega vacío en los errores de configuración —el
    portal de cliente sin configurar, por ejemplo—, y como `getattr` con valor
    por defecto sólo cubre el atributo ausente, el log terminaba diciendo
    «None» justo cuando hacía falta saber qué había pasado.
    """
    return getattr(error, "code", None) or str(error) or type(error).__name__


def _plain(value):
    """Convierte un objeto del SDK de Stripe en un diccionario de Python.

    Desde stripe 15, `StripeObject` dejó de heredar de `dict`: no tiene `.get()`
    y cualquier intento de usarlo como diccionario revienta con
    `KeyError: 'get'`. Todo el manejo del webhook está escrito sobre `.get()`
    encadenado, así que se convierte una vez en la frontera y el resto sigue
    siendo código sobre diccionarios normales.
    """
    return value.to_dict() if hasattr(value, "to_dict") else value


def _invoice_subscription_id(invoice):
    return invoice.get("subscription") or (
        invoice.get("parent", {}).get("subscription_details", {}).get("subscription")
    )


def process_webhook(payload, signature):
    if not _stripe_configured(require_webhook=True):
        return {"message": _("Stripe no está configurado")}, 503
    _configure_stripe()
    try:
        event = _plain(
            stripe.Webhook.construct_event(payload, signature, current_app.config["STRIPE_WEBHOOK_SECRET"])
        )
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
                _sync_subscription(_plain(stripe.Subscription.retrieve(subscription_id)), data_object.get("client_reference_id"))
        elif event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
            _sync_subscription(data_object)
        elif event_type in {"invoice.paid", "invoice.payment_failed"}:
            subscription_id = _invoice_subscription_id(data_object)
            if subscription_id:
                _sync_subscription(_plain(stripe.Subscription.retrieve(subscription_id)))

        db.session.add(StripeWebhookEvent(event_id=event_id, event_type=event_type))
        db.session.commit()
        return {"received": True}, 200
    except IntegrityError:
        db.session.rollback()
        return {"received": True, "duplicate": True}, 200
    except (stripe.StripeError, SQLAlchemyError) as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible procesar el webhook")}, 500

# --- RevenueCat: compras dentro de la app ----------------------------------

# Eventos que conceden o mantienen el acceso. `PRODUCT_CHANGE` está aquí porque
# cambiar de mensual a anual no debe dejar a nadie sin plan a mitad del cambio.
REVENUECAT_GRANTING_EVENTS = {
    "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "NON_RENEWING_PURCHASE",
}
# Estados que RevenueCat provoca sin que se pierda el acceso todavía: la tienda
# sigue reintentando el cobro o el usuario pausó la suscripción. Igual que con
# Stripe, no se despublica nada mientras haya posibilidad de recuperarse.
REVENUECAT_PENDING_STATUSES = {"BILLING_ISSUE": "past_due", "SUBSCRIPTION_PAUSED": "paused"}


def _revenuecat_configured():
    return bool(current_app.config.get("REVENUECAT_WEBHOOK_AUTH"))


def _record_revenuecat_event(event_id, event_type, **extra):
    """Marca el evento como procesado y arma la respuesta.

    Siempre responde 200: RevenueCat reintenta cualquier respuesta que no sea
    2xx, y los casos que aquí se descartan (sandbox, usuario inexistente) no
    van a cambiar por reintentar.
    """
    try:
        db.session.add(RevenueCatWebhookEvent(event_id=event_id, event_type=event_type))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"received": True, "duplicate": True}, 200
    return {"received": True, **extra}, 200


def _revenuecat_expiration(event):
    """Hasta cuándo llega el acceso comprado, en UTC.

    Se toma el máximo entre el vencimiento normal y el del periodo de gracia:
    cuando la tienda está reintentando un cobro, el segundo va más lejos y es
    el que de verdad marca hasta cuándo el usuario conserva el acceso.
    """
    stamps = [event.get("expiration_at_ms"), event.get("grace_period_expiration_at_ms")]
    latest = max((value for value in stamps if value), default=None)
    return datetime.fromtimestamp(latest / 1000, timezone.utc) if latest else None


def _apply_revenuecat_event(user, event, event_type):
    """Traduce un evento de RevenueCat a la misma fila que usa Stripe.

    El resto del backend (`plans.py`, `guards.py`) no sabe ni tiene que saber
    quién cobró: lee `plan_key` y `status` de esta fila, y por eso una compra
    en la App Store desbloquea exactamente lo mismo que un pago por Stripe.
    """
    record = _get_or_create_record(user)
    had_access = record.has_access
    expires_at = _revenuecat_expiration(event)
    store = plans.REVENUECAT_STORES.get(event.get("store"), plans.PROVIDER_APP_STORE)

    if event_type in REVENUECAT_GRANTING_EVENTS:
        plan_key = plans.plan_key_for_entitlements(event.get("entitlement_ids"))
        if not plan_key:
            # Un producto que todavía no está mapeado en `REVENUECAT_ENTITLEMENTS`.
            # Conceder "algo" a ciegas sería peor que no conceder nada: quedaría
            # un plan que nadie sabe de dónde salió.
            current_app.logger.error(
                "RevenueCat: entitlements sin plan conocido (%s) para el usuario %s",
                event.get("entitlement_ids"), user.id,
            )
            return "unmapped_entitlement"
        _warn_if_replacing_stripe(record, user)
        record.plan_key = plan_key
        record.status = "trialing" if event.get("period_type") == "TRIAL" else "active"
        record.cancel_at_period_end = False
    elif event_type == "CANCELLATION":
        # Cancelar en la tienda apaga la renovación, no el acceso: se conserva
        # hasta el final del periodo ya pagado. Un reembolso llega como este
        # mismo evento pero con el vencimiento ya en el pasado, y entonces sí
        # corta de inmediato.
        record.cancel_at_period_end = True
        if expires_at and expires_at <= datetime.now(timezone.utc):
            record.status = "canceled"
    elif event_type == "EXPIRATION":
        record.status = "canceled"
    elif event_type in REVENUECAT_PENDING_STATUSES:
        record.status = REVENUECAT_PENDING_STATUSES[event_type]
    else:
        # Un tipo de evento que este código no conoce no debe tocar el plan de
        # nadie; queda registrado para decidir qué hacer con él.
        current_app.logger.info("RevenueCat: evento no manejado %s", event_type)
        return "unhandled"

    record.provider = store
    record.revenuecat_app_user_id = event.get("app_user_id")
    record.store_product_id = event.get("product_id") or record.store_product_id
    if expires_at:
        record.current_period_end = expires_at

    _downgrade_if_access_lost(record, had_access)
    return "applied"


def _warn_if_replacing_stripe(record, user):
    """Avisa si alguien acaba de comprar en la tienda teniendo Stripe activo.

    No se borra nada ni se corta el acceso: la compra ya ocurrió y el usuario
    tiene derecho a lo que pagó. Pero los identificadores de Stripe se
    conservan y el caso queda registrado como error, porque significa que a esa
    persona le están cobrando dos veces y alguien tiene que devolvérselo.
    """
    if record.stripe_subscription_id and record.status in OPEN_SUBSCRIPTION_STATUSES:
        current_app.logger.error(
            "Cobro duplicado: el usuario %s compró en la tienda con la suscripción de Stripe %s todavía activa",
            user.id, record.stripe_subscription_id,
        )


def process_revenuecat_webhook(payload, authorization):
    if not _revenuecat_configured():
        return {"message": _("RevenueCat no está configurado")}, 503
    # `compare_digest` en vez de `==`: comparar secretos carácter a carácter
    # filtra por tiempo cuánto del secreto se acertó.
    expected = current_app.config["REVENUECAT_WEBHOOK_AUTH"]
    if not hmac.compare_digest((authorization or "").encode(), expected.encode()):
        return {"message": "Webhook inválido"}, 401

    try:
        body = json.loads(payload or b"{}")
        event = body["event"]
        if not isinstance(event, dict):
            raise ValueError("event no es un objeto")
    except (ValueError, TypeError, KeyError):
        return {"message": "Webhook inválido"}, 400

    event_id, event_type = event.get("id"), event.get("type")
    if not event_id or not event_type:
        return {"message": "Webhook inválido"}, 400
    if RevenueCatWebhookEvent.query.filter_by(event_id=event_id).first():
        return {"received": True, "duplicate": True}, 200

    try:
        # El botón "enviar evento de prueba" del panel de RevenueCat: sirve para
        # comprobar que la URL responde, no trae una compra real.
        if event_type == "TEST":
            return _record_revenuecat_event(event_id, event_type, ignored="test")

        # Un evento de sandbox tratado como real dejaría que cualquiera con una
        # cuenta de prueba de Apple se regalara el plan de pago.
        if event.get("environment") == "SANDBOX" and not current_app.config.get("REVENUECAT_ALLOW_SANDBOX"):
            return _record_revenuecat_event(event_id, event_type, ignored="sandbox")

        user = _user(event.get("app_user_id"))
        if not user:
            # El `app_user_id` lo fija la app con `Purchases.logIn(user.id)`. Si
            # no corresponde a nadie es un fallo de configuración, no algo que
            # se arregle reintentando: se registra y se da por procesado.
            current_app.logger.warning(
                "RevenueCat: evento %s para un app_user_id desconocido (%s)",
                event_type, event.get("app_user_id"),
            )
            return _record_revenuecat_event(event_id, event_type, ignored="unknown_user")

        outcome = _apply_revenuecat_event(user, event, event_type)
        return _record_revenuecat_event(event_id, event_type, outcome=outcome)
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": _("No fue posible procesar el webhook")}, 500


def store_subscription_needs_manual_cancel(user):
    """True si al borrar la cuenta queda un cobro que sólo el usuario puede parar.

    Sirve para decírselo en la respuesta del borrado: la cuenta desaparece de
    Eniu, pero la suscripción vive en Apple/Google y sigue cobrando hasta que
    la cancele desde los ajustes de su teléfono.
    """
    record = getattr(user, "billing_subscription", None)
    return bool(record and record.is_store_managed and record.has_access)


def cancel_subscription_for_user(user):
    """Cancela en Stripe la suscripción del usuario antes de borrar su cuenta.

    Devuelve `(True, None)` cuando no queda nada cobrándose. Se corre **antes**
    de borrar: si Stripe fallara y aun así elimináramos la cuenta, seguiríamos
    cobrándole a alguien que ya no existe y que además perdió la forma de
    entrar a cancelarlo.
    """
    record = getattr(user, "billing_subscription", None)
    if not record:
        return True, None
    # Una suscripción de la App Store o Google Play no se puede cancelar desde
    # aquí: sólo el dueño del teléfono, desde los ajustes de su tienda. Aun así
    # el borrado sigue adelante —Apple exige poder borrar la cuenta desde la
    # app, y bloquearlo por esto dejaría a la persona atrapada—, pero se avisa
    # arriba para poder decírselo, porque si no cancela le seguirán cobrando.
    if record.is_store_managed and record.has_access:
        current_app.logger.warning(
            "Cuenta borrada con una suscripción de %s activa: el usuario %s debe cancelarla en su tienda",
            record.provider, user.id,
        )
        return True, None
    if not record.stripe_subscription_id:
        return True, None
    if not _stripe_configured():
        return False, _("Stripe no está configurado")
    try:
        _configure_stripe()
        subscription = stripe.Subscription.retrieve(record.stripe_subscription_id)
        if _plain(subscription).get("status") not in {"canceled", "incomplete_expired"}:
            subscription.cancel()
        return True, None
    except stripe.InvalidRequestError as error:
        # Si Stripe ya no la conoce, no hay nada que cancelar.
        if "No such subscription" in str(error):
            return True, None
        return False, _error_detail(error)
    except stripe.StripeError as error:
        return False, _error_detail(error)
