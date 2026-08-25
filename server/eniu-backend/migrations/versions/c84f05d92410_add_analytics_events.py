"""add anonymous analytics events

Revision ID: c84f05d92410
Revises: ac82b6014f3d
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "c84f05d92410"
down_revision = "ac82b6014f3d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "analytics_event",
        sa.Column("catalogue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=24), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("visitor_hash", sa.String(length=64), nullable=False),
        sa.Column("session_hash", sa.String(length=64), nullable=False),
        sa.Column("target_type", sa.String(length=16), nullable=True),
        sa.Column("target_key", sa.String(length=64), nullable=True),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("device_type", sa.String(length=16), nullable=False),
        sa.Column("dedup_key", sa.String(length=64), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("device_type IN ('mobile', 'tablet', 'desktop', 'unknown')", name="ck_analytics_device_type"),
        sa.CheckConstraint("event_type IN ('menu_view', 'product_view', 'category_select')", name="ck_analytics_event_type"),
        sa.CheckConstraint("source IN ('qr', 'copied_link', 'social', 'referral', 'direct', 'unknown')", name="ck_analytics_source"),
        sa.ForeignKeyConstraint(["catalogue_id"], ["catalogue.id"], name="fk_analytics_event_catalogue_id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_analytics_event"),
        sa.UniqueConstraint("dedup_key", name="uq_analytics_event_dedup_key"),
    )
    op.create_index("ix_analytics_catalogue_occurred", "analytics_event", ["catalogue_id", "occurred_at"])
    op.create_index("ix_analytics_catalogue_type_occurred", "analytics_event", ["catalogue_id", "event_type", "occurred_at"])
    op.create_index("ix_analytics_catalogue_target_occurred", "analytics_event", ["catalogue_id", "target_type", "target_key", "occurred_at"])
    op.create_index("ix_analytics_catalogue_visitor_occurred", "analytics_event", ["catalogue_id", "visitor_hash", "occurred_at"])


def downgrade():
    op.drop_index("ix_analytics_catalogue_visitor_occurred", table_name="analytics_event")
    op.drop_index("ix_analytics_catalogue_target_occurred", table_name="analytics_event")
    op.drop_index("ix_analytics_catalogue_type_occurred", table_name="analytics_event")
    op.drop_index("ix_analytics_catalogue_occurred", table_name="analytics_event")
    op.drop_table("analytics_event")
