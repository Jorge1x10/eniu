"""add dining tables, table accounts and orders

Revision ID: b7d3e5f1a2c4
Revises: a5f7c2e91b3d
Create Date: 2026-11-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'b7d3e5f1a2c4'
down_revision = 'a5f7c2e91b3d'
branch_labels = None
depends_on = None


def _timestamps():
    return [
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def upgrade():
    # Los dos entran con valor por defecto: ningún negocio existente recibe
    # pedidos hasta que lo active, y no hay backfill que escribir.
    with op.batch_alter_table('business', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ordering_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('orders_version', sa.Integer(), nullable=False, server_default='0'))

    op.create_table(
        'dining_tables',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('business.id', ondelete='CASCADE'), nullable=False),
        sa.Column('catalogue_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('catalogue.id', ondelete='CASCADE'), nullable=False),
        sa.Column('number', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=40), nullable=True),
        sa.Column('qr_token', sa.String(length=64), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.UniqueConstraint('business_id', 'number', name='uq_dining_tables_business_number'),
    )
    op.create_index('ix_dining_tables_business_id', 'dining_tables', ['business_id'])
    op.create_index('ix_dining_tables_catalogue_id', 'dining_tables', ['catalogue_id'])
    op.create_index('ix_dining_tables_qr_token', 'dining_tables', ['qr_token'], unique=True)

    op.create_table(
        'table_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('table_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('dining_tables.id', ondelete='CASCADE'), nullable=False),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('business.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='open'),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        *_timestamps(),
    )
    op.create_index(
        'uq_table_accounts_one_open_per_table', 'table_accounts', ['table_id'],
        unique=True, postgresql_where=sa.text("status = 'open'"),
    )
    op.create_index('ix_table_accounts_business_status', 'table_accounts', ['business_id', 'status'])

    op.create_table(
        'orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('table_accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('diner_name', sa.String(length=40), nullable=False),
        sa.Column('device_hash', sa.String(length=64), nullable=False),
        sa.Column('idempotency_key', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('preparing_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ready_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.UniqueConstraint('device_hash', 'idempotency_key', name='uq_orders_device_idempotency'),
    )
    op.create_index('ix_orders_account_id', 'orders', ['account_id'])
    op.create_index('ix_orders_account_device', 'orders', ['account_id', 'device_hash'])

    op.create_table(
        'order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id', ondelete='SET NULL'), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('notes', sa.String(length=200), nullable=True),
        sa.Column('is_cancelled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.CheckConstraint('quantity > 0', name='ck_order_items_quantity_positive'),
        sa.CheckConstraint('unit_price >= 0', name='ck_order_items_price_not_negative'),
    )
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])


def downgrade():
    op.drop_index('ix_order_items_order_id', table_name='order_items')
    op.drop_table('order_items')
    op.drop_index('ix_orders_account_device', table_name='orders')
    op.drop_index('ix_orders_account_id', table_name='orders')
    op.drop_table('orders')
    op.drop_index('ix_table_accounts_business_status', table_name='table_accounts')
    op.drop_index('uq_table_accounts_one_open_per_table', table_name='table_accounts')
    op.drop_table('table_accounts')
    op.drop_index('ix_dining_tables_qr_token', table_name='dining_tables')
    op.drop_index('ix_dining_tables_catalogue_id', table_name='dining_tables')
    op.drop_index('ix_dining_tables_business_id', table_name='dining_tables')
    op.drop_table('dining_tables')
    with op.batch_alter_table('business', schema=None) as batch_op:
        batch_op.drop_column('orders_version')
        batch_op.drop_column('ordering_enabled')
