import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import PlanBadge from "../../auth/components/PlanBadge";
import { formatCurrency, formatDate, formatNumber } from "../../../i18n/formats";
import { orderingErrorMessage, useOrderingService } from "../services/orderingService";
import { lastDays } from "../utils/businessDates";

const PERIODS = [
  { days: 1, label: "Hoy" },
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
];

const CARD = "rounded-3xl border border-eniu-warm bg-eniu-surface";

function hourLabel(hour) {
  return formatDate(new Date(2000, 0, 1, hour), { hour: "numeric" });
}

function Change({ value }) {
  const { t } = useTranslation();
  if (value === null || value === undefined) return <span>{t("Nuevo respecto al periodo anterior")}</span>;
  if (value === 0) return <span>{t("Igual que el periodo anterior")}</span>;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${value > 0 ? "text-eniu-success" : "text-eniu-danger"}`}>
      <Icon size={14} aria-hidden="true" />
      {t("{{percent}}% vs. periodo anterior", { percent: `${value > 0 ? "+" : ""}${formatNumber(value)}` })}
    </span>
  );
}

function Kpi({ title, value, detail }) {
  return (
    <article className={`${CARD} min-w-0 p-5`}>
      <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{title}</p>
      <p className="mt-2 truncate text-[32px] font-black leading-none tracking-[-1px] tabular-nums">{value}</p>
      {detail && <p className="mt-2 text-[13px] font-semibold text-eniu-muted">{detail}</p>}
    </article>
  );
}

/** Barras simples, accesibles: la tabla oculta lleva los mismos datos. */
function Bars({ title, points, highlight, format = (value) => value }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <figure className="min-w-0">
      <div role="img" aria-label={`${title}: ${points.map((point) => `${point.label} ${format(point.value)}`).join(", ")}`} className="flex h-36 items-end gap-[3px]">
        {points.map((point) => (
          <div key={point.key} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${point.label}: ${format(point.value)}`}>
            <div className={`w-full rounded-t ${point.key === highlight ? "bg-eniu-yellow" : point.value ? "bg-eniu-text/70" : "bg-eniu-surface-alt"}`} style={{ height: `${point.value ? Math.max(4, point.value * 100 / max) : 3}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-1.5 flex justify-between text-[11px] font-semibold text-eniu-muted">
        <span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Ventas y lo más pedido, a partir de los pedidos aceptados del negocio (no
 * de las visitas al menú). Es del negocio entero, no de un menú.
 *
 * El plan gratuito ve hasta 7 días; "30 días" se anuncia con el plan.
 */
export default function OrderStatsSection({ businessId, timezone, currency = "MXN", fullAccess }) {
  const { t } = useTranslation();
  const { stats } = useOrderingService(businessId);
  const [days, setDays] = useState(7);
  const [state, setState] = useState({ status: "loading" });
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const load = useCallback(async (signal) => {
    setState({ status: "loading" });
    const response = await stats(lastDays(days, timezone), { signal });
    if (response.aborted || !mountedRef.current) return;
    if (!response.ok) {
      setState({ status: "error", locked: response.data?.code === "plan_limit", message: orderingErrorMessage(response, t("No pudimos cargar las estadísticas.")) });
      return;
    }
    setState({ status: "ready", data: response.data });
  }, [days, stats, timezone, t]);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => load(controller.signal), 0);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [load]);

  const money = (value) => formatCurrency(Number(value), currency);
  const data = state.data;
  const summary = data?.summary;
  const hours = useMemo(() => (data?.by_hour || []).map((entry) => ({ key: entry.hour, label: hourLabel(entry.hour), value: entry.orders })), [data]);
  const daily = useMemo(() => (data?.by_day || []).map((entry) => ({
    key: entry.date,
    label: formatDate(new Date(`${entry.date}T12:00:00`), { day: "numeric", month: "short" }),
    value: Number(entry.revenue),
  })), [data]);
  const maxUnits = Math.max(1, ...(data?.top_products || []).map((product) => product.units));

  return (
    <section aria-labelledby="order-stats-title" className="space-y-4 text-eniu-text">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="order-stats-title" className="text-2xl font-black tracking-[-0.5px]">{t("Ventas y lo más pedido")}</h2>
          <p className="mt-1 text-sm text-eniu-muted">{t("De los pedidos aceptados desde las mesas, sin lo rechazado ni lo quitado.")}</p>
        </div>
        <div role="group" aria-label={t("Periodo")} className="flex rounded-[14px] bg-eniu-surface-alt p-1">
          {PERIODS.map((period) => {
            const locked = !fullAccess && period.days > 7;
            return (
              <button
                key={period.days}
                type="button"
                aria-pressed={days === period.days}
                disabled={locked}
                title={locked ? t("Incluido en Esencial") : undefined}
                onClick={() => setDays(period.days)}
                className={`min-h-11 cursor-pointer rounded-[11px] px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45 ${days === period.days ? "bg-eniu-surface shadow-[0_1px_3px_rgba(17,17,17,0.12)]" : "text-eniu-muted hover:text-eniu-text"}`}
              >
                {t(period.label)}
              </button>
            );
          })}
        </div>
      </div>

      {state.status === "loading" && (
        <div aria-live="polite" aria-label={t("Cargando estadísticas")} className="grid animate-pulse gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 rounded-3xl bg-eniu-surface" />)}
        </div>
      )}

      {state.status === "error" && (
        <div className={`${CARD} p-6 text-center`}>
          <p role="alert" className="font-semibold">{state.message}</p>
          {state.locked ? <div className="mt-4 flex justify-center"><PlanBadge /></div> : (
            <button type="button" onClick={() => load()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-eniu-hero px-4 font-bold text-eniu-cream"><RefreshCw size={16} aria-hidden="true" /> {t("Reintentar")}</button>
          )}
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
            <Kpi title={t("Pedidos")} value={formatNumber(summary.orders)} detail={<Change value={summary.orders_change} />} />
            <Kpi title={t("Ventas")} value={money(summary.revenue)} detail={<Change value={summary.revenue_change} />} />
            <Kpi title={t("Ticket promedio")} value={money(summary.average_order)} detail={t("{{count}} productos vendidos", { count: summary.units })} />
            <Kpi title={t("Hora pico")} value={summary.busiest_hour === null ? "—" : hourLabel(summary.busiest_hour)} detail={summary.busiest_hour === null ? t("Sin pedidos en el periodo") : t("La hora con más pedidos")} />
          </div>

          {!summary.orders ? (
            <p className={`${CARD} border-dashed p-8 text-center font-semibold`}>{t("Aún no hay pedidos aceptados en este periodo. Cuando lleguen, aquí verás lo que más se pide.")}</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              <section aria-labelledby="top-products-title" className={`${CARD} min-w-0 p-5 [flex:1_1_420px]`}>
                <h3 id="top-products-title" className="text-lg font-black">{t("Lo más pedido")}</h3>
                <ol className="mt-3 space-y-3">
                  {data.top_products.map((product, index) => (
                    <li key={`${product.name}-${index}`} className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black tabular-nums ${index === 0 ? "bg-eniu-yellow text-eniu-ink" : "bg-eniu-surface-alt"}`}>{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate font-bold">{product.name}</p>
                          <p className="shrink-0 text-sm font-bold tabular-nums">{t("{{count}} vendidos", { count: product.units })}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          <div aria-hidden="true" className="h-1.5 flex-1 rounded-full bg-eniu-surface-alt">
                            <div className={`h-full rounded-full ${index === 0 ? "bg-eniu-yellow" : "bg-eniu-text/60"}`} style={{ width: `${product.units * 100 / maxUnits}%` }} />
                          </div>
                          <p className="shrink-0 text-xs text-eniu-muted tabular-nums">{money(product.revenue)} · {formatNumber(product.share)}%</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <div className="flex min-w-0 flex-col gap-4 [flex:1_1_320px]">
                <section aria-labelledby="by-hour-title" className={`${CARD} p-5`}>
                  <h3 id="by-hour-title" className="text-lg font-black">{t("Pedidos por hora")}</h3>
                  <div className="mt-3"><Bars title={t("Pedidos por hora")} points={hours} highlight={summary.busiest_hour} /></div>
                </section>
                {days > 1 && (
                  <section aria-labelledby="by-day-title" className={`${CARD} p-5`}>
                    <h3 id="by-day-title" className="text-lg font-black">{t("Ventas por día")}</h3>
                    <div className="mt-3"><Bars title={t("Ventas por día")} points={daily} format={money} /></div>
                  </section>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
