"""Guardar el refresh token de Apple

Revision ID: f2b9c14e7d30
Revises: e5b2f38c7a91
Create Date: 2026-08-30 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f2b9c14e7d30"
down_revision = "e5b2f38c7a91"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("apple_refresh_token", sa.String(length=255), nullable=True)
        )


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("apple_refresh_token")
