import { useState } from "react";
import { ArrowRight, Ban, PackagePlus, Printer } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { formatDate, formatNumber as intlNumber } from "../../../i18n/formats";
import MesaBadge from "../../Ordering/components/MesaBadge";

const formatNumber = (value) => value === null || value === undefined ? "—" : intlNumber(value);

const CARD = "rounded-3xl border border-eniu-warm bg-eniu-surface";

function timeOf(iso) {
  return iso ? formatDate(new Date(iso), { hour: "2-digit", minute: "2-digit" }) : "";
}

export function KpiCard({ title, value, detail, accessory }) {
  return (
    <article className={`${CARD} min-w-0 p-5`}>
      <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{title}</p>
      <p className="mt-2 flex items-baseline gap-1.5 text-[40px] font-black leading-none tracking-[-1.5px] tabular-nums">
        {value}
        {accessory && <span className="text-base font-bold tracking-normal text-eniu-muted">{accessory}</span>}
      </p>
      <p className="mt-2 text-[13px] font-semibold text-eniu-muted">{detail}</p>
    </article>
  );
}

/**
 * "N pedidos por aceptar": la tarjeta negra de Inicio. Muestra los más
 * antiguos primero, con lo necesario para aceptarlos sin ir a Pedidos.
 */
export function PendingOrdersCard({ accounts, ordering, onAccept }) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState(null);
  const pending = accounts
    .flatMap((account) => account.orders
      .filter((order) => order.status === "pending")
      .map((order) => ({ order, table: account.table })))
    .sort((a, b) => a.order.created_at.localeCompare(b.order.created_at));
  const visible = pending.slice(0, 4);

  async function accept(order) {
    setBusyId(order.id);
    try { await onAccept(order); } finally { setBusyId(null); }
  }

  return (
    <section aria-labelledby="pending-orders-title" className="min-w-0 rounded-3xl bg-eniu-hero p-5 text-eniu-cream [flex:2_1_520px] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="pending-orders-title" className="text-xl font-black">
          {pending.length === 1 ? t("1 pedido por aceptar") : t("{{count}} pedidos por aceptar", { count: pending.length })}
        </h2>
        <Link to="/dashboard/pedidos" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-eniu-yellow hover:underline">
          {t("Ir a Pedidos")} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {ordering?.reason === "plan" ? (
        <p className="mt-4 text-[15px] text-eniu-hero-muted">{t("Tu plan actual no incluye pedidos desde la mesa. El menú se sigue viendo, pero nadie puede pedir.")}</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-[15px] text-eniu-hero-muted">{t("Todo al día. Los pedidos nuevos aparecen aquí con un sonido.")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {visible.map(({ order, table }) => {
            const items = order.items.filter((item) => !item.is_cancelled);
            const notes = items.filter((item) => item.notes);
            return (
              <li key={order.id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                <MesaBadge number={table.number} takeaway={table.takeaway} tone="dark" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.8px] text-eniu-hero-muted">{order.diner_name} · {timeOf(order.created_at)}</p>
                  <p className="truncate text-[15px] font-bold">{items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</p>
                  {notes.map((item) => (
                    <p key={item.id} className="mt-1 inline-block rounded-md bg-eniu-note px-2 py-0.5 text-[13px] font-extrabold text-eniu-ink">↳ {item.notes}</p>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => accept(order)}
                  aria-label={table.takeaway ? t("Aceptar el pedido para llevar de {{name}}", { name: order.diner_name }) : t("Aceptar el pedido de {{name}}, mesa {{number}}", { name: order.diner_name, number: table.number })}
                  className="min-h-11 shrink-0 cursor-pointer rounded-xl bg-eniu-yellow px-5 font-extrabold text-eniu-ink hover:bg-eniu-yellow-pressed disabled:opacity-60"
                >
                  {t("Aceptar")}
                </button>
              </li>
            );
          })}
          {pending.length > visible.length && (
            <li className="pt-3 text-sm font-semibold text-eniu-hero-muted">{t("Y {{count}} más en Pedidos.", { count: pending.length - visible.length })}</li>
          )}
        </ul>
      )}
    </section>
  );
}

const TABLE_STATES = {
  pending: { box: "bg-eniu-yellow text-eniu-ink", label: "por aceptar" },
  open: { box: "bg-eniu-text text-eniu-bg", label: "cuenta abierta" },
  free: { box: "bg-eniu-surface-alt text-eniu-text", label: "libre" },
};

