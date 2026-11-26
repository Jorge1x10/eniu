import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Banknote, CircleCheck, CircleEllipsis, CreditCard, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import AccessibleModal from "../../Catalogue/components/AccessibleModal";
import { formatCurrency } from "../../../i18n/formats";
import { tableLabel } from "../../Ordering/utils/labels";
import { cashErrorMessage, useCashService } from "../services/cashService";
import { centsToAmount, centsToNumber, parseCents, percentOf } from "../utils/money";

const PAYMENT_METHODS = [
  { key: "cash", label: "Efectivo", icon: Banknote },
  { key: "card", label: "Tarjeta", icon: CreditCard },
  { key: "transfer", label: "Transferencia", icon: ArrowLeftRight },
  { key: "other", label: "Otro", icon: CircleEllipsis },
];
const TIP_PERCENTS = [10, 15, 20];
const MAX_ROWS = 4;

let rowSeed = 0;
function newRow(method = "cash", amount = "") {
  rowSeed += 1;
  return { id: `pago-${rowSeed}`, method, amount, tip: "", tendered: "" };
}

const inputClass = "min-h-11 w-full rounded-xl border border-eniu-warm bg-eniu-surface px-3 text-right text-base font-bold tabular-nums text-eniu-text outline-none focus-visible:ring-2 focus-visible:ring-eniu-text aria-[invalid=true]:border-eniu-danger";

/**
 * Cobrar la cuenta de una mesa: uno o varios métodos, propina por pago y,
 * en efectivo, con cuánto pagan para calcular el cambio. Cobrar cierra la
 * cuenta. Si la caja está cerrada, se abre aquí mismo.
 *
 * El primer pago se llena solo con lo que falte: con un método, basta con
 * elegirlo y cobrar.
 */
