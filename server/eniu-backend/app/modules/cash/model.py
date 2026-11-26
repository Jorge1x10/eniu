"""Caja: turnos, movimientos de efectivo y pagos.

- **Turno de caja** (`CashSession`): se abre con un fondo inicial y se cierra
  con el corte, donde se cuenta el efectivo y se compara con lo esperado. Un
  negocio tiene a lo más un turno abierto.
- **Movimiento** (`CashMovement`): efectivo que entra o sale de la caja sin
  ser una venta (cambio que se trae del banco, pago a un proveedor).
- **Pago** (`Payment`): lo que se cobró de una cuenta, con su método y su
  propina. Una cuenta puede pagarse con varios métodos: todos los pagos de
  un mismo cobro comparten `checkout_id`. El pago va ligado a una cuenta de
  mesa; los pedidos a domicilio tendrán su propia columna.
"""

from app import db
from app.database.basemodel import BaseModel, UUID

SESSION_OPEN = "open"
SESSION_CLOSED = "closed"

MOVEMENT_IN = "in"
MOVEMENT_OUT = "out"
MOVEMENT_KINDS = (MOVEMENT_IN, MOVEMENT_OUT)

METHOD_CASH = "cash"
METHOD_CARD = "card"
METHOD_TRANSFER = "transfer"
METHOD_OTHER = "other"
PAYMENT_METHODS = (METHOD_CASH, METHOD_CARD, METHOD_TRANSFER, METHOD_OTHER)


class CashSession(BaseModel):
    __tablename__ = "cash_sessions"

    business_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("business.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = db.Column(db.String(16), nullable=False, default=SESSION_OPEN, server_default=SESSION_OPEN)
    opening_float = db.Column(db.Numeric(10, 2), nullable=False)
    closed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    # Se guardan al hacer el corte: el reporte no cambia si después se
    # corrige algo.
    expected_cash = db.Column(db.Numeric(10, 2), nullable=True)
    counted_cash = db.Column(db.Numeric(10, 2), nullable=True)
    notes = db.Column(db.String(200), nullable=True)

    movements = db.relationship(
        "CashMovement",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CashMovement.created_at",
    )
    payments = db.relationship("Payment", back_populates="session", order_by="Payment.created_at")

    __table_args__ = (
        # Un solo turno abierto por negocio: si dos personas abren la caja a
        # la vez, la segunda choca aquí.
        db.Index(
            "uq_cash_sessions_one_open_per_business",
            "business_id",
            unique=True,
            postgresql_where=db.text("status = 'open'"),
            sqlite_where=db.text("status = 'open'"),
        ),
        db.Index("ix_cash_sessions_business_created", "business_id", "created_at"),
        db.CheckConstraint("opening_float >= 0", name="ck_cash_sessions_float_not_negative"),
    )


class CashMovement(BaseModel):
    __tablename__ = "cash_movements"

    session_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("cash_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind = db.Column(db.String(8), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    reason = db.Column(db.String(120), nullable=False)

    session = db.relationship("CashSession", back_populates="movements")

    __table_args__ = (
        db.CheckConstraint("amount > 0", name="ck_cash_movements_amount_positive"),
    )


class Payment(BaseModel):
    __tablename__ = "payments"

    business_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("business.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("cash_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Si se borra la mesa (y con ella sus cuentas), el pago se queda: es
    # dinero que entró en ese turno. Por eso el cobro se agrupa por
    # `checkout_id` y guarda el número de mesa.
    account_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("table_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    checkout_id = db.Column(UUID(as_uuid=True), nullable=False)
    table_number = db.Column(db.Integer, nullable=True)
    method = db.Column(db.String(16), nullable=False)
    # Lo que se abona a la cuenta, sin la propina.
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    tip = db.Column(db.Numeric(10, 2), nullable=False, default=0, server_default="0")
    # Sólo en efectivo: con cuánto pagó, para calcular el cambio.
    tendered = db.Column(db.Numeric(10, 2), nullable=True)

    session = db.relationship("CashSession", back_populates="payments")
    account = db.relationship("TableAccount")

    __table_args__ = (
        db.CheckConstraint("amount >= 0", name="ck_payments_amount_not_negative"),
        db.CheckConstraint("tip >= 0", name="ck_payments_tip_not_negative"),
    )
