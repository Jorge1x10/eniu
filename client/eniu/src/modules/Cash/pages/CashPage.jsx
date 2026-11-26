import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Printer, RefreshCw, Wallet, X } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import AccessibleModal from "../../Catalogue/components/AccessibleModal";
import { useBusiness } from "../../Business/services/useBusiness";
import { useLiveOrdersContext } from "../../Ordering/context/LiveOrdersContext";
import { formatCurrency, formatDate } from "../../../i18n/formats";
import CashReportView, { DifferenceText, MethodsTable } from "../components/CashReportView";
import CloseCashDialog from "../components/CloseCashDialog";
import { METHOD_LABELS, printCashReport } from "../printing/cashReport";
import { cashErrorMessage, useCashService } from "../services/cashService";
import { centsToAmount, parseCents } from "../utils/money";

const time = (iso) => (iso ? formatDate(new Date(iso), { hour: "2-digit", minute: "2-digit" }) : "");
const dayAndTime = (iso) => (iso ? formatDate(new Date(iso), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

const fieldClass = "min-h-11 w-full rounded-xl border border-eniu-warm bg-eniu-surface px-3 text-base text-eniu-text outline-none focus-visible:ring-2 focus-visible:ring-eniu-text aria-[invalid=true]:border-eniu-danger";

export default function CashPage() {
  const { t } = useTranslation();
  const { selectedBusiness, isLoadingBusinesses } = useBusiness();
  if (isLoadingBusinesses) {
    return <p className="rounded-2xl bg-eniu-surface p-6 text-eniu-muted">{t("Cargando negocio...")}</p>;
  }
  if (!selectedBusiness) {
    return <p className="rounded-2xl bg-eniu-surface p-6 text-eniu-muted">{t("Crea un negocio para usar la caja.")}</p>;
  }
  return <CashBoard key={selectedBusiness.id} business={selectedBusiness} />;
}

/**
 * La caja del turno: abrirla con fondo, ver lo cobrado por método y las
 * propinas, registrar entradas y retiros de efectivo y hacer el corte. Los
 * cobros se hacen desde Pedidos ("Cobrar").
 */
function CashBoard({ business }) {
  const { t } = useTranslation();
  const currency = business.currency || "MXN";
  const money = (amount) => formatCurrency(Number(amount || 0), currency);
  const { current, openCash, addMovement, closeCash, sessions, session: loadSession } = useCashService(business.id);
  // Cada cobro cambia la consulta en vivo de pedidos (la cuenta se cierra):
  // es la señal para volver a pedir el resumen de la caja.
  const { accounts } = useLiveOrdersContext();
  const [state, setState] = useState({ loaded: false, error: "", session: null, lastClosed: null });
  const [history, setHistory] = useState([]);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    const [now, past] = await Promise.all([current(), sessions()]);
    if (!mountedRef.current) return;
    if (!now.ok) {
      setState((previous) => ({ ...previous, loaded: true, error: cashErrorMessage(now, t("No pudimos cargar la caja.")) }));
      return;
    }
    setState({ loaded: true, error: "", session: now.data.session, lastClosed: now.data.last_closed });
    if (past.ok) setHistory((past.data.sessions || []).filter((entry) => entry.status === "closed"));
  }, [current, sessions, t]);

  useEffect(() => {
    const task = window.setTimeout(load, 0);
    return () => window.clearTimeout(task);
  }, [load, accounts]);

  async function showReport(sessionId) {
    const response = await loadSession(sessionId);
    if (response.ok) setReport(response.data.session);
  }

  const print = (data) => printCashReport({ report: data, businessName: business.name, currency });

  if (!state.loaded) {
    return <div aria-hidden="true" className="mx-auto h-72 w-full max-w-[1200px] animate-pulse rounded-3xl bg-eniu-surface" />;
  }

  const open = state.session;

  return (
    <section className="mx-auto w-full max-w-[1200px] min-w-0 space-y-5 text-eniu-text">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{t("Servicio")}</p>
          <h1 className="mt-1 text-[34px] font-black leading-tight tracking-[-1.2px]">{t("Caja")}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${open ? "bg-eniu-success" : "bg-eniu-muted"}`} />
            {open ? t("Abierta desde las {{time}}", { time: time(open.opened_at) }) : t("Cerrada")}
          </p>
        </div>
        {open && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => print(open)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-eniu-warm px-4 font-bold hover:bg-eniu-surface-alt">
              <Printer size={17} aria-hidden="true" /> {t("Imprimir resumen")}
            </button>
            <button type="button" onClick={() => setClosing(true)} className="min-h-11 cursor-pointer rounded-xl bg-eniu-hero px-5 font-extrabold text-eniu-cream hover:bg-eniu-hero-hover">
              {t("Hacer corte")}
            </button>
          </div>
        )}
      </header>

      {state.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-eniu-danger-soft px-4 py-3 text-sm font-semibold text-eniu-danger">
          {state.error}
          <button type="button" onClick={load} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 font-bold"><RefreshCw size={16} aria-hidden="true" /> {t("Reintentar")}</button>
        </div>
      )}

      {open ? (
        <OpenShift report={open} currency={currency} money={money} onMovement={async (movement) => {
          const response = await addMovement(movement);
          if (response.ok) setState((previous) => ({ ...previous, session: response.data.session }));
          return response;
        }} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <OpenCashCard onOpen={async (amount) => {
            const response = await openCash(amount);
            if (response.ok || response.data?.code === "cash_already_open") await load();
            return response;
          }} />
          {state.lastClosed && (
            <article className="rounded-3xl border border-eniu-warm bg-eniu-surface p-5">
              <h2 className="text-lg font-black">{t("Último corte")}</h2>
              <p className="text-sm text-eniu-muted">{dayAndTime(state.lastClosed.closed_at)}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-eniu-muted">{t("Total vendido")}</dt><dd className="text-xl font-black tabular-nums">{money(state.lastClosed.sales_total)}</dd></div>
                <div><dt className="text-eniu-muted">{t("Diferencia")}</dt><dd className="text-xl font-black"><DifferenceText difference={state.lastClosed.difference} currency={currency} /></dd></div>
              </dl>
              <button type="button" onClick={() => showReport(state.lastClosed.id)} className="mt-4 min-h-11 cursor-pointer rounded-xl border border-eniu-warm px-4 font-bold hover:bg-eniu-surface-alt">{t("Ver corte")}</button>
            </article>
          )}
        </div>
      )}

      {history.length > 0 && (
        <section aria-labelledby="cash-history" className="rounded-3xl border border-eniu-warm bg-eniu-surface p-5">
          <h2 id="cash-history" className="text-lg font-black">{t("Cortes anteriores")}</h2>
          <ul className="mt-3 divide-y divide-eniu-warm">
            {history.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => showReport(entry.id)} className="flex min-h-14 w-full cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl px-2 py-2 text-left hover:bg-eniu-surface-alt">
                  <span className="font-bold">{dayAndTime(entry.closed_at)}</span>
                  <span className="flex items-center gap-4 text-sm">
                    <span className="tabular-nums">{money(entry.sales_total)}</span>
                    <DifferenceText difference={entry.difference} currency={currency} className="font-bold" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {closing && open && (
        <CloseCashDialog
          report={open}
          currency={currency}
          onCloseCash={closeCash}
          onClose={() => setClosing(false)}
          onDone={(closed) => { setClosing(false); setReport(closed); load(); }}
        />
      )}
      {report && (
        <ReportDialog report={report} currency={currency} onPrint={() => print(report)} onClose={() => setReport(null)} />
      )}
    </section>
  );
}

function OpenShift({ report, currency, money, onMovement }) {
  const { t } = useTranslation();
  return (
    <>
      <dl className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <Kpi label={t("Vendido en el turno")} value={money(report.sales_total)} detail={report.accounts_paid === 1 ? t("1 cuenta cobrada") : t("{{count}} cuentas cobradas", { count: report.accounts_paid })} />
        <Kpi label={t("Propinas")} value={money(report.tips_total)} />
        <Kpi label={t("Efectivo en caja")} value={money(report.expected_cash)} detail={t("Fondo de {{amount}}", { amount: money(report.opening_float) })} dark />
        <Kpi label={t("Ticket promedio")} value={money(report.average_ticket)} />
      </dl>

      {report.accounts_unpaid.length > 0 && (
        <p className="rounded-2xl bg-eniu-sand px-4 py-3 text-sm font-semibold">
          {t("Se cerraron cuentas sin cobrar en este turno: {{tables}}.", {
            tables: report.accounts_unpaid.map((entry) => `${entry.table ? t("Mesa {{number}}", { number: entry.table.number }) : t("Para llevar · {{name}}", { name: entry.customer_name || "" })} (${money(entry.total)})`).join(", "),
          })}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-eniu-warm bg-eniu-surface p-5">
          <h2 className="mb-3 text-lg font-black">{t("Por método de pago")}</h2>
          <MethodsTable report={report} currency={currency} />
        </article>
        <Movements report={report} money={money} onMovement={onMovement} />
      </div>

      <article className="rounded-3xl border border-eniu-warm bg-eniu-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-black">{t("Cobros del turno")}</h2>
          <Link to="/dashboard/pedidos" className="text-sm font-bold underline-offset-2 hover:underline">{t("Cobrar en Pedidos")}</Link>
        </div>
        {report.checkouts.length ? (
          <ul className="mt-3 divide-y divide-eniu-warm">
            {report.checkouts.map((checkout) => (
              <li key={checkout.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-bold">{checkout.channel === "takeaway"
                    ? t("Para llevar · {{name}}", { name: checkout.customer_name || "" })
                    : checkout.table_number ? t("Mesa {{number}}", { number: checkout.table_number }) : t("Mesa borrada")}</span>
                  <span className="text-eniu-muted"> · {time(checkout.paid_at)} · {checkout.methods.map((method) => t(METHOD_LABELS[method])).join(" + ")}</span>
                </span>
                <span className="tabular-nums">
                  <span className="font-black">{money(checkout.amount)}</span>
                  {Number(checkout.tip) > 0 && <span className="text-eniu-muted"> + {t("{{amount}} de propina", { amount: money(checkout.tip) })}</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-eniu-muted">{t("Los cobros que hagas desde Pedidos aparecerán aquí.")}</p>
        )}
      </article>
    </>
  );
}

function Kpi({ label, value, detail, dark = false }) {
  return (
    <div className={`min-w-0 rounded-3xl p-4 ${dark ? "bg-eniu-hero text-eniu-cream" : "border border-eniu-warm bg-eniu-surface"}`}>
      <dt className={`text-xs font-extrabold uppercase tracking-[1px] ${dark ? "text-eniu-hero-muted" : "text-eniu-muted"}`}>{label}</dt>
      <dd className="mt-1 text-[28px] font-black leading-tight tracking-[-0.8px] tabular-nums">{value}</dd>
      {detail && <dd className={`text-xs ${dark ? "text-eniu-hero-muted" : "text-eniu-muted"}`}>{detail}</dd>}
    </div>
  );
}

function OpenCashCard({ onOpen }) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    const cents = parseCents(value);
    if (cents === null) {
      setError(t("Escribe un fondo válido, por ejemplo 500 o 500.50."));
      return;
    }
    setBusy(true);
    setError("");
    const response = await onOpen(centsToAmount(cents));
    setBusy(false);
    if (!response.ok && response.data?.code !== "cash_already_open") setError(cashErrorMessage(response, t("No pudimos abrir la caja.")));
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-eniu-hero p-5 text-eniu-cream" noValidate>
      <Wallet size={28} aria-hidden="true" className="text-eniu-yellow" />
      <h2 className="mt-3 text-xl font-black">{t("Abrir caja")}</h2>
      <p className="mt-1 text-sm text-eniu-hero-muted">{t("Cuenta el efectivo con el que empiezas el turno. Los cobros de Pedidos se suman a esta caja hasta el corte.")}</p>
      <label htmlFor={`${id}-float`} className="mt-4 block text-sm font-bold">{t("Fondo inicial")}</label>
      <div className="mt-1 flex gap-2">
        <input id={`${id}-float`} inputMode="decimal" autoComplete="off" placeholder="0.00" value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => { setValue(event.target.value); setError(""); }} className="min-h-12 w-full rounded-xl border border-eniu-ink-soft bg-eniu-ink-soft px-3 text-right text-lg font-black tabular-nums text-eniu-cream outline-none focus-visible:ring-2 focus-visible:ring-eniu-yellow" />
        <button type="submit" disabled={busy} className="min-h-12 shrink-0 cursor-pointer rounded-xl bg-eniu-yellow px-5 font-extrabold text-eniu-ink hover:bg-eniu-yellow-pressed disabled:opacity-60">
          {busy ? t("Abriendo...") : t("Abrir caja")}
        </button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm font-semibold text-eniu-yellow">{error}</p>}
    </form>
  );
}

function Movements({ report, money, onMovement }) {
  const { t } = useTranslation();
  const id = useId();
  const [kind, setKind] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const amountRef = useRef(null);

  function start(next) {
    setKind(next);
    setAmount("");
    setReason("");
    setError("");
    window.setTimeout(() => amountRef.current?.focus(), 0);
  }

  async function submit(event) {
    event.preventDefault();
    const cents = parseCents(amount);
    if (!cents) {
      setError(t("Escribe un importe mayor que cero."));
      return;
    }
    if (!reason.trim()) {
      setError(t("Escribe el motivo, por ejemplo “Cambio del banco” o “Pago al proveedor”."));
      return;
    }
    setBusy(true);
    setError("");
    const response = await onMovement({ kind, amount: centsToAmount(cents), reason: reason.trim() });
    setBusy(false);
    if (!response.ok) {
      setError(cashErrorMessage(response, t("No pudimos registrar el movimiento.")));
      return;
    }
    setKind(null);
  }

  return (
    <article className="rounded-3xl border border-eniu-warm bg-eniu-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black">{t("Entradas y retiros")}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => start("in")} aria-pressed={kind === "in"} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-eniu-warm px-3 text-sm font-bold hover:bg-eniu-surface-alt aria-pressed:border-eniu-text">
            <ArrowDownLeft size={16} aria-hidden="true" /> {t("Entrada")}
          </button>
          <button type="button" onClick={() => start("out")} aria-pressed={kind === "out"} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-eniu-warm px-3 text-sm font-bold hover:bg-eniu-surface-alt aria-pressed:border-eniu-text">
            <ArrowUpRight size={16} aria-hidden="true" /> {t("Retiro")}
          </button>
        </div>
      </div>

      {kind && (
        <form onSubmit={submit} className="mt-3 rounded-2xl bg-eniu-surface-alt p-3" noValidate>
          <p className="text-sm font-bold">{kind === "in" ? t("Entra efectivo a la caja") : t("Sale efectivo de la caja")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr]">
            <div>
              <label htmlFor={`${id}-amount`} className="text-xs font-bold text-eniu-muted">{t("Importe")}</label>
              <input ref={amountRef} id={`${id}-amount`} inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} className={`${fieldClass} text-right font-bold tabular-nums`} />
            </div>
            <div>
              <label htmlFor={`${id}-reason`} className="text-xs font-bold text-eniu-muted">{t("Motivo")}</label>
              <input id={`${id}-reason`} maxLength={120} value={reason} onChange={(event) => setReason(event.target.value)} className={fieldClass} />
            </div>
          </div>
          {error && <p role="alert" className="mt-2 text-sm font-semibold text-eniu-danger">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setKind(null)} className="min-h-11 cursor-pointer rounded-xl px-3 font-bold hover:bg-eniu-surface">{t("Cancelar")}</button>
            <button type="submit" disabled={busy} className="min-h-11 cursor-pointer rounded-xl bg-eniu-hero px-4 font-extrabold text-eniu-cream hover:bg-eniu-hero-hover disabled:opacity-60">
              {kind === "in" ? t("Registrar entrada") : t("Registrar retiro")}
            </button>
          </div>
        </form>
      )}

      {report.movements.length ? (
        <ul className="mt-3 divide-y divide-eniu-warm">
          {report.movements.map((movement) => (
            <li key={movement.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="font-bold">{movement.reason}</span>
                <span className="text-eniu-muted"> · {time(movement.created_at)}</span>
              </span>
              <span className={`shrink-0 font-black tabular-nums ${movement.kind === "in" ? "text-eniu-success" : "text-eniu-danger"}`}>
                {movement.kind === "in" ? "+" : "−"}{money(movement.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        !kind && <p className="mt-2 text-sm text-eniu-muted">{t("Registra aquí el efectivo que entra o sale sin ser una venta: cambio, compras, pagos.")}</p>
      )}
    </article>
  );
}

function ReportDialog({ report, currency, onPrint, onClose }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <AccessibleModal labelledBy={`${id}-title`} onClose={onClose} maxWidth="max-w-lg">
      <div className="text-eniu-text">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-black">{t("Corte de caja")}</h2>
            <p className="text-sm text-eniu-muted">{dayAndTime(report.opened_at)} – {report.closed_at ? dayAndTime(report.closed_at) : t("abierta")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Cerrar")} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-eniu-surface-alt">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4"><CashReportView report={report} currency={currency} /></div>
        <button type="button" onClick={onPrint} className="mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover">
          <Printer size={18} aria-hidden="true" /> {t("Imprimir corte")}
        </button>
      </div>
    </AccessibleModal>
  );
}
