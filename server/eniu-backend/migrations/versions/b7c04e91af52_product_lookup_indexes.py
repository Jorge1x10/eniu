"""Índices para las consultas de productos del menú público

Postgres no indexa las claves foráneas por su cuenta. Sin estos índices, cada
consulta del menú público recorría la tabla `products` completa, y borrar una
categoría obligaba a recorrerla otra vez para poner en NULL los productos que
la referenciaban.

Se usa CREATE INDEX normal y no CONCURRENTLY: el segundo no puede correr dentro
de una transacción, que es como Alembic aplica las migraciones, y la tabla hoy
es lo bastante chica para que el bloqueo de escrituras dure un parpadeo. Si
algún día `products` crece a millones de filas, esta migración habría que
rehacerla fuera de transacción.

Revision ID: b7c04e91af52
Revises: e5b2f38c7a91
Create Date: 2026-08-29 19:05:00.000000

"""
from alembic import op


revision = "b7c04e91af52"
down_revision = "e5b2f38c7a91"
branch_labels = None
depends_on = None


def upgrade():
    # El orden de las columnas es el orden en que se usan al servir un menú:
    # se filtra por catálogo, luego por sección, y se ordena por display_order
    # y created_at. Así la base resuelve filtro y ordenamiento recorriendo el
    # índice una vez, sin ordenar después.
    op.create_index(
        "ix_products_catalogue_section_order",
        "products",
        ["catalogue_id", "category_id", "display_order", "created_at"],
    )
    # Para el ON DELETE SET NULL de la FK: el índice de arriba no sirve porque
    # `category_id` no es su primera columna.
    op.create_index("ix_products_category", "products", ["category_id"])


def downgrade():
    op.drop_index("ix_products_category", table_name="products")
    op.drop_index("ix_products_catalogue_section_order", table_name="products")
