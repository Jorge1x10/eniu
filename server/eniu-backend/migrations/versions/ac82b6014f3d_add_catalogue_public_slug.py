"""add catalogue public slug

Revision ID: ac82b6014f3d
Revises: d921ae33c417
"""

from alembic import op
import sqlalchemy as sa
import re
import unicodedata


revision = "ac82b6014f3d"
down_revision = "d921ae33c417"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("catalogue", sa.Column("public_slug", sa.String(length=120), nullable=True))
    connection = op.get_bind()
    published = connection.execute(sa.text(
        "SELECT c.id, c.name AS catalogue_name, b.name AS business_name "
        "FROM catalogue c JOIN business b ON b.id = c.business_id "
        "WHERE c.is_published = true ORDER BY c.created_at, c.id"
    )).mappings()
    used = set()
    for row in published:
        source = f"{row['business_name']}-{row['catalogue_name']}"
        ascii_value = unicodedata.normalize("NFKD", source).encode("ascii", "ignore").decode("ascii")
        base = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")[:96].rstrip("-") or "menu"
        candidate = base
        suffix = 2
        while candidate in used:
            candidate = f"{base}-{suffix}"
            suffix += 1
        used.add(candidate)
        connection.execute(
            sa.text("UPDATE catalogue SET public_slug = :slug WHERE id = :catalogue_id"),
            {"slug": candidate, "catalogue_id": row["id"]},
        )
    op.create_unique_constraint("uq_catalogue_public_slug", "catalogue", ["public_slug"])


def downgrade():
    op.drop_constraint("uq_catalogue_public_slug", "catalogue", type_="unique")
    op.drop_column("catalogue", "public_slug")
