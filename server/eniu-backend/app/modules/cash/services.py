"""Caja: abrir el turno, cobrar cuentas, movimientos de efectivo y corte.

Reglas (ver `docs/CASH.md`):

- Para cobrar tiene que haber un turno de caja abierto: cada pago queda en
  el turno en que entró, y el corte sólo suma los suyos.
- Una cuenta se cobra completa de una vez, con uno o varios métodos. La
  suma de lo abonado (sin propinas) debe ser exactamente el total que
  calcula el servidor. Cobrar la cierra.
- El efectivo esperado en el corte es: fondo + efectivo cobrado (con sus
  propinas) + entradas − retiros. Las propinas con tarjeta o transferencia
  no están en la caja.
- Cerrar una cuenta sin cobrar sigue existiendo (cortesías, errores); el
  reporte del turno la muestra aparte.
"""

import re
from collections import OrderedDict
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import selectinload

from app.database.basemodel import utc_now
from app.database.db import db
from app.modules.catalogue.services import _business_access
from app.modules.ordering.model import ACCOUNT_CLOSED, ACCOUNT_OPEN, ORDER_PENDING, Order, TableAccount
from app.modules.ordering.services import (
    _account_payload_for_business,
    _aware,
    _iso,
    _money,
    _touch,
    _uuid,
    account_total,
)
from app.shared.i18n import _

from .model import (
    METHOD_CASH,
    MOVEMENT_IN,
    MOVEMENT_KINDS,
    PAYMENT_METHODS,
    SESSION_CLOSED,
    SESSION_OPEN,
    CashMovement,
    CashSession,
    Payment,
)

MAX_AMOUNT = Decimal("1000000")
MAX_PAYMENTS = 10
MAX_REASON = 120
MAX_NOTES = 200
HISTORY_LIMIT = 30
CENT = Decimal("0.01")
# Sin notación científica ni signos: "150", "150.5", "150.50".
AMOUNT_RE = re.compile(r"^\d{1,9}(\.\d{1,2})?$")


class CashError(Exception):
    """Error de validación con su respuesta ya armada."""

    def __init__(self, message, status=400, **extra):
        super().__init__(message)
        self.payload = {"message": message, **extra}
        self.status = status


def _amount(value, field, allow_zero=True):
    """Un importe en pesos: número o texto, hasta 2 decimales, no negativo."""
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise CashError(_("{field} debe ser un importe válido", field=field))
    text = str(value).strip()
    if not AMOUNT_RE.match(text):
        raise CashError(_("{field} debe ser un importe válido", field=field))
    try:
        amount = Decimal(text)
    except InvalidOperation as error:
        raise CashError(_("{field} debe ser un importe válido", field=field)) from error
    if amount < 0 or amount >= MAX_AMOUNT or amount != amount.quantize(CENT):
        raise CashError(_("{field} debe ser un importe válido", field=field))
    if not allow_zero and amount == 0:
        raise CashError(_("{field} debe ser mayor que cero", field=field))
    return amount.quantize(CENT)


def _text(value, field, limit, required):
    if value is None or value == "":
        if required:
            raise CashError(_("{field} es obligatorio", field=field))
        return None
    if not isinstance(value, str):
        raise CashError(_("{field} debe ser texto", field=field))
    value = " ".join(value.split())
    if required and not value:
        raise CashError(_("{field} es obligatorio", field=field))
    if len(value) > limit:
        raise CashError(_("{field} no puede tener más de {limit} caracteres", field=field, limit=limit))
    return value or None


def _open_session(business):
    return CashSession.query.filter_by(business_id=business.id, status=SESSION_OPEN).first()


# --- Reporte del turno -------------------------------------------------------------


def _unpaid_closed_accounts(session, until):
    """Cuentas que se cerraron durante el turno sin pasar por el cobro."""
    accounts = (
        TableAccount.query
        .options(selectinload(TableAccount.table), selectinload(TableAccount.orders).selectinload(Order.items))
        .filter(
            TableAccount.business_id == session.business_id,
            TableAccount.status == ACCOUNT_CLOSED,
            TableAccount.closed_at >= session.created_at,
            ~db.session.query(Payment.id).filter(Payment.account_id == TableAccount.id).exists(),
        )
        .all()
    )
    # El límite superior se compara aquí: SQLite guarda las fechas sin zona.
    return [account for account in accounts if _aware(account.closed_at) <= until]


