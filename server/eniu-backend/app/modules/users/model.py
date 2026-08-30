from app import db
from app.database.basemodel import BaseModel
from app.modules.billing.plans import FREE, plan_payload



class User(BaseModel):

    __tablename__ = "users"
    google_id = db.Column(db.String(255), unique=True, nullable=True)
    apple_id = db.Column(db.String(255), unique=True, nullable=True)
    # Apple exige revocar la sesión al borrar la cuenta, y su API de
    # revocación pide este token. Se obtiene al canjear el authorization
    # code del inicio de sesión y sólo sirve para eso.
    apple_refresh_token = db.Column(db.String(255), nullable=True)
    profile_picture = db.Column(db.String(500), nullable=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    business = db.relationship("Business", back_populates="owner", cascade="all, delete-orphan")
    password = db.Column(db.String(255), nullable=True)
    username = db.Column(db.String(50), nullable=True, unique=True)
    phone_number = db.Column(db.String(20), nullable=True, unique=True)
    name = db.Column(db.String(50), unique=False, nullable=True)
    auth_version = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    # Un checkbox que no deja rastro no prueba nada el día que haya que
    # demostrar que alguien aceptó, y qué versión aceptó.
    terms_accepted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    terms_version = db.Column(db.String(32), nullable=True)
    password_reset_tokens = db.relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    billing_subscription = db.relationship(
        "BillingSubscription",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )

    def to_dict(self):
        subscription = self.billing_subscription
        return {
            "id": str(self.id),
            "email": self.email,
            "username": self.username,
            "phone_number": self.phone_number,
            "name": self.name,
            "profile_picture": self.profile_picture,
            "auth_methods": {
                "password": bool(self.password),
                "google": bool(self.google_id),
                "apple": bool(self.apple_id),
            },
            "plan": subscription.to_plan_dict() if subscription else plan_payload(FREE),
            "terms": {
                "accepted_at": self.terms_accepted_at.isoformat() if self.terms_accepted_at else None,
                "version": self.terms_version,
            },
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at else None
            ),
        }
