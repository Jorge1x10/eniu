"""add takeaway orders: account channel and customer, business switch

Revision ID: d5f2b8c1e9a3
Revises: c3e8a1d4f6b2
Create Date: 2026-11-26 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd5f2b8c1e9a3'
down_revision = 'c3e8a1d4f6b2'
branch_labels = None
depends_on = None


def upgrade():
    # Todo entra con valor por defecto: las cuentas existentes son de mesa y
    # ningún negocio recibe pedidos para llevar hasta que lo active.
    with op.batch_alter_table('business', schema=None) as batch_op:
        batch_op.add_column(sa.Column('takeaway_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))

    with op.batch_alter_table('table_accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('channel', sa.String(length=16), nullable=False, server_default='table'))
        batch_op.add_column(sa.Column('customer_name', sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column('customer_phone', sa.String(length=20), nullable=True))
        batch_op.alter_column('table_id', existing_type=sa.UUID(), nullable=True)
        batch_op.create_check_constraint(
            'ck_table_accounts_channel_table', "(channel = 'table') = (table_id IS NOT NULL)",
        )

    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('channel', sa.String(length=16), nullable=False, server_default='table'))
        batch_op.add_column(sa.Column('customer_name', sa.String(length=40), nullable=True))


def downgrade():
    # Las cuentas para llevar no tienen mesa: no caben en el esquema anterior.
    op.execute("DELETE FROM table_accounts WHERE table_id IS NULL")
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_column('customer_name')
        batch_op.drop_column('channel')
    with op.batch_alter_table('table_accounts', schema=None) as batch_op:
        batch_op.drop_constraint('ck_table_accounts_channel_table', type_='check')
        batch_op.alter_column('table_id', existing_type=sa.UUID(), nullable=False)
        batch_op.drop_column('customer_phone')
        batch_op.drop_column('customer_name')
        batch_op.drop_column('channel')
    with op.batch_alter_table('business', schema=None) as batch_op:
        batch_op.drop_column('takeaway_enabled')
