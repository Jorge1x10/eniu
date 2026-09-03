from app import db
from app.database.basemodel import BaseModel, UUID
from sqlalchemy import func

class Catalogue(BaseModel):
    __tablename__ = "catalogue"

    name = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=True)

    business_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("business.id", ondelete="CASCADE"),
        nullable=False
    )

    template_id = db.Column(db.Integer, nullable=True)
    public_slug = db.Column(db.String(120), nullable=True)

    is_published = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    published_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True
    )

    business = db.relationship(
        "Business",
        back_populates="catalogues"
    )

    categories = db.relationship(
        "Category",
        back_populates="catalogue",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    products = db.relationship(
        "Product",
        back_populates="catalogue",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    template_config = db.relationship(
        "CatalogueTemplate",
        back_populates="catalogue",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )

    analytics_events = db.relationship(
        "AnalyticsEvent",
        back_populates="catalogue",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    promotions = db.relationship(
        "Promotion",
        back_populates="catalogue",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        db.UniqueConstraint("public_slug", name="uq_catalogue_public_slug"),
        db.Index(
            "uq_catalogue_business_name_ci",
            business_id,
            func.lower(name),
            unique=True,
        ),
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "public_id": str(self.id),
            "business_id": str(self.business_id),
            "name": self.name,
            "description": self.description,
            "template_id": self.template_id,
            "public_slug": self.public_slug,
            "is_published": self.is_published,
            "published_at": (
                self.published_at.isoformat()
                if self.published_at
                else None
            ),
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
        }