export default function CheckoutDialog({ businessId, account, currency, onCloseWithoutPayment, onDone, onClose }) {
  const { t } = useTranslation();
  const { current, openCash, checkout } = useCashService(businessId);
  const money = (cents) => formatCurrency(centsToNumber(cents), currency);
  const totalCents = parseCents(account.total) ?? 0;

  const [cash, setCash] = useState({ loaded: false, session: null, error: "" });
  // A domicilio, el cobro arranca como dijo el cliente que iba a pagar.
  const [rows, setRows] = useState(() => {
    const delivery = account.table?.delivery;
    if (delivery?.pay_with === "card") return [newRow("card")];
    const row = newRow();
    if (delivery?.cash_tendered) row.tendered = delivery.cash_tendered;
    return [row];
  });
  // El primer importe sigue al total hasta que alguien lo escribe a mano.
  const [firstEdited, setFirstEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [confirmUnpaid, setConfirmUnpaid] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("");
  const submitRef = useRef(null);

  const loadCash = useCallback(async () => {
    const response = await current();
    if (response.aborted) return;
    setCash(response.ok
      ? { loaded: true, session: response.data?.session || null, error: "" }
      : { loaded: true, session: null, error: cashErrorMessage(response, t("No pudimos cargar la caja.")) });
  }, [current, t]);

  useEffect(() => {
    const task = window.setTimeout(loadCash, 0);
    return () => window.clearTimeout(task);
  }, [loadCash]);

  const othersCents = rows.slice(1).reduce((sum, row) => sum + (parseCents(row.amount) ?? 0), 0);
  const effectiveRows = useMemo(() => rows.map((row, index) => (
    index === 0 && !firstEdited ? { ...row, amount: centsToAmount(Math.max(totalCents - othersCents, 0)) } : row
  )), [rows, firstEdited, totalCents, othersCents]);

  const parsed = effectiveRows.map((row) => {
    const amount = parseCents(row.amount);
    const tip = parseCents(row.tip);
    const tendered = row.method === "cash" && row.tendered !== "" ? parseCents(row.tendered) : null;
    const change = tendered !== null && amount !== null && tip !== null ? tendered - amount - tip : null;
    return { ...row, cents: amount, tipCents: tip, tenderedCents: tendered, change };
  });
  const paidCents = parsed.reduce((sum, row) => sum + (row.cents ?? 0), 0);
  const tipCents = parsed.reduce((sum, row) => sum + (row.tipCents ?? 0), 0);
  const remaining = totalCents - paidCents;
  const invalid = parsed.some((row) =>
    row.cents === null || row.tipCents === null
    || (row.method === "cash" && row.tendered !== "" && (row.tenderedCents === null || row.change < 0))
    || row.cents + (row.tipCents ?? 0) === 0
  );
  const canCharge = cash.session && !busy && !invalid && remaining === 0;

  function update(id, change) {
    if (rows[0].id === id && "amount" in change) setFirstEdited(true);
    setRows((current) => current.map((row, index) => {
      if (row.id !== id) return row;
      // Al tocar el primer pago se fija su importe actual antes de cambiar
      // otro campo, para que no siga moviéndose solo.
      const base = index === 0 && !firstEdited ? { ...row, amount: effectiveRows[0].amount } : row;
      return { ...base, ...change };
    }));
    setError("");
  }

  function addRow() {
    const used = new Set(rows.map((row) => row.method));
    const method = PAYMENT_METHODS.find((entry) => !used.has(entry.key))?.key || "card";
    if (!firstEdited) {
      // El primero se queda con lo que ya cubría; el nuevo arranca en cero.
      setFirstEdited(true);
      setRows((current) => [{ ...current[0], amount: effectiveRows[0].amount }, ...current.slice(1), newRow(method, "")]);
      return;
    }
    setRows((current) => [...current, newRow(method, remaining > 0 ? centsToAmount(remaining) : "")]);
  }

  function removeRow(id) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleOpenCash(event) {
    event.preventDefault();
    const cents = parseCents(openingFloat);
    if (cents === null) {
      setError(t("Escribe un fondo válido, por ejemplo 500 o 500.50."));
      return;
    }
    setBusy(true);
    setError("");
    const response = await openCash(centsToAmount(cents));
    setBusy(false);
    if (!response.ok && response.data?.code !== "cash_already_open") {
      setError(cashErrorMessage(response, t("No pudimos abrir la caja.")));
      return;
    }
    await loadCash();
    window.setTimeout(() => submitRef.current?.focus(), 0);
  }

  async function charge(event) {
    event.preventDefault();
    if (!canCharge) return;
    setBusy(true);
    setError("");
    const payments = parsed.map((row) => ({
      method: row.method,
      amount: centsToAmount(row.cents),
      tip: centsToAmount(row.tipCents ?? 0),
      ...(row.tenderedCents !== null ? { tendered: centsToAmount(row.tenderedCents) } : {}),
    }));
    const response = await checkout(account.id, payments);
    setBusy(false);
    if (!response.ok) {
      if (response.data?.code === "cash_closed") await loadCash();
      setError(cashErrorMessage(response, t("No pudimos cobrar la cuenta.")));
      return;
    }
    const change = parsed.reduce((sum, row) => sum + Math.max(row.change ?? 0, 0), 0);
    if (change > 0) {
      setResult({ change });
      return;
    }
    onDone();
  }

  async function closeUnpaid() {
    setBusy(true);
    setError("");
    const response = await onCloseWithoutPayment();
    setBusy(false);
    if (!response?.ok) {
      setError(cashErrorMessage(response, t("No pudimos cerrar la cuenta.")));
      return;
    }
    onDone();
  }

  const title = account.table?.delivery
    ? t("Cobrar a {{name}} · a domicilio", { name: account.table.name })
    : account.table?.takeaway
    ? t("Cobrar a {{name}} · para llevar", { name: account.table.name })
    : t("Cobrar {{table}}", { table: tableLabel(account.table) });

  if (result) {
    return (
      <AccessibleModal labelledBy="checkout-title" onClose={onDone} maxWidth="max-w-md" initialFocusRef={submitRef}>
        <div className="text-center text-eniu-text">
          <CircleCheck size={44} aria-hidden="true" className="mx-auto text-eniu-success" />
          <h2 id="checkout-title" className="mt-3 text-xl font-black">{t("Cuenta cobrada")}</h2>
          <p className="mt-5 text-sm font-bold uppercase tracking-[1px] text-eniu-muted">{t("Cambio")}</p>
          <p className="text-[44px] font-black leading-none tracking-[-1.5px] tabular-nums">{money(result.change)}</p>
          <button ref={submitRef} type="button" onClick={onDone} className="mt-6 min-h-12 w-full cursor-pointer rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover">
            {t("Listo")}
          </button>
        </div>
      </AccessibleModal>
    );
  }

  return (
    <AccessibleModal labelledBy="checkout-title" describedBy="checkout-total" onClose={onClose} isBusy={busy} maxWidth="max-w-lg">
      <div className="text-eniu-text">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="checkout-title" className="text-xl font-black">{title}</h2>
            <p id="checkout-total" className="mt-1 text-sm text-eniu-muted">
              {t("Total de la cuenta")} <span className="font-black text-eniu-text tabular-nums">{money(totalCents)}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("Cerrar")} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-eniu-surface-alt disabled:cursor-not-allowed">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-eniu-danger-soft px-4 py-3 text-sm font-semibold text-eniu-danger">{error}</p>}

        {!cash.loaded ? (
          <div aria-hidden="true" className="mt-5 h-40 animate-pulse rounded-2xl bg-eniu-surface-alt" />
        ) : totalCents === 0 ? (
          <div className="mt-5 rounded-2xl bg-eniu-surface-alt p-4">
            <p className="text-sm">{t("Esta cuenta no tiene consumo: todo se canceló. Ciérrala para liberar la mesa.")}</p>
            <button type="button" onClick={closeUnpaid} disabled={busy} className="mt-3 min-h-12 w-full cursor-pointer rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover disabled:opacity-60">
              {t("Cerrar cuenta")}
            </button>
          </div>
        ) : !cash.session ? (
          <form onSubmit={handleOpenCash} className="mt-5 rounded-2xl bg-eniu-surface-alt p-4">
            <p className="font-bold">{t("La caja está cerrada")}</p>
            <p className="mt-1 text-sm text-eniu-muted">{t("Ábrela con el efectivo que hay en el cajón para registrar los cobros del turno.")}</p>
            {cash.error && <p role="alert" className="mt-2 text-sm font-semibold text-eniu-danger">{cash.error}</p>}
            <label htmlFor="checkout-float" className="mt-3 block text-sm font-bold">{t("Fondo inicial")}</label>
            <div className="mt-1 flex gap-2">
              <input id="checkout-float" inputMode="decimal" autoComplete="off" value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} placeholder="0.00" className={inputClass} />
              <button type="submit" disabled={busy} className="min-h-11 shrink-0 cursor-pointer rounded-xl bg-eniu-hero px-4 font-extrabold text-eniu-cream hover:bg-eniu-hero-hover disabled:opacity-60">
                {t("Abrir caja")}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={charge} className="mt-5 space-y-3">
            {parsed.map((row, index) => (
              <PaymentRow
                key={row.id}
                row={row}
                index={index}
                canRemove={rows.length > 1}
                money={money}
                onChange={(change) => update(row.id, change)}
                onRemove={() => removeRow(row.id)}
              />
            ))}

            {rows.length < MAX_ROWS && (
              <button type="button" onClick={addRow} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-extrabold hover:bg-eniu-surface-alt">
                <Plus size={16} aria-hidden="true" /> {t("Pagar una parte con otro método")}
              </button>
            )}

            <dl className="space-y-1 rounded-2xl bg-eniu-surface-alt p-4 text-sm">
              <div className="flex justify-between gap-3"><dt>{t("Cuenta")}</dt><dd className="font-bold tabular-nums">{money(totalCents)}</dd></div>
              {tipCents > 0 && <div className="flex justify-between gap-3"><dt>{t("Propina")}</dt><dd className="font-bold tabular-nums">{money(tipCents)}</dd></div>}
              <div className="flex justify-between gap-3 border-t border-eniu-warm pt-2 text-base"><dt className="font-black">{t("A cobrar")}</dt><dd className="font-black tabular-nums">{money(totalCents + tipCents)}</dd></div>
              <p aria-live="polite" className={`pt-1 text-right font-bold ${remaining === 0 ? "text-eniu-success" : "text-eniu-danger"}`}>
                {remaining === 0
                  ? t("La cuenta está cubierta")
                  : remaining > 0
                    ? t("Faltan {{amount}} por cubrir", { amount: money(remaining) })
                    : t("Los pagos pasan la cuenta por {{amount}}", { amount: money(-remaining) })}
              </p>
            </dl>

            <button ref={submitRef} type="submit" disabled={!canCharge} className="min-h-12 w-full cursor-pointer rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? t("Cobrando...") : t("Cobrar {{amount}} y cerrar", { amount: money(totalCents + tipCents) })}
            </button>
          </form>
        )}

        {cash.loaded && totalCents > 0 && (
          <div className="mt-4 border-t border-eniu-warm pt-3 text-center">
            {confirmUnpaid ? (
              <div role="group" aria-label={t("Cerrar sin cobrar")} className="text-sm">
                <p>{t("La cuenta se cierra sin registrar ningún pago y aparecerá como “sin cobrar” en el corte.")}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <button type="button" onClick={() => setConfirmUnpaid(false)} className="min-h-11 cursor-pointer rounded-xl px-3 font-bold hover:bg-eniu-surface-alt">{t("Volver")}</button>
                  <button type="button" onClick={closeUnpaid} disabled={busy} className="min-h-11 cursor-pointer rounded-xl px-3 font-extrabold text-eniu-danger hover:bg-eniu-danger-soft disabled:opacity-60">{t("Cerrar sin cobrar")}</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmUnpaid(true)} className="min-h-11 cursor-pointer rounded-xl px-3 text-sm font-bold text-eniu-muted underline-offset-2 hover:underline">
                {t("Cerrar sin cobrar")}
              </button>
            )}
          </div>
        )}
      </div>
    </AccessibleModal>
  );
}

