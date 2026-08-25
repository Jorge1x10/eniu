"""default billing_subscriptions.plan_key to free and backfill unpaid rows

Revision ID: b1d2e3f4a5c6
Revises: a9c8e7d6b5f4
"""

from alembic import op
import sqlalchemy as sa


revision = "b1d2e3f4a5c6"
down_revision = "a9c8e7d6b5f4"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "billing_subscriptions",
        "plan_key",
        existing_type=sa.String(length=64),
        server_default="free",
        existing_nullable=False,
    )
    op.execute(
        """
        UPDATE billing_subscriptions
        SET plan_key = 'free'
        WHERE plan_key = 'essential'
          AND status NOT IN ('active', 'trialing')
        """
    )


def downgrade():
    op.alter_column(
        "billing_subscriptions",
        "plan_key",
        existing_type=sa.String(length=64),
        server_default="essential",
        existing_nullable=False,
    )
