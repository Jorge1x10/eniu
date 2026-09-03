"""add cover focal point, background preset and promotions

Revision ID: c3a58d2f6e17
Revises: e7c14f2a9b06
Create Date: 2026-09-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

from app.database.basemodel import UUID


# revision identifiers, used by Alembic.
revision = 'c3a58d2f6e17'
down_revision = 'e7c14f2a9b06'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('catalogue_template', schema=None) as batch_op:
        batch_op.add_column(sa.Column('cover_focal_x', sa.Float(), server_default='0.5', nullable=False))
        batch_op.add_column(sa.Column('cover_focal_y', sa.Float(), server_default='0.5', nullable=False))
        batch_op.add_column(sa.Column('background_preset_key', sa.String(length=24), nullable=True))

    op.create_table(
        'promotion',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('catalogue_id', UUID(as_uuid=True), sa.ForeignKey('catalogue.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('badge_label', sa.String(length=24), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('days_of_week', sa.JSON(), server_default=sa.text("'[]'"), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
    )
    op.create_index(op.f('ix_promotion_catalogue_id'), 'promotion', ['catalogue_id'])

    op.create_table(
        'promotion_products',
        sa.Column('promotion_id', UUID(as_uuid=True), sa.ForeignKey('promotion.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('product_id', UUID(as_uuid=True), sa.ForeignKey('products.id', ondelete='CASCADE'), primary_key=True),
    )
    op.create_table(
        'promotion_categories',
        sa.Column('promotion_id', UUID(as_uuid=True), sa.ForeignKey('promotion.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('category_id', UUID(as_uuid=True), sa.ForeignKey('category.id', ondelete='CASCADE'), primary_key=True),
    )


def downgrade():
    op.drop_table('promotion_categories')
    op.drop_table('promotion_products')
    op.drop_index(op.f('ix_promotion_catalogue_id'), table_name='promotion')
    op.drop_table('promotion')

    with op.batch_alter_table('catalogue_template', schema=None) as batch_op:
        batch_op.drop_column('background_preset_key')
        batch_op.drop_column('cover_focal_y')
        batch_op.drop_column('cover_focal_x')
