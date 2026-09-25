import json

from app import db
from app.database.basemodel import BaseModel, UUID

class Product(BaseModel):
    __tablename__ = "products"

    name = db.Column(db.String(64), nullable=False)
    catalogue_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("catalogue.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("category.id", ondelete="SET NULL"),
        nullable=True,
    )
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(10,2), nullable=True)
    display_order = db.Column(
        db.Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    is_available = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
        server_default=db.true(),
    )
    pictures = db.Column(db.Text, nullable=True)
    catalogue = db.relationship(
        "Catalogue",
        back_populates="products"
    )

    category = db.relationship(
        "Category",
        back_populates="products"
    )

    __table_args__ = (
        db.CheckConstraint(
            "price IS NULL OR price >= 0",
            name="ck_products_price_non_negative",
        ),
        # Postgres no indexa las claves foráneas por su cuenta, así que sin
        # esto cada consulta del menú público recorría la tabla entera.
        #
        # Las columnas van en el orden en que se usan al servir un menú: se
        # filtra por catálogo, luego por sección, y se ordena por
        # display_order y created_at. Con ese orden la base resuelve el filtro
        # y el ordenamiento en un solo recorrido del índice, sin ordenar
        # después. El prefijo `catalogue_id` sirve igual para cargar el
        # catálogo completo, así que no hace falta un índice aparte para eso.
        db.Index(
            "ix_products_catalogue_section_order",
            "catalogue_id", "category_id", "display_order", "created_at",
        ),
        # `category_id` a secas es para el borrado: la FK es ON DELETE SET
        # NULL, y sin índice propio borrar una categoría obliga a recorrer
        # todos los productos. El índice de arriba no sirve para eso porque
        # `category_id` no es su primera columna.
        db.Index("ix_products_category", "category_id"),
    )

    def to_dict(self):
        pictures = self.picture_metadata()
        return {
            "id": str(self.id),
            "catalogue_id": str(self.catalogue_id),
            "category_id": str(self.category_id) if self.category_id else None,
            "name": self.name,
            "description": self.description,
            "price": format(self.price, ".2f") if self.price is not None else None,
            "display_order": self.display_order,
            "is_available": self.is_available,
            "pictures": [
                {
                    "id": picture["id"],
                    "url": (
                        picture.get("url")
                        or f"/api/products/{self.id}/images/{picture['filename']}"
                    ),
                    "is_default": picture.get("is_default", False),
                }
                for picture in pictures
            ],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def picture_metadata(self):
        if not self.pictures:
            return []
        try:
            decoded = json.loads(self.pictures)
        except (TypeError, json.JSONDecodeError):
            return [{"id": "legacy-0", "url": self.pictures, "is_default": True}]
        if not isinstance(decoded, list):
            return []
        pictures = [item for item in decoded if isinstance(item, dict)]
        if pictures and not any(item.get("is_default") for item in pictures):
            pictures[0]["is_default"] = True
        return pictures