def session_report(session):
    """Todo lo del turno: ventas por método, propinas, movimientos y efectivo."""
    until = _aware(session.closed_at) if session.closed_at else utc_now()
    by_method = OrderedDict((method, {"amount": Decimal("0"), "tips": Decimal("0"), "payments": 0}) for method in PAYMENT_METHODS)
    checkouts = OrderedDict()
    for payment in session.payments:
        entry = by_method[payment.method]
        entry["amount"] += payment.amount
        entry["tips"] += payment.tip
        entry["payments"] += 1
        checkout = checkouts.setdefault(payment.checkout_id, {
            "id": str(payment.checkout_id),
            "table_number": payment.table_number,
            "channel": payment.channel,
            "customer_name": payment.customer_name,
            "paid_at": _iso(payment.created_at),
            "amount": Decimal("0"),
            "tip": Decimal("0"),
            "methods": [],
        })
        checkout["amount"] += payment.amount
        checkout["tip"] += payment.tip
        if payment.method not in checkout["methods"]:
            checkout["methods"].append(payment.method)
    accounts = checkouts

    cash_in = sum((m.amount for m in session.movements if m.kind == MOVEMENT_IN), Decimal("0"))
    cash_out = sum((m.amount for m in session.movements if m.kind != MOVEMENT_IN), Decimal("0"))
    cash = by_method[METHOD_CASH]
    expected = session.opening_float + cash["amount"] + cash["tips"] + cash_in - cash_out
    if session.status == SESSION_CLOSED and session.expected_cash is not None:
        expected = session.expected_cash

    cancelled = 0
    unpaid = []
    for account in _unpaid_closed_accounts(session, until):
        total = account_total(account)
        if total == 0:
            cancelled += 1
        else:
            unpaid.append({
                "id": str(account.id),
                "channel": account.channel,
                "table": {"number": account.table.number, "name": account.table.name} if account.table else None,
                "customer_name": account.customer_name,
                "total": _money(total),
                "closed_at": _iso(account.closed_at),
            })

    sales = sum((entry["amount"] for entry in by_method.values()), Decimal("0"))
    tips = sum((entry["tips"] for entry in by_method.values()), Decimal("0"))
    counted = session.counted_cash
    return {
        "id": str(session.id),
        "status": session.status,
        "opened_at": _iso(session.created_at),
        "closed_at": _iso(session.closed_at),
        "opening_float": _money(session.opening_float),
        "by_method": [
            {"method": method, "amount": _money(entry["amount"]), "tips": _money(entry["tips"]), "payments": entry["payments"]}
            for method, entry in by_method.items()
        ],
        "sales_total": _money(sales),
        "tips_total": _money(tips),
        "accounts_paid": len(accounts),
        "average_ticket": _money(sales / len(accounts)) if accounts else _money(0),
        "accounts_cancelled": cancelled,
        # Los más recientes primero, como se leen en la pantalla de Caja.
        "checkouts": [
            {**checkout, "amount": _money(checkout["amount"]), "tip": _money(checkout["tip"])}
            for checkout in reversed(list(checkouts.values()))
        ],
        "accounts_unpaid": unpaid,
        "cash_in": _money(cash_in),
        "cash_out": _money(cash_out),
        "movements": [
            {"id": str(m.id), "kind": m.kind, "amount": _money(m.amount), "reason": m.reason, "created_at": _iso(m.created_at)}
            for m in session.movements
        ],
        "expected_cash": _money(expected),
        "counted_cash": _money(counted) if counted is not None else None,
        "difference": _money(counted - expected) if counted is not None else None,
        "notes": session.notes,
    }


def _session_brief(session):
    return {
        "id": str(session.id),
        "status": session.status,
        "opened_at": _iso(session.created_at),
        "closed_at": _iso(session.closed_at),
        "sales_total": _money(sum((p.amount for p in session.payments), Decimal("0"))),
        "tips_total": _money(sum((p.tip for p in session.payments), Decimal("0"))),
        "expected_cash": _money(session.expected_cash) if session.expected_cash is not None else None,
        "counted_cash": _money(session.counted_cash) if session.counted_cash is not None else None,
        "difference": (
            _money(session.counted_cash - session.expected_cash)
            if session.counted_cash is not None and session.expected_cash is not None else None
        ),
    }


