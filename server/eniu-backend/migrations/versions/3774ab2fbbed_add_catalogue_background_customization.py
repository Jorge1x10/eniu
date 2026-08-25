"""add catalogue background customization

Revision ID: 3774ab2fbbed
Revises: 0161decd8ffb
Create Date: 2026-08-13 13:00:07.046928

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3774ab2fbbed'
down_revision = '0161decd8ffb'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('catalogue_template', schema=None) as batch_op:
        batch_op.add_column(sa.Column('background_filename', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('background_opacity', sa.Float(), server_default='0.2', nullable=False))



def downgrade():
    with op.batch_alter_table('catalogue_template', schema=None) as batch_op:
        batch_op.drop_column('background_opacity')
        batch_op.drop_column('background_filename')
