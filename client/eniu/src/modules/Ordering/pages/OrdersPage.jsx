import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, ClipboardList, WifiOff } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import PlanBadge from "../../auth/components/PlanBadge";
import { usePlan } from "../../auth/hooks/usePlan";
import { useBusiness } from "../../Business/services/useBusiness";
import { formatCurrency, formatDate } from "../../../i18n/formats";
import ConfirmDialog from "../components/ConfirmDialog";
import MesaBadge from "../components/MesaBadge";
import OrderTicket from "../components/OrderTicket";
import OrderingSwitch from "../components/OrderingSwitch";
import { useLiveOrdersContext } from "../context/LiveOrdersContext";
import { orderingErrorMessage, useOrderingService } from "../services/orderingService";
import { orderLabel, tableLabel } from "../utils/labels";
import {
  orderSoundReady,
  playNewOrderSound,
  rememberSoundPreference,
  soundPreference,
  unlockOrderSound,
} from "../utils/orderSound";

const VIEW_KEY = "eniu.orders.view";

const STATUS_COLUMNS = [
  { key: "pending", title: "Por aceptar", statuses: ["pending"] },
  { key: "kitchen", title: "En cocina", statuses: ["received", "preparing"] },
  { key: "ready", title: "Listos", statuses: ["ready"] },
];

function storedView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "status" ? "status" : "table";
  } catch {
    return "table";
  }
}

function rememberView(view) {
  try { localStorage.setItem(VIEW_KEY, view); } catch { /* sin almacenamiento: sólo no se recuerda */ }
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { selectedBusiness, isLoadingBusinesses } = useBusiness();

  if (isLoadingBusinesses) {
    return <p className="rounded-2xl bg-eniu-surface p-6 text-eniu-muted">{t("Cargando negocio...")}</p>;
  }
  if (!selectedBusiness) {
    return <p className="rounded-2xl bg-eniu-surface p-6 text-eniu-muted">{t("Crea un negocio para recibir pedidos.")}</p>;
  }
  return <OrdersBoard key={selectedBusiness.id} business={selectedBusiness} />;
}

