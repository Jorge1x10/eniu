from app import db
from datetime import datetime,timezone
import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import func

def utc_now():
    return datetime.now(timezone.utc)

class BaseModel(db.Model):
    __abstract__ = True

    id = db.Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    created_at = db.Column(
    db.DateTime(timezone=True),
    nullable=False,
    default=utc_now,
    server_default=func.now()
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=func.now(),
        onupdate=utc_now
    )