"""catalogue template configuration

Revision ID: d921ae33c417
Revises: e31f47b2a6c8
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "d921ae33c417"
down_revision = "e31f47b2a6c8"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "catalogue_template",
        sa.Column("catalogue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_key", sa.String(length=24), server_default="modern", nullable=False),
        sa.Column("background_color", sa.String(length=7), server_default="#FFFDF5", nullable=False),
        sa.Column("primary_color", sa.String(length=7), server_default="#FFE05A", nullable=False),
        sa.Column("accent_color", sa.String(length=7), server_default="#E8C93D", nullable=False),
        sa.Column("text_color", sa.String(length=7), server_default="#111111", nullable=False),
        sa.Column("font_key", sa.String(length=24), server_default="inter", nullable=False),
        sa.Column("show_cover", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("show_product_images", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("cover_filename", sa.String(length=255), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["catalogue_id"], ["catalogue.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("catalogue_id"),
    )


def downgrade():
    op.drop_table("catalogue_template")
