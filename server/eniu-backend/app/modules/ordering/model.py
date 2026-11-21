"""Mesas, cuentas y pedidos.

- **Mesa** (`DiningTable`): la da de alta el negocio una vez, porque su QR se
  imprime. El QR lleva `qr_token`, aleatorio y regenerable si se filtra.
- **Cuenta** (`TableAccount`): se abre sola con el primer pedido de una mesa
  y sólo el negocio la cierra. Es una para toda la mesa: todos los comensales
  suman a la misma.
- **Pedido** (`Order`): cada vez que un comensal manda su carrito. Lleva su
  nombre para que en el panel se lea "David | Mesa 4".
- **Línea** (`OrderItem`): un producto del pedido, con copia del nombre y del
  precio del momento. Así la cuenta no cambia si después se edita o borra el
  producto.
"""

from app import db
from app.database.basemodel import BaseModel, UUID

ACCOUNT_OPEN = "open"
ACCOUNT_CLOSED = "closed"

ORDER_PENDING = "pending"        # Enviado: esperando que el negocio lo acepte.
ORDER_RECEIVED = "received"      # Recibido: el negocio lo aceptó.
ORDER_PREPARING = "preparing"    # Preparando.
ORDER_READY = "ready"            # Listo: ya está en la mesa.
ORDER_CANCELLED = "cancelled"    # Todos sus productos se cancelaron.

# Orden de avance. Un pedido sólo avanza; cancelar es aparte y sólo lo hace
# el negocio, producto por producto o el pedido entero.
ORDER_FLOW = (ORDER_PENDING, ORDER_RECEIVED, ORDER_PREPARING, ORDER_READY)
# Lo que el negocio ya aceptó y por tanto entra en la cuenta.
ACCEPTED_STATUSES = (ORDER_RECEIVED, ORDER_PREPARING, ORDER_READY)


class DiningTable(BaseModel):
    __tablename__ = "dining_tables"

    business_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("business.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # El menú que abre su QR. Un negocio puede tener varios.
    catalogue_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("catalogue.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    number = db.Column(db.Integer, nullable=False)
    # Opcional: "Terraza 2". Sin nombre, los clientes muestran "Mesa 4".
    name = db.Column(db.String(40), nullable=True)
    qr_token = db.Column(db.String(64), nullable=False, unique=True, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, server_default=db.true())

    business = db.relationship("Business")
    catalogue = db.relationship("Catalogue")

    __table_args__ = (
        db.UniqueConstraint("business_id", "number", name="uq_dining_tables_business_number"),
    )


class TableAccount(BaseModel):
    __tablename__ = "table_accounts"

    table_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("dining_tables.id", ondelete="CASCADE"),
        nullable=False,
    )
    business_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("business.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = db.Column(db.String(16), nullable=False, default=ACCOUNT_OPEN, server_default=ACCOUNT_OPEN)
    closed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    # Sube con cada cambio de la cuenta o de sus pedidos. El comensal lo manda
    # al consultar y, si no cambió, la respuesta no carga nada más.
    version = db.Column(db.Integer, nullable=False, default=1, server_default="1")

    table = db.relationship("DiningTable")
    orders = db.relationship(
        "Order",
        back_populates="account",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Order.created_at",
    )

    __table_args__ = (
        # Una sola cuenta abierta por mesa. Si dos comensales piden a la vez
        # en una mesa vacía, el segundo choca aquí y se suma a la del primero.
        db.Index(
            "uq_table_accounts_one_open_per_table",
            "table_id",
            unique=True,
            postgresql_where=db.text("status = 'open'"),
            sqlite_where=db.text("status = 'open'"),
        ),
        db.Index("ix_table_accounts_business_status", "business_id", "status"),
    )


class Order(BaseModel):
    __tablename__ = "orders"

    account_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("table_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    diner_name = db.Column(db.String(40), nullable=False)
    # Hash del token que el navegador del comensal guarda. Sirve para
    # mostrarle sus pedidos y para que sólo quien pidió en la mesa vea la
    # cuenta; no identifica a la persona.
    device_hash = db.Column(db.String(64), nullable=False)
    # La manda el cliente para que un doble toque o un reintento por mala
    # red no creen dos pedidos.
    idempotency_key = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(16), nullable=False, default=ORDER_PENDING, server_default=ORDER_PENDING)
    received_at = db.Column(db.DateTime(timezone=True), nullable=True)
    preparing_at = db.Column(db.DateTime(timezone=True), nullable=True)
    ready_at = db.Column(db.DateTime(timezone=True), nullable=True)
    cancelled_at = db.Column(db.DateTime(timezone=True), nullable=True)

    account = db.relationship("TableAccount", back_populates="orders")
    items = db.relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="OrderItem.position",
    )

    __table_args__ = (
        db.UniqueConstraint("device_hash", "idempotency_key", name="uq_orders_device_idempotency"),
        db.Index("ix_orders_account_device", "account_id", "device_hash"),
    )


class OrderItem(BaseModel):
    __tablename__ = "order_items"

    order_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Referencia viva al producto; queda en nulo si se borra. La cuenta no la
    # necesita: usa las copias de abajo.
    product_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    position = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    name = db.Column(db.String(64), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.String(200), nullable=True)
    is_cancelled = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    cancelled_at = db.Column(db.DateTime(timezone=True), nullable=True)

    order = db.relationship("Order", back_populates="items")

    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        db.CheckConstraint("unit_price >= 0", name="ck_order_items_price_not_negative"),
    )

    @property
    def line_total(self):
        return self.unit_price * self.quantity
