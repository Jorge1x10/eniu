import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Check, ChefHat, ClipboardList, Pause, Play, ReceiptText, WifiOff, X } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import PlanBadge from "../../auth/components/PlanBadge";
import { usePlan } from "../../auth/hooks/usePlan";
import { useBusiness } from "../../Business/services/useBusiness";
import { formatCurrency, formatDate } from "../../../i18n/formats";
import ConfirmDialog from "../components/ConfirmDialog";
import { useLiveOrders } from "../hooks/useLiveOrders";
import { orderingErrorMessage, useOrderingService } from "../services/orderingService";
import { orderLabel, tableLabel } from "../utils/labels";
import {
  orderSoundReady,
  playNewOrderSound,
  rememberSoundPreference,
  soundPreference,
  unlockOrderSound,
} from "../utils/orderSound";

// Lo que el negocio hace con un pedido en cada estado: un solo botón que lo
// lleva al siguiente. El rótulo nombra el estado al que pasa.
const NEXT_STEP = {
  pending: { status: "received", label: "Aceptar", icon: Check },
  received: { status: "preparing", label: "Preparando", icon: ChefHat },
  preparing: { status: "ready", label: "Listo", icon: Check },
};

const STATUS_STYLE = {
  pending: { label: "Por aceptar", className: "bg-[#FFE05A] text-[#111111]" },
  received: { label: "Recibido", className: "bg-[#F8E8AE] text-[#5E501A]" },
  preparing: { label: "Preparando", className: "bg-[#FDE7C8] text-[#7A4A0F]" },
  ready: { label: "Listo", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", className: "bg-[#EFEFEF] text-[#666666]" },
};

function timeOf(iso) {
  return iso ? formatDate(new Date(iso), { hour: "2-digit", minute: "2-digit" }) : "";
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { selectedBusiness, isLoadingBusinesses } = useBusiness();

  if (isLoadingBusinesses) {
    return <p className="rounded-2xl bg-white p-6 text-[#666666] shadow-sm">{t("Cargando negocio...")}</p>;
  }
  if (!selectedBusiness) {
    return <p className="rounded-2xl bg-white p-6 text-[#666666] shadow-sm">{t("Crea un negocio para recibir pedidos.")}</p>;
  }
  // La clave reinicia la consulta en vivo al cambiar de negocio.
  return <OrdersBoard key={selectedBusiness.id} business={selectedBusiness} />;
}

function OrdersBoard({ business }) {
  const { t } = useTranslation();
  const { limits } = usePlan();
  const { setOrdering, setOrderStatus, cancelItem, closeAccount } = useOrderingService(business.id);
  const [soundOn, setSoundOn] = useState(() => soundPreference() && orderSoundReady());
  const [actionError, setActionError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [isToggling, setIsToggling] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const onNewPending = useCallback(() => {
    if (soundPreference()) playNewOrderSound();
  }, []);
  const { accounts, ordering, loaded, error, refresh } = useLiveOrders(business.id, { onNewPending });

  // El navegador no deja sonar nada hasta que la persona toca la página. Si
  // el sonido estaba activado, se desbloquea con el primer toque.
  useEffect(() => {
    if (!soundPreference() || orderSoundReady()) return undefined;
    async function unlock() {
      if (await unlockOrderSound()) setSoundOn(true);
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const counts = useMemo(() => {
    const orders = accounts.flatMap((account) => account.orders);
    return {
      pending: orders.filter((order) => order.status === "pending").length,
      kitchen: orders.filter((order) => order.status === "received" || order.status === "preparing").length,
      ready: orders.filter((order) => order.status === "ready").length,
    };
  }, [accounts]);

  // Los pedidos por aceptar se ven también desde otra pestaña.
  useEffect(() => {
    const base = `${t("Pedidos")} · Eniu`;
    document.title = counts.pending ? `(${counts.pending}) ${base}` : base;
    return () => { document.title = "Eniu"; };
  }, [counts.pending, t]);

  const sortedAccounts = useMemo(() => [...accounts].sort((a, b) =>
    (b.pending_orders > 0) - (a.pending_orders > 0) || a.opened_at.localeCompare(b.opened_at)
  ), [accounts]);

  async function toggleSound() {
    if (soundOn) {
      rememberSoundPreference(false);
      setSoundOn(false);
      return;
    }
    rememberSoundPreference(true);
    const ready = await unlockOrderSound();
    setSoundOn(ready);
    if (ready) playNewOrderSound();
  }

  async function toggleOrdering() {
    setIsToggling(true);
    setActionError("");
    const response = await setOrdering(!ordering?.enabled);
    setIsToggling(false);
    if (!response.ok) {
      setActionError(orderingErrorMessage(response, t("No pudimos cambiar el estado de los pedidos.")));
      return;
    }
    refresh({ force: true });
  }

  async function advance(order) {
    setBusyOrderId(order.id);
    setActionError("");
    const response = await setOrderStatus(order.id, NEXT_STEP[order.status].status);
    setBusyOrderId(null);
    if (!response.ok) setActionError(orderingErrorMessage(response, t("No pudimos actualizar el pedido.")));
    refresh({ force: true });
  }

  function confirmed() {
    setConfirming(null);
    refresh({ force: true });
  }

  const trialEnds = limits?.orders_free_until;
  const currency = business.currency || "MXN";

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#8A7420]">{business.name}</p>
          <h1 className="mt-1 text-3xl font-bold text-[#111111]">{t("Pedidos")}</h1>
          <p className="mt-1 text-sm text-[#666666]">{t("Los pedidos de las mesas llegan aquí solos. Acepta cada uno para que entre en la cuenta.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#E9DDB7] bg-white px-4 font-semibold hover:bg-[#FFF8DE]"
          >
            {soundOn ? <Bell size={17} aria-hidden="true" /> : <BellOff size={17} aria-hidden="true" />}
            {soundOn ? t("Sonido activado") : t("Activar sonido")}
          </button>
          {ordering && ordering.reason !== "plan" && (
            <button
              type="button"
              onClick={toggleOrdering}
              disabled={isToggling}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                ordering.enabled ? "bg-[#2A2A2A] text-white hover:bg-[#111111]" : "bg-[#FFE05A] text-[#111111] hover:bg-[#E8C93D]"
              }`}
            >
              {ordering.enabled ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
              {ordering.enabled ? t("Pausar pedidos") : t("Activar pedidos")}
            </button>
          )}
        </div>
      </header>

      <OrderingNotice ordering={ordering} trialEnds={trialEnds} />
      {error && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-[#FFF8DE] px-4 py-3 text-sm text-[#5E501A]">
          <WifiOff size={16} aria-hidden="true" /> {t("Sin conexión con el servidor. Reintentando…")}
        </p>
      )}
      {actionError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}

      <dl className="grid grid-cols-3 gap-3">
        <Counter label={t("Por aceptar")} value={counts.pending} highlight={counts.pending > 0} />
        <Counter label={t("En cocina")} value={counts.kitchen} />
        <Counter label={t("Listos")} value={counts.ready} />
      </dl>

      {!loaded ? (
        <div aria-label={t("Cargando pedidos")} className="grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-56 rounded-2xl border border-[#E9DDB7] bg-white" />)}
        </div>
      ) : sortedAccounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D7C990] bg-[#FFFDF5] px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE05A]"><ClipboardList size={26} aria-hidden="true" /></span>
          <h2 className="mt-5 text-xl font-bold">{t("No hay mesas con cuenta abierta")}</h2>
          <p className="mt-2 text-sm text-[#666666]">{t("Cuando un comensal mande su primer pedido, su mesa aparecerá aquí.")}</p>
          <Link to="/dashboard/mesas" className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D]">{t("Ver mesas y QR")}</Link>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              currency={currency}
              busyOrderId={busyOrderId}
              onAdvance={advance}
              onReject={(order) => setConfirming({ kind: "reject", account, order })}
              onCancelItem={(order, item) => setConfirming({ kind: "item", account, order, item })}
              onClose={() => setConfirming({ kind: "close", account })}
            />
          ))}
        </div>
      )}

      {confirming?.kind === "reject" && (
        <ConfirmDialog
          title={t("¿Rechazar el pedido de {{label}}?", { label: orderLabel(confirming.order, confirming.account.table) })}
          description={t("Se cancelan todos sus productos y no entra en la cuenta.")}
          confirmLabel={t("Rechazar pedido")}
          onConfirm={() => setOrderStatus(confirming.order.id, "cancelled")}
          errorMessage={(response) => orderingErrorMessage(response, t("No pudimos actualizar el pedido."))}
          onDone={confirmed}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming?.kind === "item" && (
        <ConfirmDialog
          title={t("¿Cancelar {{quantity}} × {{name}}?", { quantity: confirming.item.quantity, name: confirming.item.name })}
          description={t("Del pedido de {{label}}. Sale de la cuenta y no se puede deshacer.", { label: orderLabel(confirming.order, confirming.account.table) })}
          confirmLabel={t("Cancelar producto")}
          onConfirm={() => cancelItem(confirming.order.id, confirming.item.id)}
          errorMessage={(response) => orderingErrorMessage(response, t("No pudimos cancelar el producto."))}
          onDone={confirmed}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming?.kind === "close" && (
        <ConfirmDialog
          tone="neutral"
          title={t("¿Cerrar la cuenta de {{table}}?", { table: tableLabel(confirming.account.table) })}
          description={t("Total: {{total}}. El siguiente pedido en esta mesa abrirá una cuenta nueva.", { total: formatCurrency(Number(confirming.account.total), currency) })}
          confirmLabel={t("Cerrar cuenta")}
          onConfirm={() => closeAccount(confirming.account.id)}
          errorMessage={(response) => orderingErrorMessage(response, t("No pudimos cerrar la cuenta."))}
          onDone={confirmed}
          onClose={() => setConfirming(null)}
        />
      )}
    </section>
  );
}

function OrderingNotice({ ordering, trialEnds }) {
  const { t } = useTranslation();
  if (!ordering) return null;
  if (ordering.reason === "plan") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E9DDB7] bg-[#FFF8DE] px-4 py-3 text-sm text-[#5E501A]">
        <p>{t("Tu plan actual no incluye pedidos desde la mesa. El menú se sigue viendo, pero nadie puede pedir.")}</p>
        <PlanBadge />
      </div>
    );
  }
  return (
    <>
      {!ordering.enabled && (
        <p role="status" className="rounded-xl border border-[#E9DDB7] bg-[#FFF8DE] px-4 py-3 text-sm text-[#5E501A]">
          {t("Los pedidos están apagados: el menú se ve, pero nadie puede pedir. Actívalos cuando estés listo para atender.")}
        </p>
      )}
      {trialEnds && (
        <p className="text-sm text-[#666666]">
          {t("Los pedidos son gratis hasta el {{date}}.", { date: formatDate(new Date(`${trialEnds}T12:00:00`), { day: "numeric", month: "long", year: "numeric" }) })}
        </p>
      )}
    </>
  );
}

function Counter({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${highlight ? "border-[#E8C93D] bg-[#FFF3B8]" : "border-[#E9DDB7] bg-white"}`}>
      <dt className="text-xs font-semibold text-[#666666]">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-[#111111]">{value}</dd>
    </div>
  );
}

function AccountCard({ account, currency, busyOrderId, onAdvance, onReject, onCancelItem, onClose }) {
  const { t } = useTranslation();
  const hasPending = account.pending_orders > 0;
  return (
    <article className={`flex flex-col rounded-2xl border bg-white shadow-sm ${hasPending ? "border-[#E8C93D]" : "border-[#E9DDB7]"}`}>
      <header className="flex items-start justify-between gap-3 border-b border-[#EFE8D1] p-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-[#111111]">{tableLabel(account.table)}</h2>
          <p className="text-xs text-[#666666]">{t("Abierta a las {{time}}", { time: timeOf(account.opened_at) })}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-[#666666]">{t("Cuenta")}</p>
          <p className="text-lg font-bold text-[#111111]">{formatCurrency(Number(account.total), currency)}</p>
        </div>
      </header>

      <ol className="divide-y divide-[#EFE8D1]">
        {account.orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            table={account.table}
            currency={currency}
            isBusy={busyOrderId === order.id}
            onAdvance={() => onAdvance(order)}
            onReject={() => onReject(order)}
            onCancelItem={(item) => onCancelItem(order, item)}
          />
        ))}
      </ol>

      <footer className="mt-auto border-t border-[#EFE8D1] p-4">
        <button
          type="button"
          onClick={onClose}
          disabled={hasPending}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] px-4 font-semibold text-[#111111] hover:bg-[#2A2A2A] hover:text-white disabled:cursor-not-allowed disabled:border-[#D9D9D9] disabled:text-[#999999] disabled:hover:bg-transparent"
        >
          <ReceiptText size={17} aria-hidden="true" /> {t("Cerrar cuenta")}
        </button>
        {hasPending && <p className="mt-2 text-center text-xs text-[#666666]">{t("Acepta o rechaza los pedidos por aceptar para poder cerrarla.")}</p>}
      </footer>
    </article>
  );
}

function OrderRow({ order, table, currency, isBusy, onAdvance, onReject, onCancelItem }) {
  const { t } = useTranslation();
  const status = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
  const next = NEXT_STEP[order.status];
  const NextIcon = next?.icon;
  const isCancelled = order.status === "cancelled";

  return (
    <li className={`p-4 ${order.status === "pending" ? "bg-[#FFFBEA]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#111111]">{orderLabel(order, table)}</p>
          <p className="text-xs text-[#666666]">{t("Enviado a las {{time}}", { time: timeOf(order.created_at) })}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{t(status.label)}</span>
      </div>

      <ul className="mt-3 space-y-2">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <div className={`min-w-0 flex-1 ${item.is_cancelled ? "text-[#999999] line-through" : "text-[#111111]"}`}>
              <p><span className="font-semibold">{item.quantity} ×</span> {item.name}</p>
              {item.notes && (
                <p className={`mt-1 rounded-lg px-2 py-1 text-xs ${item.is_cancelled ? "" : "bg-[#FFF3B8] text-[#5E501A]"}`}>
                  {t("Nota: {{notes}}", { notes: item.notes })}
                </p>
              )}
            </div>
            <span className={`shrink-0 tabular-nums ${item.is_cancelled ? "text-[#999999] line-through" : "text-[#444444]"}`}>
              {formatCurrency(Number(item.line_total), currency)}
            </span>
            {!item.is_cancelled && !isCancelled && (
              <button
                type="button"
                onClick={() => onCancelItem(item)}
                aria-label={t("Cancelar {{name}}", { name: item.name })}
                title={t("Cancelar {{name}}", { name: item.name })}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#999999] hover:bg-red-50 hover:text-red-700"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {next && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onAdvance}
            disabled={isBusy}
            className="inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFE05A] px-3 text-sm font-semibold text-[#111111] hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {NextIcon && <NextIcon size={16} aria-hidden="true" />} {t(next.label)}
          </button>
          {order.status === "pending" && (
            <button
              type="button"
              onClick={onReject}
              disabled={isBusy}
              className="min-h-10 cursor-pointer rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("Rechazar")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
