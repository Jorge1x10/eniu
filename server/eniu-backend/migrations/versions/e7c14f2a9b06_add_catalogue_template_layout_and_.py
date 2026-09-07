"""add catalogue template layout and palette

Revision ID: e7c14f2a9b06
Revises: a3c8d51f9e64
Create Date: 2026-09-03 00:00:00.000000

"""
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e7c14f2a9b06'
down_revision = 'a3c8d51f9e64'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('catalogue_template', schema=None) as batch_op:
        batch_op.add_column(sa.Column('layout_key', sa.String(length=24), server_default='modern', nullable=False))
        batch_op.add_column(sa.Column('color_preset_key', sa.String(length=24), nullable=True))
        batch_op.add_column(sa.Column('theme_overrides', sa.JSON(), server_default=sa.text("'{}'"), nullable=False))

    # Backfill: `layout_key` copia `template_key` (mismo catálogo de 8 claves,
    # sin cambios visuales) y `theme_overrides` deriva los tokens nuevos de los
    # 4 colores existentes de cada fila, para que ningún menú público en vivo
    # cambie de aspecto al desplegar. `color_preset_key` se deja en NULL: son
    # combinaciones de color arbitrarias que no se deben forzar a la paleta
    # curada más parecida.
    #
    # Esta migración no importa `app.modules.template.catalog` a propósito:
    # el código de la app puede cambiar después, pero lo que esta migración
    # ejecutó en su momento debe quedar congelado aquí para siempre.
    connection = op.get_bind()
    rows = connection.execute(sa.text(
        'SELECT id, template_key, background_color, primary_color, accent_color, text_color '
        'FROM catalogue_template'
    )).fetchall()
    for row in rows:
        overrides = _derive_tokens(row.background_color, row.primary_color, row.accent_color, row.text_color)
        connection.execute(
            sa.text(
                'UPDATE catalogue_template SET layout_key = :layout_key, theme_overrides = :overrides '
                'WHERE id = :id'
            ),
            {"layout_key": row.template_key, "overrides": json.dumps(overrides), "id": row.id},
        )


def downgrade():
    with op.batch_alter_table('catalogue_template', schema=None) as batch_op:
        batch_op.drop_column('theme_overrides')
        batch_op.drop_column('color_preset_key')
        batch_op.drop_column('layout_key')


def _to_rgb(hex_color):
    value = hex_color.lstrip('#')
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def _mix(hex_a, hex_b, weight):
    a, b = _to_rgb(hex_a), _to_rgb(hex_b)
    mixed = tuple(round(a[index] * weight + b[index] * (1 - weight)) for index in range(3))
    return '#%02X%02X%02X' % mixed


def _derive_tokens(background, primary, accent, text):
    """Copia congelada de `catalog.derive_tokens` al momento de esta migración."""
    return {
        'surface': background,
        'muted': _mix(text, background, 0.65),
        'price': text,
        'category_title': text,
        'nav_chip_bg': primary,
        'nav_chip_text': text,
    }
