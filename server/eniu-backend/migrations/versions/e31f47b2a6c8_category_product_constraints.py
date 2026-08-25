"""Category and product constraints

Revision ID: e31f47b2a6c8
Revises: 6a1dc42e8f90
Create Date: 2026-08-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e31f47b2a6c8"
down_revision = "6a1dc42e8f90"
branch_labels = None
depends_on = None


def _count(connection, statement):
    return connection.execute(sa.text(statement)).scalar_one()


def upgrade():
    connection = op.get_bind()

    if _count(connection, "SELECT count(*) FROM products WHERE catalogue_id IS NULL"):
        raise RuntimeError(
            "No se puede aplicar catalogue_id NOT NULL: existen productos sin catálogo"
        )
    if _count(connection, "SELECT count(*) FROM products WHERE price < 0"):
        raise RuntimeError(
            "No se puede agregar la restricción de precio: existen precios negativos"
        )
    if _count(
        connection,
        """
        SELECT count(*)
        FROM (
            SELECT catalogue_id, name
            FROM category
            GROUP BY catalogue_id, name
            HAVING count(*) > 1
        ) AS duplicates
        """,
    ):
        raise RuntimeError(
            "No se puede agregar la unicidad: existen categorías duplicadas"
        )

    op.execute("UPDATE category SET display_order = 0 WHERE display_order IS NULL")
    op.execute("UPDATE products SET display_order = 0 WHERE display_order IS NULL")

    with op.batch_alter_table("category", schema=None) as batch_op:
        batch_op.alter_column(
            "is_visible",
            existing_type=sa.Boolean(),
            existing_nullable=False,
            server_default=sa.true(),
        )
        batch_op.alter_column(
            "display_order",
            existing_type=sa.Integer(),
            nullable=False,
            server_default="0",
        )
        batch_op.create_unique_constraint(
            "uq_category_catalogue_name",
            ["catalogue_id", "name"],
        )

    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.alter_column(
            "catalogue_id",
            existing_type=sa.UUID(),
            nullable=False,
        )
        batch_op.alter_column(
            "display_order",
            existing_type=sa.Integer(),
            nullable=False,
            server_default="0",
        )
        batch_op.alter_column(
            "is_available",
            existing_type=sa.Boolean(),
            existing_nullable=False,
            server_default=sa.true(),
        )
        batch_op.create_check_constraint(
            "ck_products_price_non_negative",
            "price IS NULL OR price >= 0",
        )


def downgrade():
    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.drop_constraint(
            "ck_products_price_non_negative",
            type_="check",
        )
        batch_op.alter_column(
            "is_available",
            existing_type=sa.Boolean(),
            existing_nullable=False,
            server_default=None,
        )
        batch_op.alter_column(
            "display_order",
            existing_type=sa.Integer(),
            nullable=True,
            server_default=None,
        )
        batch_op.alter_column(
            "catalogue_id",
            existing_type=sa.UUID(),
            nullable=True,
        )

    with op.batch_alter_table("category", schema=None) as batch_op:
        batch_op.drop_constraint(
            "uq_category_catalogue_name",
            type_="unique",
        )
        batch_op.alter_column(
            "display_order",
            existing_type=sa.Integer(),
            nullable=True,
            server_default=None,
        )
        batch_op.alter_column(
            "is_visible",
            existing_type=sa.Boolean(),
            existing_nullable=False,
            server_default=None,
        )