function PaymentRow({ row, index, canRemove, money, onChange, onRemove }) {
  const { t } = useTranslation();
  const id = useId();
  const amountInvalid = row.cents === null;
  const tipInvalid = row.tipCents === null;
  const tenderedInvalid = row.method === "cash" && row.tendered !== "" && (row.tenderedCents === null || row.change < 0);
  return (
    <fieldset className="rounded-2xl border border-eniu-warm p-3">
      <legend className="sr-only">{t("Pago {{number}}", { number: index + 1 })}</legend>
      <div role="radiogroup" aria-label={t("Método de pago")} className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={row.method === key}
            onClick={() => onChange({ method: key })}
            className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 px-2 text-sm font-bold ${
              row.method === key ? "border-eniu-text bg-eniu-text text-eniu-bg" : "border-eniu-warm hover:border-eniu-text"
            }`}
          >
            <Icon size={16} aria-hidden="true" /> {t(label)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${id}-amount`} className="text-xs font-bold text-eniu-muted">{t("Importe")}</label>
          <input id={`${id}-amount`} inputMode="decimal" autoComplete="off" value={row.amount} aria-invalid={amountInvalid} onChange={(event) => onChange({ amount: event.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${id}-tip`} className="text-xs font-bold text-eniu-muted">{t("Propina")}</label>
          <input id={`${id}-tip`} inputMode="decimal" autoComplete="off" placeholder="0.00" value={row.tip} aria-invalid={tipInvalid} onChange={(event) => onChange({ tip: event.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {canRemove && (
          <button type="button" onClick={onRemove} className="mr-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-bold text-eniu-muted hover:bg-eniu-surface-alt hover:text-eniu-danger">
            <Trash2 size={14} aria-hidden="true" /> {t("Quitar este pago")}
          </button>
        )}
        <div className="ml-auto flex flex-wrap justify-end gap-1.5" role="group" aria-label={t("Propina sugerida")}>
          {TIP_PERCENTS.map((percent) => {
            const tip = percentOf(row.cents ?? 0, percent);
            const active = row.tipCents === tip && tip > 0;
            return (
              <button
                key={percent}
                type="button"
                aria-pressed={active}
                disabled={!row.cents}
                onClick={() => onChange({ tip: active ? "" : centsToAmount(tip) })}
                className={`min-h-11 min-w-11 cursor-pointer rounded-full border px-3 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-40 ${
                  active ? "border-eniu-text bg-eniu-text text-eniu-bg" : "border-eniu-warm hover:border-eniu-text"
                }`}
              >
                {t("{{percent}} %", { percent })}
              </button>
            );
          })}
        </div>
      </div>

      {row.method === "cash" && (
        <div className="mt-3 grid grid-cols-2 items-end gap-2">
          <div>
            <label htmlFor={`${id}-tendered`} className="text-xs font-bold text-eniu-muted">{t("Paga con")}</label>
            <input id={`${id}-tendered`} inputMode="decimal" autoComplete="off" placeholder={t("Opcional")} value={row.tendered} aria-invalid={tenderedInvalid} aria-describedby={`${id}-change`} onChange={(event) => onChange({ tendered: event.target.value })} className={inputClass} />
          </div>
          <p id={`${id}-change`} aria-live="polite" className={`min-h-11 pb-2 text-right text-sm font-bold ${tenderedInvalid ? "text-eniu-danger" : ""}`}>
            {row.tendered === "" ? "" : tenderedInvalid ? t("No alcanza") : t("Cambio: {{amount}}", { amount: money(row.change) })}
          </p>
        </div>
      )}
    </fieldset>
  );
}