def _loaded_session(session_id):
    return (
        CashSession.query
        .options(selectinload(CashSession.movements), selectinload(CashSession.payments))
        .filter_by(id=session_id)
        .first()
    )


# --- Endpoints ---------------------------------------------------------------------


def _guard(handler, failure_message):
    """Corre `handler` con manejo común de errores de validación y de base."""
    try:
        return handler()
    except CashError as error:
        db.session.rollback()
        return error.payload, error.status
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.exception(error)
        return {"message": failure_message}, 500


def current_cash(owner_id, business_id):
    """El turno abierto con su reporte, o `null` y el último corte."""
    def run():
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        session = _open_session(business)
        last = None
        if not session:
            last_closed = (
                CashSession.query.filter_by(business_id=business.id, status=SESSION_CLOSED)
                .order_by(CashSession.closed_at.desc())
                .first()
            )
            last = _session_brief(last_closed) if last_closed else None
        return {"session": session_report(_loaded_session(session.id)) if session else None, "last_closed": last}, 200

    return _guard(run, _("No fue posible cargar la caja"))


def open_cash(owner_id, business_id, data):
    def run():
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        opening_float = _amount((data or {}).get("opening_float", 0), "opening_float")
        if _open_session(business):
            raise CashError(_("La caja ya está abierta"), 409, code="cash_already_open")
        session = CashSession(business_id=business.id, opening_float=opening_float, status=SESSION_OPEN)
        db.session.add(session)
        try:
            db.session.flush()
        except IntegrityError as conflict:
            raise CashError(_("La caja ya está abierta"), 409, code="cash_already_open") from conflict
        db.session.commit()
        return {"session": session_report(_loaded_session(session.id))}, 201

    return _guard(run, _("No fue posible abrir la caja"))


def add_movement(owner_id, business_id, data):
    def run():
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        data_ = data or {}
        kind = data_.get("kind")
        if kind not in MOVEMENT_KINDS:
            raise CashError(_("El tipo de movimiento no es válido"))
        amount = _amount(data_.get("amount"), "amount", allow_zero=False)
        reason = _text(data_.get("reason"), "reason", MAX_REASON, required=True)
        session = _open_session(business)
        if not session:
            raise CashError(_("Abre la caja antes de registrar movimientos"), 409, code="cash_closed")
        db.session.add(CashMovement(session_id=session.id, kind=kind, amount=amount, reason=reason))
        db.session.commit()
        return {"session": session_report(_loaded_session(session.id))}, 201

    return _guard(run, _("No fue posible registrar el movimiento"))


def close_cash(owner_id, business_id, data):
    """El corte: se guarda lo esperado y lo contado, y el turno se cierra."""
    def run():
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        data_ = data or {}
        counted = _amount(data_.get("counted_cash"), "counted_cash")
        notes = _text(data_.get("notes"), "notes", MAX_NOTES, required=False)
        session = _open_session(business)
        if not session:
            raise CashError(_("La caja ya está cerrada"), 409, code="cash_closed")
        session = _loaded_session(session.id)
        expected = Decimal(session_report(session)["expected_cash"])
        # Sólo cierra si sigue abierta: dos cortes a la vez no se pisan.
        closed = (
            CashSession.query.filter_by(id=session.id, status=SESSION_OPEN)
            .update(
                {
                    CashSession.status: SESSION_CLOSED,
                    CashSession.closed_at: utc_now(),
                    CashSession.expected_cash: expected,
                    CashSession.counted_cash: counted,
                    CashSession.notes: notes,
                },
                synchronize_session=False,
            )
        )
        if closed != 1:
            raise CashError(_("La caja ya está cerrada"), 409, code="cash_closed")
        db.session.commit()
        db.session.expire_all()
        return {"session": session_report(_loaded_session(session.id))}, 200

    return _guard(run, _("No fue posible hacer el corte"))


def list_sessions(owner_id, business_id):
    def run():
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        sessions = (
            CashSession.query
            .options(selectinload(CashSession.payments))
            .filter_by(business_id=business.id)
            .order_by(CashSession.created_at.desc())
            .limit(HISTORY_LIMIT)
            .all()
        )
        return {"sessions": [_session_brief(session) for session in sessions]}, 200

    return _guard(run, _("No fue posible cargar los cortes"))


