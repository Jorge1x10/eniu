"""add terms acceptance

Revision ID: e5b2f38c7a91
Revises: d4a7c91e5b28
Create Date: 2026-08-28 23:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5b2f38c7a91'
down_revision = 'd4a7c91e5b28'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('terms_accepted_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('terms_version', sa.String(length=32), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('terms_version')
        batch_op.drop_column('terms_accepted_at')
