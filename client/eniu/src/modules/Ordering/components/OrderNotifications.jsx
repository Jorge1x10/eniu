import { useEffect, useState } from "react";
import { BellRing, Check, CheckCheck, X } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

import { formatDate } from "../../../i18n/formats";
import { useLiveOrdersContext } from "../context/LiveOrdersContext";
import {
  dismissPrompt,
  notificationPermission,
  promptDismissed,
  requestNotificationPermission,
} from "../notifications/browserNotifications";
import { itemsSummary } from "../notifications/orderEvents";
import { orderingErrorMessage, useOrderingService } from "../services/orderingService";
import { orderLabel } from "../utils/labels";
import ConfirmDialog from "./ConfirmDialog";
import MesaBadge from "./MesaBadge";

/** Lo que un aviso "aceptado" dura en pantalla. */
const ACCEPTED_ALERT_MS = 6000;
const MAX_PENDING_SHOWN = 3;

function timeOf(iso) {
  return iso ? formatDate(new Date(iso), { hour: "2-digit", minute: "2-digit" }) : "";
}

const CARD = "pointer-events-auto rounded-2xl bg-eniu-surface p-4 text-eniu-text shadow-[0_12px_32px_rgba(17,17,17,0.18)]";

/** Pedido por aceptar: no tiene botón de cerrar; se va al aceptarlo o rechazarlo. */
function PendingCard({ order, table, onAccept, onReject }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const notes = order.items.filter((item) => item.notes && !item.is_cancelled);
  async function accept() {
    setBusy(true);
    try { await onAccept(); } finally { setBusy(false); }
  }
  return (
    <article aria-label={t("Nuevo pedido de {{label}}", { label: orderLabel(order, table) })} className={`${CARD} border-2 border-eniu-yellow`}>
      <div className="flex items-start gap-3">
        <MesaBadge number={table.number} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{t("Nuevo pedido")}</p>
          <p className="truncate font-extrabold">{order.diner_name} · {timeOf(order.created_at)}</p>
          <p className="mt-0.5 text-sm text-eniu-muted">{itemsSummary(order)}</p>
          {notes.map((item) => (
            <p key={item.id} className="mt-1 inline-block rounded-md bg-eniu-note px-2 py-0.5 text-[13px] font-extrabold text-eniu-ink">↳ {item.notes}</p>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onReject} className="min-h-11 cursor-pointer rounded-xl border-[1.5px] border-eniu-danger/40 px-4 font-extrabold text-eniu-danger hover:bg-eniu-danger-soft">{t("Rechazar")}</button>
        <button type="button" disabled={busy} onClick={accept} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-eniu-yellow font-extrabold text-eniu-ink hover:bg-eniu-yellow-pressed disabled:opacity-60">{t("Aceptar")}</button>
      </div>
    </article>
  );
}

function AcceptedAlert({ alert, onDismiss }) {
  const { t } = useTranslation();
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(alert.id), ACCEPTED_ALERT_MS);
    return () => window.clearTimeout(timer);
  }, [alert.id, onDismiss]);
  return (
    <article role="status" className={`${CARD} flex items-start gap-3 border border-eniu-warm`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-eniu-success/15 text-eniu-success"><Check size={18} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{t("Pedido aceptado · {{table}}", { table: t("Mesa {{number}}", { number: alert.table.number }) })}</p>
        <p className="mt-0.5 truncate text-sm text-eniu-muted">{alert.order.diner_name} · {itemsSummary(alert.order)}</p>
      </div>
      <button type="button" onClick={() => onDismiss(alert.id)} aria-label={t("Cerrar aviso")} className="-m-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-eniu-muted hover:bg-eniu-surface-alt">
        <X size={16} aria-hidden="true" />
      </button>
    </article>
  );
}

