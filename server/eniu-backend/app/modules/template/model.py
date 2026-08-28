from app import db
from app.database.basemodel import BaseModel, UUID


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

    catalogue = db.relationship("Catalogue", back_populates="template_config")

    def to_dict(self):
        template_key = self.template_key if self.template_key in {
            "modern", "minimal", "elegant", "bistro", "bold", "natural",
            "retro", "luxury",
        } else "modern"
        font_key = self.font_key if self.font_key in {"inter", "poppins", "montserrat", "playfair", "lora"} else "inter"
        return {
            "template_key": template_key,
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
