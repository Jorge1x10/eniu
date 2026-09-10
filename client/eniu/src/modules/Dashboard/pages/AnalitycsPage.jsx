import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CalendarDays, Clock3, MousePointerClick, RefreshCw, Star, Users } from "lucide-react";
import { useParams } from "react-router";
import PlanBadge from "../../auth/components/PlanBadge";
import { usePlan } from "../../auth/hooks/usePlan";
import { useBusiness } from "../../Business/services/useBusiness";
import { useAnalyticsService } from "../services/analyticsService";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";

/** Zona del navegador, para el instante en que el negocio aún no ha cargado. */
function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Hoy, en la zona horaria del negocio.
 *
 * El corte del día lo decide el restaurante, no el navegador de quien mira:
 * "Hoy" para un local de Madrid empieza a medianoche en Madrid, aunque su
 * dueño esté consultándolo desde México. `en-CA` escribe `AAAA-MM-DD`, que
 * es el formato que espera la API.
 */
function todayIn(timezone) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
}
// Mediodía UTC y no medianoche: restar días desde las 00:00 puede caer en un
// cambio de horario de verano y correr la fecha un día.
function presetRange(days, timezone) {
  const to = todayIn(timezone);
  const start = new Date(`${to}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to, timezone };
}
function comparisonText(metric) { if (!metric) return i18n.t("Sin comparación"); if (metric.change_status === "new") return i18n.t("Nuevo respecto al periodo anterior"); if (metric.change_status === "unchanged") return i18n.t("Sin cambios respecto al periodo anterior"); return i18n.t("{{sign}} {{percent}}% respecto al periodo anterior", { sign: metric.change_status === "increased" ? i18n.t("Aumentó") : i18n.t("Disminuyó"), percent: Math.abs(metric.percentage_change) }); }
function MetricCard({ icon: Icon, title, value, detail, help }) { return <article className="rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#666666]">{title}</p><p className="mt-2 text-3xl font-black">{value}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE05A]"><Icon size={20} /></span></div>{detail && <p className="mt-3 text-xs text-[#555555]">{detail}</p>}{help && <p className="mt-2 text-xs text-[#777777]">{help}</p>}</article>; }
function VisitsChart({ points }) {
  const { t } = useTranslation();
 const width = 720; const height = 230; const padding = 34; const max = Math.max(1, ...points.flatMap((point) => [point.views, point.approximate_unique_visitors])); const x = (index) => padding + index * ((width - padding * 2) / Math.max(1, points.length - 1)); const y = (value) => height - padding - (value / max) * (height - padding * 2); const line = (key) => points.map((point, index) => `${x(index)},${y(point[key])}`).join(" "); return <div className="overflow-x-auto"><svg role="img" aria-labelledby="visits-chart-title visits-chart-desc" viewBox={`0 0 ${width} ${height}`} className="min-w-[620px]"><title id="visits-chart-title">{t("Evolución de visitas")}</title><desc id="visits-chart-desc">{t("Comparación diaria de visitas y visitantes únicos aproximados.")}</desc><line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#D9D9D9" /><polyline points={line("views")} fill="none" stroke="#111111" strokeWidth="4" /><polyline points={line("approximate_unique_visitors")} fill="none" stroke="#E8C93D" strokeWidth="4" />{points.map((point, index) => <g key={point.date}><circle cx={x(index)} cy={y(point.views)} r="4" fill="#111111"><title>{t("{{label}}: {{count}} visitas", { label: point.date, count: point.views })}</title></circle><text x={x(index)} y={height - 10} textAnchor="middle" fontSize="10" fill="#666666">{point.date.slice(5)}</text></g>)}</svg><table className="sr-only"><caption>{t("Datos diarios de visitas")}</caption><thead><tr><th>{t("Fecha")}</th><th>{t("Visitas")}</th><th>{t("Visitantes únicos aproximados")}</th></tr></thead><tbody>{points.map((point) => <tr key={point.date}><td>{point.date}</td><td>{point.views}</td><td>{point.approximate_unique_visitors}</td></tr>)}</tbody></table></div>; }

export default function AnalitycsPage() {
  const { t } = useTranslation();

  const { businessId, catalogueId } = useParams(); const getAnalytics = useAnalyticsService(businessId, catalogueId);
  const { limits } = usePlan();
  const { businesses } = useBusiness();
  const businessTimezone = businesses.find((item) => item.id === businessId)?.timezone || null;
  // La zona del negocio llega un render después que la página, así que el
  // periodo no se guarda ya resuelto: se guarda la intención —"los últimos 7
  // días" o unas fechas concretas— y se resuelve al vuelo. Así, en cuanto se
  // sabe cuál es la zona del negocio, el periodo ya está bien sin tener que
  // corregirlo desde un efecto.
  const [period, setPeriod] = useState({ kind: "preset", days: 7 });
  const [chosenTimezone, setChosenTimezone] = useState(null);
  const timezone = chosenTimezone || businessTimezone || browserTimezone();
  const filters = useMemo(
    () => (period.kind === "preset" ? presetRange(period.days, timezone) : { from: period.from, to: period.to, timezone }),
    [period, timezone],
  );
  const [draft, setDraft] = useState(() => presetRange(7, browserTimezone())); const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [dateError, setDateError] = useState(""); const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const load = useCallback(async (signal) => { setLoading(true); setError(""); const response = await getAnalytics(filters, { signal }); if (response.aborted || !mountedRef.current) return; if (!response.ok) { setError(response.status === 403 ? t("No tienes permiso para consultar las analíticas de este menú.") : response.data?.message || t("No pudimos cargar las analíticas. Intenta nuevamente.")); setLoading(false); return; } setData(response.data); setLoading(false); }, [filters, getAnalytics]);
  useEffect(() => { if (!limits.allow_analytics) return undefined; const controller = new AbortController(); const task = window.setTimeout(() => load(controller.signal), 0); return () => { window.clearTimeout(task); controller.abort(); }; }, [limits.allow_analytics, load]);
  const choosePreset = (days) => { setPeriod({ kind: "preset", days }); setDraft(presetRange(days, timezone)); setDateError(""); };
  const applyCustom = () => { if (!draft.from || !draft.to || draft.from > draft.to) { setDateError(t("Selecciona un periodo de fechas válido.")); return; } const days = Math.round((new Date(`${draft.to}T00:00:00`) - new Date(`${draft.from}T00:00:00`)) / 86400000) + 1; if (days > 90) { setDateError(t("El periodo máximo es de 90 días.")); return; } setDateError(""); setPeriod({ kind: "custom", from: draft.from, to: draft.to }); };
  const hasData = Boolean(data?.summary?.menu_views?.value); const summary = data?.summary; const maxCategory = useMemo(() => Math.max(1, ...(data?.top_categories || []).map((item) => item.selections)), [data]);
  if (!limits.allow_analytics) return <AnalyticsLocked />;
  return <section className="mx-auto w-full max-w-7xl space-y-6 pb-8 text-[#111111]"><header><p className="text-sm font-semibold text-[#8A7420]">{t("Rendimiento del menú")}</p><h1 className="mt-1 text-3xl font-black">{t("Analíticas")}</h1><p className="mt-2 text-sm text-[#666666]">{t("Estas métricas representan visitas e interés; no son ventas ni pedidos.")}</p></header>
    <section aria-label={t("Filtros de analíticas")} className="rounded-2xl border border-[#E9DDB7] bg-white p-5"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => choosePreset(1)} className="min-h-11 cursor-pointer rounded-xl border border-[#D9D9D9] px-4 font-semibold">{t("Hoy")}</button><button type="button" onClick={() => choosePreset(7)} className="min-h-11 cursor-pointer rounded-xl border border-[#D9D9D9] px-4 font-semibold">{t("Últimos 7 días")}</button><button type="button" onClick={() => choosePreset(30)} className="min-h-11 cursor-pointer rounded-xl border border-[#D9D9D9] px-4 font-semibold">{t("Últimos 30 días")}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto]"><label className="text-sm font-semibold">{t("Desde")}<input type="date" value={draft.from} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} className="mt-1 block min-h-11 w-full rounded-xl border border-[#D9D9D9] px-3" /></label><label className="text-sm font-semibold">{t("Hasta")}<input type="date" value={draft.to} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} className="mt-1 block min-h-11 w-full rounded-xl border border-[#D9D9D9] px-3" /></label><label className="text-sm font-semibold">{t("Zona horaria")}<select value={timezone} onChange={(event) => setChosenTimezone(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-[#D9D9D9] px-3"><option value={businessTimezone || browserTimezone()}>{t("Hora del negocio ({{zone}})", { zone: businessTimezone || browserTimezone() })}</option><option value="UTC">UTC</option></select></label><button type="button" onClick={applyCustom} className="min-h-11 cursor-pointer self-end rounded-xl bg-[#FFE05A] px-5 font-bold">{t("Aplicar periodo")}</button></div>{dateError && <p role="alert" className="mt-3 text-sm text-red-700">{dateError}</p>}</section>
    {loading && <div aria-live="polite" aria-label={t("Cargando analíticas")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-white" />)}</div>}
    {!loading && error && <div className="rounded-2xl border border-red-200 bg-white p-8 text-center"><p role="alert" className="font-semibold text-red-700">{error}</p><button type="button" onClick={() => load()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 font-semibold text-white"><RefreshCw size={17} /> {t("Reintentar")}</button></div>}
    {!loading && !error && data && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><MetricCard icon={BarChart3} title={t("Visitas al menú")} value={summary.menu_views.value} detail={comparisonText(summary.menu_views)} /><MetricCard icon={Users} title={t("Visitantes únicos aproximados")} value={summary.approximate_unique_visitors.value} detail={comparisonText(summary.approximate_unique_visitors)} help={t("Estimación anónima; no representa personas exactas.")} /><MetricCard icon={MousePointerClick} title={t("Interacciones con productos")} value={summary.product_interactions.value} detail={comparisonText(summary.product_interactions)} /><MetricCard icon={Star} title={t("Producto con mayor interés")} value={summary.top_product?.name || t("Sin datos")} detail={summary.top_product ? t("{{count}} interacciones", { count: summary.top_product.interactions }) : null} /><MetricCard icon={CalendarDays} title={t("Día con más actividad")} value={summary.busiest_day?.date || t("Sin datos")} detail={summary.busiest_day ? t("{{count}} visitas", { count: summary.busiest_day.views }) : null} /><MetricCard icon={Clock3} title={t("Hora con más actividad")} value={summary.busiest_hour?.label || t("Sin datos")} detail={summary.busiest_hour ? t("{{count}} visitas", { count: summary.busiest_hour.views }) : null} /></div>
      {!hasData && <p className="rounded-2xl border border-dashed border-[#E9DDB7] bg-[#FFFDF5] p-8 text-center font-semibold">{t("Todavía no hay suficientes visitas para mostrar analíticas en este periodo.")}</p>}
      <section className="rounded-2xl border border-[#E9DDB7] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{t("Evolución de visitas")}</h2><p className="text-xs text-[#666666]">{t("Negro: visitas · Amarillo: visitantes aproximados")}</p></div><div className="mt-4"><VisitsChart points={data.visits_over_time} /></div></section>
      <div className="grid gap-5 lg:grid-cols-2"><section className="overflow-hidden rounded-2xl border border-[#E9DDB7] bg-white"><h2 className="p-5 text-xl font-bold">{t("Productos con mayor interés")}</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#FFF6D2]"><tr><th className="p-3">{t("Producto")}</th><th className="p-3">{t("Categoría")}</th><th className="p-3">{t("Interacciones")}</th><th className="p-3">{t("Estado")}</th></tr></thead><tbody>{data.top_products.map((item) => <tr key={`${item.name}-${item.category_name}`} className="border-t border-[#EFEFEF]"><td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.category_name}</td><td className="p-3">{item.interactions}</td><td className="p-3">{item.is_available ? "Disponible" : t("No disponible")}</td></tr>)}</tbody></table>{!data.top_products.length && <p className="p-5 text-sm text-[#666666]">{t("Sin interacciones en este periodo.")}</p>}</div></section><section className="rounded-2xl border border-[#E9DDB7] bg-white p-5"><h2 className="text-xl font-bold">{t("Categorías seleccionadas")}</h2><div className="mt-4 space-y-4">{data.top_categories.map((item) => <div key={item.name}><div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{item.name}</span><span>{item.selections} · {item.percentage}%</span></div><div className="mt-1 h-2 rounded-full bg-[#EFEFEF]"><div className="h-full rounded-full bg-[#E8C93D]" style={{ width: `${item.selections * 100 / maxCategory}%` }} /></div></div>)}</div></section></div>
      <div className="grid gap-5 lg:grid-cols-2">{[["devices", t("Dispositivos"), data.devices], ["sources", t("Fuente de acceso"), data.sources]].map(([group, title, items]) => <section key={group} className="rounded-2xl border border-[#E9DDB7] bg-white p-5"><h2 className="text-xl font-bold">{title}</h2><div className="mt-4 space-y-3">{items.map((item) => <div key={item.key} className="flex items-center justify-between gap-3 border-b border-[#EFEFEF] pb-2"><span>{item.label}</span><span className="font-semibold">{item.views} · {item.percentage}%</span></div>)}</div>{group === "sources" && <p className="mt-4 text-xs text-[#666666]">{t("La fuente es una atribución aproximada basada en el enlace de entrada.")}</p>}</section>)}</div></>}
  </section>;
}

function AnalyticsLocked() {
  const { t } = useTranslation();

  return <section className="mx-auto w-full max-w-7xl space-y-6 pb-8 text-[#111111]"><header><p className="text-sm font-semibold text-[#8A7420]">{t("Rendimiento del menú")}</p><h1 className="mt-1 text-3xl font-black">{t("Analíticas")}</h1></header>
    <div className="rounded-2xl border border-dashed border-[#E9DDB7] bg-[#FFFDF5] p-10 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE05A]"><BarChart3 size={24} /></span><h2 className="mt-4 text-xl font-bold">{t("Tu plan actual no incluye analíticas")}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#666666]">{t("Las visitas de tu menú se siguen registrando mientras tanto, así que al activarlas no empiezas de cero: verás también lo que pasó estos días.")}</p><div className="mt-5 flex justify-center"><PlanBadge /></div></div>
  </section>;
}
