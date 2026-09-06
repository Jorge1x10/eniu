"""add revenuecat subscription source and webhook events

Revision ID: d4e91a7c2b58
Revises: c3a58d2f6e17
Create Date: 2026-09-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e91a7c2b58'
down_revision = 'c3a58d2f6e17'
branch_labels = None
depends_on = None


def upgrade():
    # `provider` entra con server_default 'stripe' a propósito: todas las filas
    # que ya existen se cobraron por Stripe, así que ese es su valor correcto y
    # no hay backfill que escribir.
    with op.batch_alter_table('billing_subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('provider', sa.String(length=16), nullable=False, server_default='stripe'))
        batch_op.add_column(sa.Column('revenuecat_app_user_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('store_product_id', sa.String(length=255), nullable=True))
        batch_op.create_index(
            batch_op.f('ix_billing_subscriptions_revenuecat_app_user_id'),
            ['revenuecat_app_user_id'],
            unique=False,
        )

    op.create_table(
        'revenuecat_webhook_events',
        sa.Column('event_id', sa.String(length=255), primary_key=True),
        sa.Column('event_type', sa.String(length=255), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('revenuecat_webhook_events')
    with op.batch_alter_table('billing_subscriptions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_billing_subscriptions_revenuecat_app_user_id'))
        batch_op.drop_column('store_product_id')
        batch_op.drop_column('revenuecat_app_user_id')
        batch_op.drop_column('provider')
