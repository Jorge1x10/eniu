"""add delivery orders: business settings, account address and payment, on the way

Revision ID: e8a4c6d2f1b7
Revises: d5f2b8c1e9a3
Create Date: 2026-11-26 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e8a4c6d2f1b7'
down_revision = 'd5f2b8c1e9a3'
branch_labels = None
depends_on = None


def upgrade():
    # Todo con valor por defecto o nulo: ningún negocio entrega a domicilio
    # hasta que lo configure.
    with op.batch_alter_table('business', schema=None) as batch_op:
        batch_op.add_column(sa.Column('delivery_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('delivery_fee', sa.Numeric(10, 2), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('delivery_min_order', sa.Numeric(10, 2), nullable=True))
        batch_op.add_column(sa.Column('delivery_zones', sa.JSON(), nullable=False, server_default='[]'))

    with op.batch_alter_table('table_accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('delivery_address', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('delivery_zone', sa.String(length=60), nullable=True))
        batch_op.add_column(sa.Column('delivery_references', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('delivery_fee', sa.Numeric(10, 2), nullable=True))
        batch_op.add_column(sa.Column('pay_with', sa.String(length=8), nullable=True))
        batch_op.add_column(sa.Column('cash_tendered', sa.Numeric(10, 2), nullable=True))

    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('on_the_way_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    # Los pedidos "en camino" vuelven a "listo": el estado no existe antes.
    op.execute("UPDATE orders SET status = 'ready' WHERE status = 'on_the_way'")
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_column('on_the_way_at')
    with op.batch_alter_table('table_accounts', schema=None) as batch_op:
        batch_op.drop_column('cash_tendered')
        batch_op.drop_column('pay_with')
        batch_op.drop_column('delivery_fee')
        batch_op.drop_column('delivery_references')
        batch_op.drop_column('delivery_zone')
        batch_op.drop_column('delivery_address')
    with op.batch_alter_table('business', schema=None) as batch_op:
        batch_op.drop_column('delivery_zones')
        batch_op.drop_column('delivery_min_order')
        batch_op.drop_column('delivery_fee')
        batch_op.drop_column('delivery_enabled')
