"""add catalogue splash screen

Revision ID: d4a7c91e5b28
Revises: c7f31ab9d240
Create Date: 2026-08-28 07:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4a7c91e5b28'
down_revision = 'c7f31ab9d240'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('catalogue_template', schema=None) as batch_op:
        batch_op.add_column(sa.Column('splash_enabled', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('splash_filename', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('splash_duration', sa.Float(), server_default='2.5', nullable=False))


def downgrade():
    with op.batch_alter_table('catalogue_template', schema=None) as batch_op:
        batch_op.drop_column('splash_duration')
        batch_op.drop_column('splash_filename')
        batch_op.drop_column('splash_enabled')
