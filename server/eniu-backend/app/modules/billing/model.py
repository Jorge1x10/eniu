from app import db
from app.database.basemodel import BaseModel, UUID, utc_now


ACCESS_STATUSES = {"active", "trialing"}


class BillingSubscription(BaseModel):
    __tablename__ = "billing_subscriptions"

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    stripe_customer_id = db.Column(db.String(255), nullable=True, unique=True, index=True)
    stripe_subscription_id = db.Column(db.String(255), nullable=True, unique=True, index=True)
    stripe_price_id = db.Column(db.String(255), nullable=True)
    plan_key = db.Column(db.String(64), nullable=False, default="free", server_default="free")
    status = db.Column(db.String(32), nullable=False, default="inactive", server_default="inactive")
    cancel_at_period_end = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    current_period_end = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User", back_populates="billing_subscription")

    PLAN_NAMES = {"free": "Plan gratuito", "essential": "Plan Esencial"}

    def to_plan_dict(self):
        return {
            "key": self.plan_key,
            "name": self.PLAN_NAMES.get(self.plan_key, self.plan_key.title()),
            "status": self.status,
            "has_access": self.status in ACCESS_STATUSES,
            "cancel_at_period_end": self.cancel_at_period_end,
            "current_period_end": self.current_period_end.isoformat() if self.current_period_end else None,
        }


class StripeWebhookEvent(db.Model):
    __tablename__ = "stripe_webhook_events"

    event_id = db.Column(db.String(255), primary_key=True)
    event_type = db.Column(db.String(255), nullable=False)
    processed_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, server_default=db.func.now())
