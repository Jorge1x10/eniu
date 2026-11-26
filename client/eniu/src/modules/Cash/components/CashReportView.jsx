import { useTranslation } from "react-i18next";

import { formatCurrency } from "../../../i18n/formats";
import { METHOD_LABELS } from "../printing/cashReport";

/** El efectivo que debería haber: de dónde sale cada peso del esperado. */
export function CashBreakdown({ report, currency }) {
  const { t } = useTranslation();
  const money = (amount) => formatCurrency(Number(amount || 0), currency);
  const cash = report.by_method.find((entry) => entry.method === "cash") || { amount: 0, tips: 0 };
  const lines = [
    [t("Fondo inicial"), report.opening_float, ""],
    [t("Ventas en efectivo"), cash.amount, "+"],
    [t("Propinas en efectivo"), cash.tips, "+"],
    [t("Entradas"), report.cash_in, "+"],
    [t("Retiros"), report.cash_out, "−"],
  ];
  return (
    <dl className="space-y-1 text-sm">
      {lines.map(([label, amount, sign]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-eniu-muted">{sign && <span aria-hidden="true">{sign} </span>}{label}</dt>
          <dd className="font-bold tabular-nums">{money(amount)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-eniu-warm pt-2 text-base">
        <dt className="font-black">{t("Esperado en caja")}</dt>
        <dd className="font-black tabular-nums">{money(report.expected_cash)}</dd>
      </div>
    </dl>
  );
}

/** Sobrante, faltante o "cuadra", con su color. */
export function DifferenceText({ difference, currency, className = "" }) {
  const { t } = useTranslation();
  if (difference === null || difference === undefined) return null;
  const value = Number(difference);
  const amount = formatCurrency(Math.abs(value), currency);
  if (value === 0) return <span className={`text-eniu-success ${className}`}>{t("Cuadra")}</span>;
  return value > 0
    ? <span className={`text-eniu-text ${className}`}>{t("Sobran {{amount}}", { amount })}</span>
    : <span className={`text-eniu-danger ${className}`}>{t("Faltan {{amount}}", { amount })}</span>;
}

/** Ventas y propinas por método de pago, sólo los que se usaron. */
export function MethodsTable({ report, currency }) {
  const { t } = useTranslation();
  const money = (amount) => formatCurrency(Number(amount || 0), currency);
  const used = report.by_method.filter((entry) => entry.payments > 0);
  if (!used.length) return <p className="text-sm text-eniu-muted">{t("Todavía no hay cobros en este turno.")}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-[1px] text-eniu-muted">
          <th scope="col" className="pb-2 font-extrabold">{t("Método")}</th>
          <th scope="col" className="pb-2 text-right font-extrabold">{t("Vendido")}</th>
          <th scope="col" className="pb-2 text-right font-extrabold">{t("Propinas")}</th>
        </tr>
      </thead>
      <tbody>
        {used.map((entry) => (
          <tr key={entry.method} className="border-t border-eniu-warm">
            <th scope="row" className="py-2 text-left font-bold">
              {t(METHOD_LABELS[entry.method])}
              <span className="block text-xs font-semibold text-eniu-muted">{entry.payments === 1 ? t("1 pago") : t("{{count}} pagos", { count: entry.payments })}</span>
            </th>
            <td className="py-2 text-right font-bold tabular-nums">{money(entry.amount)}</td>
            <td className="py-2 text-right tabular-nums">{money(entry.tips)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** El corte completo, para verlo en pantalla antes de imprimirlo. */
export default function CashReportView({ report, currency }) {
  const { t } = useTranslation();
  const money = (amount) => formatCurrency(Number(amount || 0), currency);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Figure label={t("Total vendido")} value={money(report.sales_total)} detail={report.accounts_paid === 1 ? t("1 cuenta cobrada") : t("{{count}} cuentas cobradas", { count: report.accounts_paid })} />
        <Figure label={t("Propinas")} value={money(report.tips_total)} />
      </div>
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{t("Por método de pago")}</h3>
        <MethodsTable report={report} currency={currency} />
      </section>
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{t("Efectivo")}</h3>
        <CashBreakdown report={report} currency={currency} />
        {report.counted_cash !== null && (
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="font-black">{t("Contado")}</dt><dd className="font-black tabular-nums">{money(report.counted_cash)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="font-black">{t("Diferencia")}</dt><dd className="font-black"><DifferenceText difference={report.difference} currency={currency} /></dd></div>
          </dl>
        )}
      </section>
      {(report.accounts_unpaid.length > 0 || report.accounts_cancelled > 0) && (
        <p className="rounded-xl bg-eniu-surface-alt p-3 text-sm">
          {[
            report.accounts_unpaid.length > 0 && (report.accounts_unpaid.length === 1 ? t("1 cuenta cerrada sin cobrar") : t("{{count}} cuentas cerradas sin cobrar", { count: report.accounts_unpaid.length })),
            report.accounts_cancelled > 0 && (report.accounts_cancelled === 1 ? t("1 cuenta cancelada") : t("{{count}} cuentas canceladas", { count: report.accounts_cancelled })),
          ].filter(Boolean).join(" · ")}
        </p>
      )}
      {report.notes && <p className="rounded-xl bg-eniu-surface-alt p-3 text-sm"><span className="font-bold">{t("Notas")}:</span> {report.notes}</p>}
    </div>
  );
}

function Figure({ label, value, detail }) {
  return (
    <div className="rounded-2xl bg-eniu-surface-alt p-3">
      <p className="text-xs font-extrabold uppercase tracking-[1px] text-eniu-muted">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      {detail && <p className="text-xs text-eniu-muted">{detail}</p>}
    </div>
  );
}