/** "Mesas ahora": cada mesa activa con el estado de su cuenta. */
export function TablesNowCard({ tables, accounts }) {
  const { t } = useTranslation();
  const byTable = new Map(accounts.filter((account) => account.table?.id).map((account) => [account.table.id, account]));
  const active = (tables || []).filter((table) => table.is_active).sort((a, b) => a.number - b.number);
  const shown = active.slice(0, 12);

  return (
    <section aria-labelledby="tables-now-title" className={`${CARD} min-w-0 p-5 [flex:1_1_300px] sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="tables-now-title" className="text-xl font-black">{t("Mesas ahora")}</h2>
        <Link to="/dashboard/mesas" className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-bold hover:underline">
          {t("Ver mesas")} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {tables === null ? (
        <div className="mt-4 grid animate-pulse grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-square rounded-xl bg-eniu-surface-alt" />)}</div>
      ) : active.length === 0 ? (
        <p className="mt-4 text-[15px] text-eniu-muted">{t("Crea tus mesas para que cada una tenga su QR y sus pedidos.")}</p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-4 gap-2">
            {shown.map((table) => {
              const account = byTable.get(table.id);
              const state = account?.pending_orders ? "pending" : account ? "open" : "free";
              return (
                <li
                  key={table.id}
                  aria-label={`${t("Mesa {{number}}", { number: table.number })}, ${t(TABLE_STATES[state].label)}`}
                  className={`flex aspect-square items-center justify-center rounded-xl text-lg font-black tabular-nums ${TABLE_STATES[state].box}`}
                >
                  <span aria-hidden="true">{table.number}</span>
                </li>
              );
            })}
          </ul>
          {active.length > shown.length && <p className="mt-2 text-xs font-semibold text-eniu-muted">{t("Y {{count}} más en Mesas.", { count: active.length - shown.length })}</p>}
          <ul aria-hidden="true" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-eniu-muted">
            {[["pending", "Por aceptar"], ["open", "Cuenta abierta"], ["free", "Libre"]].map(([state, label]) => (
              <li key={state} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${TABLE_STATES[state].box}`} />{t(label)}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Barras por día de los últimos 7 días, con el último marcado "Hoy". */
export function MenuViewsCard({ points, total, hasData }) {
  const { t } = useTranslation();
  const max = Math.max(0, ...points.map((point) => Number(point.views || 0)));
  const empty = !hasData || total === 0;
  return (
    <section aria-labelledby="menu-views-title" className={`${CARD} min-w-0 p-5 [flex:2_1_520px] sm:p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="menu-views-title" className="text-xl font-black">{t("Vistas de tu menú")}</h2>
        {!empty && <p className="text-sm font-semibold text-eniu-muted">{t("{{count}} en 7 días", { count: formatNumber(total) })}</p>}
      </div>
      {empty ? (
        <p className="mt-4 text-[15px] text-eniu-muted">{t("Pon el QR en tus mesas para empezar a medir.")}</p>
      ) : (
        <div
          role="img"
          aria-label={t("Gráfica de vistas. Total: {{total}}. {{detail}}", { total, detail: points.map((point) => `${point.date}: ${point.views}`).join(", ") })}
          className="mt-5 flex h-44 items-end gap-2 sm:gap-4"
        >
          {points.map((point, index) => {
            const value = Number(point.views || 0);
            const isToday = index === points.length - 1;
            const height = max > 0 ? Math.max(4, value * 100 / max) : 3;
            return (
              <div key={point.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-bold tabular-nums text-eniu-muted">{value}</span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div className={`w-full max-w-14 rounded-lg ${isToday ? "bg-eniu-yellow" : "bg-eniu-surface-alt"}`} style={{ height: `${height}%`, minHeight: "4px" }} />
                </div>
                <span className={`truncate text-xs capitalize ${isToday ? "font-black" : "font-semibold text-eniu-muted"}`}>{isToday ? t("Hoy") : point.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** "Atajos": lo que más se hace durante el día, a un clic. */
export function ShortcutsCard({ businessId, catalogueId }) {
  const { t } = useTranslation();
  const base = businessId && catalogueId ? `/dashboard/businesses/${businessId}/catalogues/${catalogueId}` : null;
  const shortcuts = [
    { key: "add", label: "Agregar producto", icon: PackagePlus, to: base && `${base}/products` },
    { key: "print", label: "Imprimir QR de mesas", icon: Printer, to: "/dashboard/mesas" },
    // TODO(diseño): no hay filtro "sólo agotados"; abre los productos, donde
    // cada uno tiene su interruptor de disponibilidad.
    { key: "soldout", label: "Marcar agotados", icon: Ban, to: base && `${base}/products` },
  ];
  return (
    <section aria-labelledby="shortcuts-title" className="min-w-0 rounded-3xl bg-eniu-sand p-5 [flex:1_1_300px] sm:p-6">
      <h2 id="shortcuts-title" className="text-xl font-black">{t("Atajos")}</h2>
      <ul className="mt-4 space-y-2">
        {shortcuts.map(({ key, label, icon: Icon, to }) => (
          <li key={key}>
            {to ? (
              <Link to={to} className="flex min-h-14 items-center gap-3 rounded-2xl bg-eniu-surface px-4 font-bold hover:bg-eniu-surface-alt">
                <Icon size={19} aria-hidden="true" />
                <span className="flex-1">{t(label)}</span>
                <ArrowRight size={16} aria-hidden="true" className="text-eniu-muted" />
              </Link>
            ) : (
              <button type="button" disabled title={t("Selecciona o crea un menú para utilizar esta acción.")} className="flex min-h-14 w-full cursor-not-allowed items-center gap-3 rounded-2xl bg-eniu-surface px-4 text-left font-bold opacity-55">
                <Icon size={19} aria-hidden="true" />
                <span className="flex-1">{t(label)}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-label={t("Cargando resumen del dashboard")} aria-live="polite" className="space-y-5">
      <div className="h-20 animate-pulse rounded-3xl bg-eniu-surface" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">{[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl bg-eniu-surface" />)}</div>
      <div className="flex flex-wrap gap-4"><div className="h-72 animate-pulse rounded-3xl bg-eniu-hero [flex:2_1_520px]" /><div className="h-72 animate-pulse rounded-3xl bg-eniu-surface [flex:1_1_300px]" /></div>
    </div>
  );
}
