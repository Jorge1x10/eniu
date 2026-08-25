from app import db
from app.database.basemodel import BaseModel, UUID

class Category(BaseModel):
    __tablename__ = "category"

    name = db.Column(db.String(64), nullable=False)
    catalogue_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("catalogue.id", ondelete="CASCADE"),
        nullable=False,
    )
    description = db.Column(db.Text, nullable=True)
    is_visible = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
        server_default=db.true(),
    )
    display_order = db.Column(
        db.Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    catalogue = db.relationship(
            "Catalogue",
            back_populates="categories"
        )

    products = db.relationship(
        "Product",
        back_populates="category",
        passive_deletes=True,
    )

    __table_args__ = (
        db.UniqueConstraint(
            "catalogue_id",
            "name",
            name="uq_category_catalogue_name",
        ),
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "catalogue_id": str(self.catalogue_id),
            "name": self.name,
            "description": self.description,
            "is_visible": self.is_visible,
            "display_order": self.display_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
