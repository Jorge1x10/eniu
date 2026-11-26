"""add cash sessions, cash movements and payments

Revision ID: c3e8a1d4f6b2
Revises: b7d3e5f1a2c4
Create Date: 2026-11-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'c3e8a1d4f6b2'
down_revision = 'b7d3e5f1a2c4'
branch_labels = None
depends_on = None


def _timestamps():
    return [
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def upgrade():
    # Tablas nuevas: no hay datos existentes que migrar.
    op.create_table(
        'cash_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('business.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='open'),
        sa.Column('opening_float', sa.Numeric(10, 2), nullable=False),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expected_cash', sa.Numeric(10, 2), nullable=True),
        sa.Column('counted_cash', sa.Numeric(10, 2), nullable=True),
        sa.Column('notes', sa.String(length=200), nullable=True),
        *_timestamps(),
        sa.CheckConstraint('opening_float >= 0', name='ck_cash_sessions_float_not_negative'),
    )
    op.create_index(
        'uq_cash_sessions_one_open_per_business', 'cash_sessions', ['business_id'],
        unique=True, postgresql_where=sa.text("status = 'open'"),
    )
    op.create_index('ix_cash_sessions_business_created', 'cash_sessions', ['business_id', 'created_at'])

    op.create_table(
        'cash_movements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cash_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kind', sa.String(length=8), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('reason', sa.String(length=120), nullable=False),
        *_timestamps(),
        sa.CheckConstraint('amount > 0', name='ck_cash_movements_amount_positive'),
    )
    op.create_index('ix_cash_movements_session_id', 'cash_movements', ['session_id'])

    op.create_table(
        'payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('business.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cash_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('table_accounts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('checkout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('table_number', sa.Integer(), nullable=True),
        sa.Column('method', sa.String(length=16), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('tip', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('tendered', sa.Numeric(10, 2), nullable=True),
        *_timestamps(),
        sa.CheckConstraint('amount >= 0', name='ck_payments_amount_not_negative'),
        sa.CheckConstraint('tip >= 0', name='ck_payments_tip_not_negative'),
    )
    op.create_index('ix_payments_session_id', 'payments', ['session_id'])
    op.create_index('ix_payments_account_id', 'payments', ['account_id'])


def downgrade():
    op.drop_index('ix_payments_account_id', table_name='payments')
    op.drop_index('ix_payments_session_id', table_name='payments')
    op.drop_table('payments')
    op.drop_index('ix_cash_movements_session_id', table_name='cash_movements')
    op.drop_table('cash_movements')
    op.drop_index('ix_cash_sessions_business_created', table_name='cash_sessions')
    op.drop_index('uq_cash_sessions_one_open_per_business', table_name='cash_sessions')
    op.drop_table('cash_sessions')