/** Listo para llevar: se queda hasta que alguien lo da por visto. */
function ReadyAlert({ alert, onDismiss }) {
  const { t } = useTranslation();
  return (
    <article role="status" className={`${CARD} border-2 border-eniu-success`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-eniu-success text-white"><CheckCheck size={18} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{t("Listo para llevar · {{table}}", { table: t("Mesa {{number}}", { number: alert.table.number }) })}</p>
          <p className="mt-0.5 text-sm text-eniu-muted">{alert.order.diner_name} · {itemsSummary(alert.order)}</p>
        </div>
      </div>
      <button type="button" onClick={() => onDismiss(alert.id)} className="mt-3 min-h-11 w-full cursor-pointer rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover">{t("Entendido")}</button>
    </article>
  );
}

/** Una sola vez: el navegador sólo deja pedir permiso tras un toque. */
function PermissionPrompt({ onDone }) {
  const { t } = useTranslation();
  return (
    <article className={`${CARD} border border-eniu-warm`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-eniu-yellow text-eniu-ink"><BellRing size={18} aria-hidden="true" /></span>
        <div>
          <p className="font-extrabold">{t("Activa los avisos del navegador")}</p>
          <p className="mt-0.5 text-sm text-eniu-muted">{t("Te avisamos de pedidos nuevos y listos aunque estés en otra pestaña.")}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => { dismissPrompt(); onDone(); }} className="min-h-11 cursor-pointer rounded-xl px-4 font-bold hover:bg-eniu-surface-alt">{t("Ahora no")}</button>
        <button type="button" onClick={async () => { await requestNotificationPermission(); dismissPrompt(); onDone(); }} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover">{t("Activar avisos")}</button>
      </div>
    </article>
  );
}

/**
 * Los avisos de pedidos del panel, abajo a la derecha y en todas sus
 * pantallas. En Pedidos no se repiten los pedidos por aceptar: el tablero ya
 * los muestra con sus botones.
 */
export default function OrderNotifications() {
  const { t } = useTranslation();
  const location = useLocation();
  const { accounts, alerts, dismissAlert, businessId, refresh } = useLiveOrdersContext();
  const { setOrderStatus } = useOrderingService(businessId);
  const [rejecting, setRejecting] = useState(null);
  const [error, setError] = useState("");
  const [askPermission, setAskPermission] = useState(() => notificationPermission() === "default" && !promptDismissed());

  const onOrdersPage = location.pathname.startsWith("/dashboard/pedidos");
  const pending = onOrdersPage ? [] : accounts
    .flatMap((account) => account.orders.filter((order) => order.status === "pending").map((order) => ({ order, table: account.table })))
    .sort((a, b) => a.order.created_at.localeCompare(b.order.created_at));
  const shown = pending.slice(0, MAX_PENDING_SHOWN);

  async function accept(order) {
    setError("");
    const response = await setOrderStatus(order.id, "received");
    if (!response.ok) setError(orderingErrorMessage(response, t("No pudimos actualizar el pedido.")));
    await refresh({ force: true });
  }

  if (!alerts.length && !shown.length && !askPermission && !error) return null;

  return (
    <>
      <section
        aria-label={t("Avisos de pedidos")}
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-40 flex max-h-[calc(100dvh-1.5rem)] flex-col gap-3 overflow-y-auto sm:left-auto sm:right-5 sm:bottom-5 sm:w-[380px]"
      >
        {alerts.map((alert) => (alert.kind === "ready"
          ? <ReadyAlert key={alert.id} alert={alert} onDismiss={dismissAlert} />
          : <AcceptedAlert key={alert.id} alert={alert} onDismiss={dismissAlert} />))}
        {error && <p role="alert" className={`${CARD} border border-eniu-danger/40 text-sm font-semibold text-eniu-danger`}>{error}</p>}
        {shown.map(({ order, table }) => (
          <PendingCard key={order.id} order={order} table={table} onAccept={() => accept(order)} onReject={() => setRejecting({ order, table })} />
        ))}
        {pending.length > shown.length && (
          <Link to="/dashboard/pedidos" className={`${CARD} min-h-11 border border-eniu-warm text-center font-bold hover:bg-eniu-surface-alt`}>
            {t("Y {{count}} más por aceptar · Ver pedidos", { count: pending.length - shown.length })}
          </Link>
        )}
        {askPermission && <PermissionPrompt onDone={() => setAskPermission(false)} />}
      </section>

      {rejecting && (
        <ConfirmDialog
          title={t("¿Rechazar el pedido de {{label}}?", { label: orderLabel(rejecting.order, rejecting.table) })}
          description={t("Se cancelan todos sus productos y no entra en la cuenta.")}
          confirmLabel={t("Rechazar pedido")}
          onConfirm={() => setOrderStatus(rejecting.order.id, "cancelled")}
          errorMessage={(response) => orderingErrorMessage(response, t("No pudimos actualizar el pedido."))}
          onDone={() => { setRejecting(null); refresh({ force: true }); }}
          onClose={() => setRejecting(null)}
        />
      )}
    </>
  );
}
