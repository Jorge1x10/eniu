from app import db
from app.database.basemodel import BaseModel, UUID


class Business(BaseModel):

    __tablename__ = "business"
    name  = db.Column(db.String(64), nullable=False, unique=False)
    owner_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
    owner = db.relationship("User", back_populates="business")
    address = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    whatsapp = db.Column(db.String(20), nullable=True)
    timezone = db.Column(db.String(64), nullable=False, default="America/Mexico_City", server_default="America/Mexico_City")
    website = db.Column(db.Text, nullable = True)
    photo_filename = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, nullable = False, default=True)
    currency = db.Column(db.String, nullable=False, default="MXN")
    catalogues = db.relationship(
        "Catalogue",
        back_populates="business",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "owner_id": str(self.owner_id),
            "address": self.address,
            "description": self.description,
            "phone": self.phone,
            "whatsapp": self.whatsapp,
            "timezone": self.timezone,
            "website": self.website,
            "photo_url": (
                f"/api/businesses/{self.id}/photo"
                if self.photo_filename
                else None
            ),
            "is_active": self.is_active,
            "currency": self.currency,
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