function OrdersBoard({ business }) {
  const { t } = useTranslation();
  const { limits } = usePlan();
  const { setOrdering, setOrderStatus, cancelItem, closeAccount } = useOrderingService(business.id);
  // La consulta en vivo (y el sonido de pedido nuevo) vive en el panel: así
  // el contador de la barra lateral y esta pantalla nunca se contradicen.
  const { accounts, ordering, loaded, error, refresh } = useLiveOrdersContext();
  const [soundOn, setSoundOn] = useState(() => soundPreference() && orderSoundReady());
  const [view, setView] = useState(storedView);
  const [actionError, setActionError] = useState("");
  const [isToggling, setIsToggling] = useState(false);
  const [confirming, setConfirming] = useState(null);

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

  // Las mesas con pedidos por aceptar van primero; después, la más antigua.
  const sortedAccounts = useMemo(() => [...accounts].sort((a, b) =>
    (b.pending_orders > 0) - (a.pending_orders > 0) || a.opened_at.localeCompare(b.opened_at)
  ), [accounts]);

  function changeView(next) {
    setView(next);
    rememberView(next);
  }

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

  async function advance(order, status) {
    setActionError("");
    const response = await setOrderStatus(order.id, status);
    if (!response.ok) setActionError(orderingErrorMessage(response, t("No pudimos actualizar el pedido.")));
    await refresh({ force: true });
  }

  // Quitar un producto se confirma en el mismo renglón de la comanda.
  async function removeItem(order, item) {
    setActionError("");
    const response = await cancelItem(order.id, item.id);
    if (!response.ok) setActionError(orderingErrorMessage(response, t("No pudimos cancelar el producto.")));
    await refresh({ force: true });
  }

  function confirmed() {
    setConfirming(null);
    refresh({ force: true });
  }

  const currency = business.currency || "MXN";
  const canToggle = ordering && ordering.reason !== "plan";
  const ticketHandlers = (account, order) => ({
    onAdvance: (status) => advance(order, status),
    onReject: () => setConfirming({ kind: "reject", account, order }),
    onRemoveItem: (item) => removeItem(order, item),
  });

  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-5 text-eniu-text">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <h1 className="text-[34px] font-black leading-none tracking-[-1.2px]">{t("Pedidos")}</h1>
        <div role="group" aria-label={t("Ver pedidos")} className="flex rounded-[14px] bg-eniu-surface-alt p-1">
          {[{ key: "table", label: "Por mesa" }, { key: "status", label: "Por estado" }].map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={view === option.key}
              onClick={() => changeView(option.key)}
              className={`min-h-11 cursor-pointer rounded-[11px] px-4 text-[15px] font-bold ${
                view === option.key ? "bg-eniu-surface shadow-[0_1px_3px_rgba(17,17,17,0.12)]" : "text-eniu-muted hover:text-eniu-text"
              }`}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? t("Sonido activado") : t("Activar sonido")}
            title={soundOn ? t("Sonido activado") : t("Activar sonido")}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-eniu-warm bg-eniu-surface hover:bg-eniu-surface-alt"
          >
            {soundOn ? <Bell size={18} aria-hidden="true" /> : <BellOff size={18} aria-hidden="true" />}
          </button>
          {canToggle && (
            <OrderingSwitch enabled={ordering.enabled} busy={isToggling} onToggle={toggleOrdering} />
          )}
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-3 sm:gap-4">
        <Counter label={t("Por aceptar")} value={counts.pending} className="bg-eniu-yellow text-eniu-ink" labelClass="text-eniu-ink/70" />
        <Counter label={t("En cocina")} value={counts.kitchen} className="bg-eniu-hero text-eniu-cream" labelClass="text-eniu-hero-muted" />
        <Counter label={t("Listos")} value={counts.ready} className="border border-eniu-warm bg-eniu-surface" labelClass="text-eniu-muted" valueClass="text-eniu-success" />
      </dl>

      <OrderingNotice ordering={ordering} trialEnds={limits?.orders_free_until} />
      {error && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-eniu-sand px-4 py-3 text-sm font-semibold">
          <WifiOff size={16} aria-hidden="true" /> {t("Sin conexión con el servidor. Reintentando…")}
        </p>
      )}
      {actionError && <p role="alert" className="rounded-xl bg-eniu-danger-soft px-4 py-3 text-sm font-semibold text-eniu-danger">{actionError}</p>}

      {!loaded ? (
        <div aria-label={t("Cargando pedidos")} className="grid animate-pulse gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))]">
          {[0, 1, 2].map((item) => <div key={item} className="h-64 rounded-3xl border border-eniu-warm bg-eniu-surface" />)}
        </div>
      ) : view === "status" ? (
        <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
          {STATUS_COLUMNS.map((column) => {
            const entries = accounts
              .flatMap((account) => account.orders
                .filter((order) => column.statuses.includes(order.status))
                .map((order) => ({ account, order })))
              .sort((a, b) => a.order.created_at.localeCompare(b.order.created_at));
            return (
              <section key={column.key} aria-labelledby={`column-${column.key}`} className="rounded-3xl bg-eniu-surface-alt p-4">
                <h2 id={`column-${column.key}`} className="mb-3 flex items-center justify-between text-lg font-black">
                  <span>{t(column.title)}</span>
                  <span className="tabular-nums text-eniu-muted">{entries.length}</span>
                </h2>
                {entries.length ? (
                  <div className="space-y-3">
                    {entries.map(({ account, order }) => (
                      <OrderTicket
                        key={order.id}
                        order={order}
                        table={account.table}
                        currency={currency}
                        variant="status"
                        {...ticketHandlers(account, order)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm font-semibold text-eniu-muted">{t("Nada por aquí")}</p>
                )}
              </section>
            );
          })}
        </div>
      ) : sortedAccounts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-eniu-warm bg-eniu-surface px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-eniu-yellow text-eniu-ink"><ClipboardList size={26} aria-hidden="true" /></span>
          <h2 className="mt-5 text-xl font-black">{t("No hay mesas con cuenta abierta")}</h2>
          <p className="mt-2 text-sm text-eniu-muted">{t("Cuando un comensal mande su primer pedido, su mesa aparecerá aquí.")}</p>
          <Link to="/dashboard/mesas" className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-eniu-hero px-5 font-bold text-eniu-cream hover:bg-eniu-hero-hover">{t("Ver mesas y QR")}</Link>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <p className="shrink-0 text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">
              {t("Mesas con cuenta abierta")} · {sortedAccounts.length}
            </p>
            <span aria-hidden="true" className="h-px flex-1 bg-eniu-warm" />
          </div>
          <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))]">
            {sortedAccounts.map((account) => (
              <TableCard
                key={account.id}
                account={account}
                currency={currency}
                ticketHandlers={ticketHandlers}
                onClose={() => setConfirming({ kind: "close", account })}
              />
            ))}
          </div>
        </>
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-eniu-sand px-4 py-3 text-sm font-semibold">
        <p>{t("Tu plan actual no incluye pedidos desde la mesa. El menú se sigue viendo, pero nadie puede pedir.")}</p>
        <PlanBadge />
      </div>
    );
  }
  return (
    <>
      {!ordering.enabled && (
        <p role="status" className="rounded-2xl bg-eniu-sand px-4 py-3 text-sm font-semibold">
          {t("Pedidos en pausa. Tus clientes ven el menú, pero no pueden pedir hasta que los reanudes.")}
        </p>
      )}
      {trialEnds && (
        <p className="text-sm text-eniu-muted">
          {t("Los pedidos son gratis hasta el {{date}}.", { date: formatDate(new Date(`${trialEnds}T12:00:00`), { day: "numeric", month: "long", year: "numeric" }) })}
        </p>
      )}
    </>
  );
}

