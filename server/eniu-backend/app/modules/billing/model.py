from app import db
from app.database.basemodel import BaseModel, UUID, utc_now
from app.modules.billing import plans


ACCESS_STATUSES = {"active", "trialing"}


class BillingSubscription(BaseModel):
    __tablename__ = "billing_subscriptions"

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    stripe_customer_id = db.Column(db.String(255), nullable=True, unique=True, index=True)
    stripe_subscription_id = db.Column(db.String(255), nullable=True, unique=True, index=True)
    stripe_price_id = db.Column(db.String(255), nullable=True)
    # Quién cobra hoy: "stripe" (web) o la tienda del teléfono. Es una sola fila
    # por usuario a propósito —una suscripción activa a la vez—, así que este
    # campo dice cuál de los dos juegos de identificadores manda.
    plan_key = db.Column(db.String(64), nullable=False, default="free", server_default="free")
    provider = db.Column(db.String(16), nullable=False, default=plans.PROVIDER_STRIPE, server_default=plans.PROVIDER_STRIPE)
    revenuecat_app_user_id = db.Column(db.String(255), nullable=True, index=True)
    store_product_id = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(32), nullable=False, default="inactive", server_default="inactive")
    cancel_at_period_end = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    current_period_end = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User", back_populates="billing_subscription")

    @property
    def has_access(self):
        return self.status in ACCESS_STATUSES

    @property
    def is_store_managed(self):
        """True si la cobra Apple/Google y no Stripe.

        Quien llama debe tratarla distinto: no se puede cancelar ni reembolsar
        desde aquí, sólo el usuario desde los ajustes de su teléfono.
        """
        return self.provider in plans.STORE_PROVIDERS

    @property
    def effective_plan_key(self):
        if not self.has_access or self.plan_key not in plans.PLANS:
            return plans.FREE
        return self.plan_key

    def to_plan_dict(self):
        return plans.plan_payload(
            self.plan_key if self.plan_key in plans.PLANS else plans.FREE,
            effective_key=self.effective_plan_key,
            status=self.status,
            has_access=self.has_access,
            cancel_at_period_end=self.cancel_at_period_end,
            current_period_end=self.current_period_end.isoformat() if self.current_period_end else None,
            provider=self.provider,
        )


class StripeWebhookEvent(db.Model):
    __tablename__ = "stripe_webhook_events"

    event_id = db.Column(db.String(255), primary_key=True)
    event_type = db.Column(db.String(255), nullable=False)
    processed_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, server_default=db.func.now())


class RevenueCatWebhookEvent(db.Model):
    """Eventos ya procesados de RevenueCat, para no aplicarlos dos veces.

    RevenueCat reintenta una entrega hasta que responda 2xx, así que sin esta
    tabla un reintento volvería a ejecutar la bajada de plan —que despublica
    menús— sobre alguien que ya la sufrió.
    """
    __tablename__ = "revenuecat_webhook_events"

    event_id = db.Column(db.String(255), primary_key=True)
    event_type = db.Column(db.String(255), nullable=False)
    processed_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, server_default=db.func.now())
