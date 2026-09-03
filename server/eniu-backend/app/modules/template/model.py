from app import db
from app.database.basemodel import BaseModel, UUID
from app.modules.template import catalog


class CatalogueTemplate(BaseModel):
    __tablename__ = "catalogue_template"

    catalogue_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("catalogue.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    template_key = db.Column(db.String(24), nullable=False, default="modern", server_default="modern")
    background_color = db.Column(db.String(7), nullable=False, default="#FFFDF5", server_default="#FFFDF5")
    primary_color = db.Column(db.String(7), nullable=False, default="#FFE05A", server_default="#FFE05A")
    accent_color = db.Column(db.String(7), nullable=False, default="#E8C93D", server_default="#E8C93D")
    text_color = db.Column(db.String(7), nullable=False, default="#111111", server_default="#111111")
    font_key = db.Column(db.String(24), nullable=False, default="inter", server_default="inter")
    show_cover = db.Column(db.Boolean, nullable=False, default=True, server_default=db.true())
    show_product_images = db.Column(db.Boolean, nullable=False, default=True, server_default=db.true())
    cover_filename = db.Column(db.String(255), nullable=True)
    background_filename = db.Column(db.String(255), nullable=True)
    background_opacity = db.Column(db.Float, nullable=False, default=0.2, server_default="0.2")
    splash_enabled = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    splash_filename = db.Column(db.String(255), nullable=True)
    splash_duration = db.Column(db.Float, nullable=False, default=2.5, server_default="2.5")
    # Sucesor de `template_key`: mismo catálogo de claves hoy, pero ahora
    # describe una composición (`catalog.LAYOUTS`), no sólo un estilo.
    layout_key = db.Column(db.String(24), nullable=False, default="modern", server_default="modern")
    # NULL = colores personalizados (modo avanzado), no una paleta curada.
    color_preset_key = db.Column(db.String(24), nullable=True)
    # Tokens extra (surface, muted, price, category_title, nav_chip_*) que no
    # tienen columna propia — dispersos, se completan con la paleta/derivación
    # al leer. Ver `catalog.resolve_theme`.
    theme_overrides = db.Column(db.JSON, nullable=False, default=dict, server_default="{}")
    # Punto focal de la portada (0-1, 0.5/0.5 = centrado): qué parte de la
    # imagen queda visible dentro del recuadro fijo, sin recortar el archivo.
    cover_focal_x = db.Column(db.Float, nullable=False, default=0.5, server_default="0.5")
    cover_focal_y = db.Column(db.Float, nullable=False, default=0.5, server_default="0.5")
    # NULL = sin fondo prediseñado (puede seguir usando una imagen propia via
    # `background_filename`, como hoy).
    background_preset_key = db.Column(db.String(24), nullable=True)

    catalogue = db.relationship("Catalogue", back_populates="template_config")

    def to_dict(self):
        template_key = self.template_key if self.template_key in catalog.LAYOUTS else catalog.DEFAULT_LAYOUT_KEY
        layout_key = self.layout_key if self.layout_key in catalog.LAYOUTS else template_key
        font_key = self.font_key if self.font_key in catalog.FONTS else catalog.DEFAULT_FONT_KEY
        core_colors = {
            "background": self.background_color,
            "primary": self.primary_color,
            "accent": self.accent_color,
            "text": self.text_color,
        }
        tokens = catalog.resolve_theme(core_colors, self.color_preset_key, self.theme_overrides)
        return {
            # `template_key` se mantiene como alias del `layout_key` mientras
            # haya clientes (app/web) que todavía no leen el campo nuevo.
            "template_key": template_key,
            "layout_key": layout_key,
            "theme": {
                "background_color": self.background_color,
                "primary_color": self.primary_color,
                "accent_color": self.accent_color,
                "text_color": self.text_color,
                "font_key": font_key,
                "show_cover": self.show_cover,
                "show_product_images": self.show_product_images,
                "cover_image_url": (
                    f"/api/catalogues/{self.catalogue_id}/cover"
                    if self.cover_filename else None
                ),
                "background_image_url": (
                    f"/api/catalogues/{self.catalogue_id}/background"
                    if self.background_filename else None
                ),
                "background_opacity": self.background_opacity,
                # Campos nuevos: crudos (para que el editor avanzado pueda
                # re-mostrar exactamente lo guardado) y resueltos (`tokens`,
                # el set completo de 10 colores que consume el layout).
                "color_preset_key": self.color_preset_key,
                "theme_overrides": dict(self.theme_overrides or {}),
                "tokens": tokens,
                "cover_focal_x": self.cover_focal_x,
                "cover_focal_y": self.cover_focal_y,
                "background_preset_key": (
                    self.background_preset_key if self.background_preset_key in catalog.BACKGROUNDS else None
                ),
            },
            "splash": {
                "enabled": self.splash_enabled,
                "duration": self.splash_duration,
                "image_url": (
                    f"/api/catalogues/{self.catalogue_id}/splash"
                    if self.splash_filename else None
                ),
            },
        }
