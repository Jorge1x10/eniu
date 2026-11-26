import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import AccessibleModal from "../../Catalogue/components/AccessibleModal";
import { formatCurrency } from "../../../i18n/formats";
import { cashErrorMessage } from "../services/cashService";
import { amountToCents, centsToAmount, centsToNumber, parseCents } from "../utils/money";
import { CashBreakdown, DifferenceText } from "./CashReportView";

/**
 * El corte: se cuenta el efectivo del cajón y se compara con lo esperado.
 * La diferencia se ve mientras se escribe, antes de cerrar.
 */
export default function CloseCashDialog({ report, currency, onCloseCash, onDone, onClose }) {
  const { t } = useTranslation();
  const id = useId();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const countedCents = counted.trim() === "" ? null : parseCents(counted);
  const invalid = counted.trim() !== "" && countedCents === null;
  const difference = countedCents === null ? null : centsToAmount(countedCents - amountToCents(report.expected_cash));

  async function submit(event) {
    event.preventDefault();
    if (countedCents === null) {
      setError(t("Escribe cuánto efectivo contaste en la caja."));
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    const response = await onCloseCash(centsToAmount(countedCents), notes.trim() || null);
    setBusy(false);
    if (!response.ok) {
      setError(cashErrorMessage(response, t("No pudimos hacer el corte.")));
      return;
    }
    onDone(response.data.session);
  }

  return (
    <AccessibleModal labelledBy={`${id}-title`} onClose={onClose} isBusy={busy} maxWidth="max-w-md" initialFocusRef={inputRef}>
      <form onSubmit={submit} className="text-eniu-text" noValidate>
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-title`} className="text-xl font-black">{t("Hacer corte de caja")}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("Cerrar")} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-eniu-surface-alt">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-eniu-surface-alt p-4">
          <CashBreakdown report={report} currency={currency} />
        </div>

        <label htmlFor={`${id}-counted`} className="mt-4 block text-sm font-bold">{t("Efectivo contado")}</label>
        <input
          ref={inputRef}
          id={`${id}-counted`}
          inputMode="decimal"
          autoComplete="off"
          value={counted}
          aria-invalid={invalid}
          aria-describedby={`${id}-difference`}
          onChange={(event) => { setCounted(event.target.value); setError(""); }}
          placeholder="0.00"
          className="mt-1 min-h-12 w-full rounded-xl border border-eniu-warm bg-eniu-surface px-3 text-right text-xl font-black tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-eniu-text aria-[invalid=true]:border-eniu-danger"
        />
        <p id={`${id}-difference`} aria-live="polite" className="mt-1 min-h-6 text-right text-sm font-bold">
          {invalid
            ? <span className="text-eniu-danger">{t("Escribe un importe válido, por ejemplo 1250.50.")}</span>
            : difference !== null && <DifferenceText difference={difference} currency={currency} />}
        </p>

        <label htmlFor={`${id}-notes`} className="mt-2 block text-sm font-bold">{t("Notas")} <span className="font-normal text-eniu-muted">({t("opcional")})</span></label>
        <textarea id={`${id}-notes`} value={notes} maxLength={200} rows={2} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-xl border border-eniu-warm bg-eniu-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-eniu-text" />

        {error && <p role="alert" className="mt-3 rounded-xl bg-eniu-danger-soft px-4 py-3 text-sm font-semibold text-eniu-danger">{error}</p>}

        <p className="mt-3 text-xs text-eniu-muted">
          {t("Al cerrar la caja ya no se puede cobrar hasta abrir otro turno. Esperado: {{amount}}.", { amount: formatCurrency(centsToNumber(amountToCents(report.expected_cash)), currency) })}
        </p>
        <button type="submit" disabled={busy || invalid} className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? t("Cerrando caja...") : t("Cerrar caja")}
        </button>
      </form>
    </AccessibleModal>
  );
}
