from app import db
from app.database.basemodel import BaseModel, UUID

# Asociaciones simples: una promoción puede señalar productos sueltos y/o
# categorías completas (que arrastran a todos sus productos). Tablas planas,
# sin modelo propio, porque no cargan ningún dato aparte de la relación.
promotion_products = db.Table(
    "promotion_products",
    db.Column("promotion_id", UUID(as_uuid=True), db.ForeignKey("promotion.id", ondelete="CASCADE"), primary_key=True),
    db.Column("product_id", UUID(as_uuid=True), db.ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
)

promotion_categories = db.Table(
    "promotion_categories",
    db.Column("promotion_id", UUID(as_uuid=True), db.ForeignKey("promotion.id", ondelete="CASCADE"), primary_key=True),
    db.Column("category_id", UUID(as_uuid=True), db.ForeignKey("category.id", ondelete="CASCADE"), primary_key=True),
)


class Promotion(BaseModel):
    """Resalta productos/categorías en el menú público durante ciertos días.

    No cambia precios (ver la nota en `services.py`): sólo decide si hoy le
    pone una etiqueta visual a un producto y, opcionalmente, aparece en la
    sección "Promociones de hoy" del menú.
    """
    __tablename__ = "promotion"

    catalogue_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("catalogue.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = db.Column(db.String(64), nullable=False)
    # Lo que se muestra en la etiqueta sobre el producto; si no se define, el
    # cliente le pone un texto genérico ("Promo") en su propio idioma.
    badge_label = db.Column(db.String(24), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, server_default=db.true())
    # 0 = lunes … 6 = domingo. Lista vacía = aplica todos los días (dentro del
    # rango de fechas, si hay uno).
    days_of_week = db.Column(db.JSON, nullable=False, default=list, server_default="[]")
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

    catalogue = db.relationship("Catalogue", back_populates="promotions")
    products = db.relationship("Product", secondary=promotion_products)
    categories = db.relationship("Category", secondary=promotion_categories)

    def is_active_on(self, date):
        if not self.is_active:
            return False
        if self.start_date and date < self.start_date:
            return False
        if self.end_date and date > self.end_date:
            return False
        if self.days_of_week:
            return date.weekday() in self.days_of_week
        return True

    def to_dict(self):
        return {
            "id": str(self.id),
            "catalogue_id": str(self.catalogue_id),
            "name": self.name,
            "badge_label": self.badge_label,
            "is_active": self.is_active,
            "days_of_week": list(self.days_of_week or []),
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "product_ids": [str(product.id) for product in self.products],
            "category_ids": [str(category.id) for category in self.categories],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
