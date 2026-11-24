import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { useLiveOrders } from "../hooks/useLiveOrders";
import { closeAllNotifications, closeNotification, showNotification } from "../notifications/browserNotifications";
import { itemsSummary } from "../notifications/orderEvents";
import { playNewOrderSound, soundPreference } from "../utils/orderSound";

const LiveOrdersContext = createContext(null);

const pendingTag = (orderId) => `eniu-pending-${orderId}`;
const acceptedTag = (orderId) => `eniu-accepted-${orderId}`;
const readyTag = (orderId) => `eniu-ready-${orderId}`;

function pageHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

/**
 * Una sola consulta en vivo de pedidos para todo el panel: la barra lateral
 * (contador de pendientes), Inicio, la pantalla de Pedidos y las
 * notificaciones leen de aquí. Suena cuando llega un pedido nuevo, esté
 * donde esté la persona dentro del panel.
 *
 * Notificaciones (ver `OrderNotifications`):
 * - pedido nuevo: se ve mientras siga por aceptar; se quita sola al
 *   aceptarlo o rechazarlo, desde aquí o desde otro dispositivo;
 * - pedido aceptado, con su mesa: temporal;
 * - pedido listo para llevar a la mesa: hasta que alguien lo da por visto.
 * Con la pestaña oculta, además, sale un aviso del sistema (si hay permiso).
 */
export function LiveOrdersProvider({ businessId, children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const tRef = useRef(t);
  const navigateRef = useRef(navigate);

  useEffect(() => { tRef.current = t; navigateRef.current = navigate; }, [t, navigate]);
  useEffect(() => () => closeAllNotifications(), []);

  const onNewPending = useCallback(() => {
    if (soundPreference()) playNewOrderSound();
  }, []);

  const onEvents = useCallback((events) => {
    const tr = tRef.current;
    const goToOrders = () => navigateRef.current("/dashboard/pedidos");
    const additions = [];
    const gone = new Set();
    for (const event of events) {
      const table = tr("Mesa {{number}}", { number: event.table.number });
      const body = `${event.order.diner_name} · ${itemsSummary(event.order)}`;
      if (event.type === "new" && pageHidden()) {
        showNotification({ tag: pendingTag(event.orderId), title: tr("Nuevo pedido · {{table}}", { table }), body, persistent: true, onClick: goToOrders });
      }
      if (event.type === "accepted" || event.type === "rejected" || event.type === "gone") {
        closeNotification(pendingTag(event.orderId));
      }
      if (event.type === "accepted") {
        additions.push({ id: `accepted-${event.orderId}`, kind: "accepted", ...event });
        if (pageHidden()) {
          const shown = showNotification({ tag: acceptedTag(event.orderId), title: tr("Pedido aceptado · {{table}}", { table }), body, onClick: goToOrders });
          if (shown) window.setTimeout(() => closeNotification(acceptedTag(event.orderId)), 8000);
        }
      }
      if (event.type === "ready") {
        additions.push({ id: `ready-${event.orderId}`, kind: "ready", ...event });
        if (pageHidden()) {
          showNotification({ tag: readyTag(event.orderId), title: tr("Listo para llevar · {{table}}", { table }), body, persistent: true, onClick: goToOrders });
        }
      }
      if (event.type === "gone") {
        gone.add(event.orderId);
        closeNotification(readyTag(event.orderId));
      }
    }
    if (!additions.length && !gone.size) return;
    setAlerts((current) => [
      ...current.filter((alert) => !gone.has(alert.orderId) && !additions.some((added) => added.id === alert.id)),
      ...additions,
    ]);
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts((current) => {
      const alert = current.find((entry) => entry.id === id);
      if (alert?.kind === "ready") closeNotification(readyTag(alert.orderId));
      return current.filter((entry) => entry.id !== id);
    });
  }, []);

  const live = useLiveOrders(businessId, { onNewPending, onEvents });
  const value = useMemo(() => ({
    ...live,
    businessId,
    alerts,
    dismissAlert,
    pendingCount: live.accounts.reduce((sum, account) => sum + (account.pending_orders || 0), 0),
  }), [live, businessId, alerts, dismissAlert]);
  return <LiveOrdersContext.Provider value={value}>{children}</LiveOrdersContext.Provider>;
}

const EMPTY = {
  accounts: [], ordering: null, loaded: false, error: false, pendingCount: 0, businessId: null,
  alerts: [], dismissAlert: () => {}, refresh: async () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveOrdersContext() {
  return useContext(LiveOrdersContext) || EMPTY;
}
