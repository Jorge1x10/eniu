from app import db
from app.database.basemodel import BaseModel, UUID


class AnalyticsEvent(BaseModel):
    __tablename__ = "analytics_event"

    catalogue_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("catalogue.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_type = db.Column(db.String(24), nullable=False)
    occurred_at = db.Column(db.DateTime(timezone=True), nullable=False)
    visitor_hash = db.Column(db.String(64), nullable=False)
    session_hash = db.Column(db.String(64), nullable=False)
    target_type = db.Column(db.String(16), nullable=True)
    target_key = db.Column(db.String(64), nullable=True)
    source = db.Column(db.String(16), nullable=False)
    device_type = db.Column(db.String(16), nullable=False)
    dedup_key = db.Column(db.String(64), nullable=False)

    catalogue = db.relationship("Catalogue", back_populates="analytics_events")

    __table_args__ = (
        db.UniqueConstraint("dedup_key", name="uq_analytics_event_dedup_key"),
        db.CheckConstraint(
            "event_type IN ('menu_view', 'product_view', 'category_select')",
            name="ck_analytics_event_type",
        ),
        db.CheckConstraint(
            "source IN ('qr', 'copied_link', 'social', 'referral', 'direct', 'unknown')",
            name="ck_analytics_source",
        ),
        db.CheckConstraint(
            "device_type IN ('mobile', 'tablet', 'desktop', 'unknown')",
            name="ck_analytics_device_type",
        ),
        db.Index("ix_analytics_catalogue_occurred", "catalogue_id", "occurred_at"),
        db.Index("ix_analytics_catalogue_type_occurred", "catalogue_id", "event_type", "occurred_at"),
        db.Index("ix_analytics_catalogue_target_occurred", "catalogue_id", "target_type", "target_key", "occurred_at"),
        db.Index("ix_analytics_catalogue_visitor_occurred", "catalogue_id", "visitor_hash", "occurred_at"),
    )
