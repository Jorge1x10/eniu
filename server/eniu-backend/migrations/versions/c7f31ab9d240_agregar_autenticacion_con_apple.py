"""Agregar autenticacion con Apple

Revision ID: c7f31ab9d240
Revises: b1d2e3f4a5c6
Create Date: 2026-08-27 12:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c7f31ab9d240"
down_revision = "b1d2e3f4a5c6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("apple_id", sa.String(length=255), nullable=True))
        batch_op.create_unique_constraint("uq_users_apple_id", ["apple_id"])


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("uq_users_apple_id", type_="unique")
        batch_op.drop_column("apple_id")
