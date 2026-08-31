"""Guardar el idioma elegido por cada usuario

Revision ID: a3c8d51f9e64
Revises: f2b9c14e7d30
Create Date: 2026-08-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a3c8d51f9e64"
down_revision = "f2b9c14e7d30"
branch_labels = None
depends_on = None


def upgrade():
    # Las cuentas que ya existen son de usuarios que entraron a un producto en
    # español, así que ese es su valor de partida.
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "language",
                sa.String(length=5),
                nullable=False,
                server_default="es",
            )
        )


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("language")