function Counter({ label, value, className, labelClass, valueClass = "" }) {
  return (
    <div className={`min-w-0 rounded-3xl px-4 py-4 sm:px-5 ${className}`}>
      <dt className={`text-[11px] font-extrabold uppercase leading-tight tracking-[1px] sm:text-xs ${labelClass}`}>{label}</dt>
      <dd className={`mt-1 text-[36px] font-black sm:text-[44px] leading-none tracking-[-1.5px] tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}

function TableCard({ account, currency, ticketHandlers, onClose }) {
  const { t } = useTranslation();
  const hasPending = account.pending_orders > 0;
  const hintId = `close-hint-${account.id}`;
  return (
    <article
      className={`flex flex-col rounded-3xl bg-eniu-surface p-4 ${
        hasPending
          ? "border-2 border-eniu-yellow shadow-[0_8px_24px_rgba(255,224,90,0.35)]"
          : "border border-eniu-warm"
      }`}
    >
      <header className="mb-4 flex items-center gap-3">
        <MesaBadge number={account.table.number} size={50} as="h2" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-eniu-muted">{account.table.name || ""}</p>
        {hasPending && (
          <span className="shrink-0 rounded-full bg-eniu-yellow px-2.5 py-1 text-xs font-extrabold text-eniu-ink">
            {t("{{count}} por aceptar", { count: account.pending_orders })}
          </span>
        )}
      </header>

      <div className="space-y-3">
        {account.orders.map((order) => (
          <OrderTicket
            key={order.id}
            order={order}
            table={account.table}
            currency={currency}
            variant="table"
            {...ticketHandlers(account, order)}
          />
        ))}
      </div>

      <footer className="mt-4 border-t border-eniu-warm pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-bold text-eniu-muted">{t("Cuenta de la mesa")}</p>
          <p className="text-xl font-black tabular-nums">{formatCurrency(Number(account.total), currency)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={hasPending}
          aria-describedby={hasPending ? hintId : undefined}
          className="mt-3 min-h-12 w-full cursor-pointer rounded-xl border-[1.5px] border-eniu-text font-extrabold hover:bg-eniu-text hover:text-eniu-bg disabled:cursor-not-allowed disabled:border-eniu-warm disabled:text-eniu-muted disabled:hover:bg-transparent"
        >
          {t("Cerrar cuenta")}
        </button>
        {hasPending && <p id={hintId} className="mt-2 text-center text-xs text-eniu-muted">{t("Acepta o rechaza los pedidos pendientes para cerrar la cuenta.")}</p>}
      </footer>
    </article>
  );
}