def get_session(owner_id, business_id, session_id):
    def run():
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        session_uuid = _uuid(session_id)
        session = _loaded_session(session_uuid) if session_uuid else None
        if not session or session.business_id != business.id:
            return {"message": _("Turno de caja no encontrado")}, 404
        return {"session": session_report(session)}, 200

    return _guard(run, _("No fue posible cargar el corte"))


# --- Cobro de una cuenta ----------------------------------------------------------


def _parse_payments(data):
    payments = (data or {}).get("payments")
    if not isinstance(payments, list) or len(payments) > MAX_PAYMENTS:
        raise CashError(_("Los pagos no son válidos"))
    parsed = []
    for entry in payments:
        if not isinstance(entry, dict):
            raise CashError(_("Los pagos no son válidos"))
        method = entry.get("method")
        if method not in PAYMENT_METHODS:
            raise CashError(_("El método de pago no es válido"))
        amount = _amount(entry.get("amount"), "amount")
        tip = _amount(entry.get("tip", 0) or 0, "tip")
        if amount == 0 and tip == 0:
            raise CashError(_("Cada pago debe tener un importe"))
        tendered = None
        if method == METHOD_CASH and entry.get("tendered") not in (None, ""):
            tendered = _amount(entry.get("tendered"), "tendered")
            if tendered < amount + tip:
                raise CashError(_("El efectivo recibido no alcanza para el pago"), code="tendered_short")
        parsed.append({"method": method, "amount": amount, "tip": tip, "tendered": tendered})
    return parsed


def checkout_account(owner_id, business_id, account_id, data):
    """Cobra la cuenta de una mesa con uno o varios métodos y la cierra."""
    def run():
        business, error = _business_access(owner_id, business_id)
        if error:
            return error
        payments = _parse_payments(data)
        account_uuid = _uuid(account_id)
        account = (
            TableAccount.query.filter_by(id=account_uuid, business_id=business.id).first()
            if account_uuid else None
        )
        if not account:
            return {"message": _("Cuenta no encontrada")}, 404
        if account.status != ACCOUNT_OPEN:
            raise CashError(_("La cuenta de esta mesa ya está cerrada"), 409, code="account_closed")
        pending = sum(1 for order in account.orders if order.status == ORDER_PENDING)
        if pending:
            raise CashError(
                _("Acepta o cancela los pedidos pendientes antes de cerrar la cuenta"),
                409, code="pending_orders", pending_orders=pending,
            )
        session = _open_session(business)
        if not session:
            raise CashError(_("Abre la caja antes de cobrar"), 409, code="cash_closed")

        total = account_total(account)
        paid = sum((payment["amount"] for payment in payments), Decimal("0"))
        if paid != total:
            raise CashError(
                _("Los pagos deben sumar el total de la cuenta"),
                code="amount_mismatch", total=_money(total), paid=_money(paid),
            )

        # Sólo cierra si sigue abierta: un doble toque o dos cajeros no
        # cobran dos veces la misma cuenta.
        now = utc_now()
        closed = (
            TableAccount.query.filter_by(id=account.id, status=ACCOUNT_OPEN)
            .update({TableAccount.status: ACCOUNT_CLOSED, TableAccount.closed_at: now}, synchronize_session=False)
        )
        if closed != 1:
            raise CashError(_("La cuenta de esta mesa ya está cerrada"), 409, code="account_closed")
        checkout_id = uuid4()
        for payment in payments:
            db.session.add(Payment(
                business_id=business.id, session_id=session.id, account_id=account.id,
                checkout_id=checkout_id, table_number=account.table.number if account.table else None,
                channel=account.channel, customer_name=account.customer_name, **payment,
            ))
        db.session.flush()
        _touch(business.id, account)
        db.session.commit()
        db.session.expire_all()
        account = db.session.get(TableAccount, account.id)
        return {
            "account": _account_payload_for_business(account),
            "payments": [
                {
                    "method": payment["method"],
                    "amount": _money(payment["amount"]),
                    "tip": _money(payment["tip"]),
                    "tendered": _money(payment["tendered"]) if payment["tendered"] is not None else None,
                    "change": (
                        _money(payment["tendered"] - payment["amount"] - payment["tip"])
                        if payment["tendered"] is not None else None
                    ),
                }
                for payment in payments
            ],
        }, 200

    return _guard(run, _("No fue posible cobrar la cuenta"))
