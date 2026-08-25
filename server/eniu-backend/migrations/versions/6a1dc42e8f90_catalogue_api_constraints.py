"""Catalogue API constraints

Revision ID: 6a1dc42e8f90
Revises: 93ed3045170e
Create Date: 2026-08-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "6a1dc42e8f90"
down_revision = "93ed3045170e"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("catalogue", schema=None) as batch_op:
        batch_op.drop_constraint("catalogue_public_id_key", type_="unique")
        batch_op.drop_column("public_id")

    op.create_index(
        "uq_catalogue_business_name_ci",
        "catalogue",
        ["business_id", sa.text("lower(name)")],
        unique=True,
    )

    with op.batch_alter_table("category", schema=None) as batch_op:
        batch_op.drop_constraint("category_catalogue_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "category_catalogue_id_fkey",
            "catalogue",
            ["catalogue_id"],
            ["id"],
            ondelete="CASCADE",
        )

    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.drop_constraint("products_catalogue_id_fkey", type_="foreignkey")
        batch_op.drop_constraint("products_category_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "products_catalogue_id_fkey",
            "catalogue",
            ["catalogue_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_foreign_key(
            "products_category_id_fkey",
            "category",
            ["category_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade():
    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.drop_constraint("products_category_id_fkey", type_="foreignkey")
        batch_op.drop_constraint("products_catalogue_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "products_category_id_fkey",
            "category",
            ["category_id"],
            ["id"],
        )
        batch_op.create_foreign_key(
            "products_catalogue_id_fkey",
            "catalogue",
            ["catalogue_id"],
            ["id"],
        )

    with op.batch_alter_table("category", schema=None) as batch_op:
        batch_op.drop_constraint("category_catalogue_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "category_catalogue_id_fkey",
            "catalogue",
            ["catalogue_id"],
            ["id"],
        )

    with op.batch_alter_table("catalogue", schema=None) as batch_op:
        batch_op.add_column(sa.Column("public_id", sa.UUID(), nullable=True))

    op.drop_index("uq_catalogue_business_name_ci", table_name="catalogue")

    op.execute("UPDATE catalogue SET public_id = gen_random_uuid()")

    with op.batch_alter_table("catalogue", schema=None) as batch_op:
        batch_op.alter_column("public_id", nullable=False)
        batch_op.create_unique_constraint("catalogue_public_id_key", ["public_id"])
