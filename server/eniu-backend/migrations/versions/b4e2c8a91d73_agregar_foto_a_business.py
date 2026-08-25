"""Agregar foto opcional a business

Revision ID: b4e2c8a91d73
Revises: f4755001b631
Create Date: 2026-08-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b4e2c8a91d73"
down_revision = "f4755001b631"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("business", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("photo_filename", sa.String(length=255), nullable=True)
        )


def downgrade():
    with op.batch_alter_table("business", schema=None) as batch_op:
        batch_op.drop_column("photo_filename")
