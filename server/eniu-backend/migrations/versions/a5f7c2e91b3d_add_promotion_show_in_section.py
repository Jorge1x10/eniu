"""add promotion show_in_section

Revision ID: a5f7c2e91b3d
Revises: d4e91a7c2b58
Create Date: 2026-09-06

Una promoción ya etiquetaba sus productos donde estuvieran; esta columna decide
si además encabeza el menú en la sección "Promociones de hoy".

Aditiva y con `server_default` en falso a propósito: las promociones que ya
existen siguen comportándose igual y ningún menú publicado estrena la sección
sin que su dueño la active.
"""
from alembic import op
import sqlalchemy as sa

revision = 'a5f7c2e91b3d'
down_revision = 'd4e91a7c2b58'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'promotion',
        sa.Column(
            'show_in_section',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade():
    op.drop_column('promotion', 'show_in_section')
