import { createContext, useCallback, useContext, useMemo } from "react";

import { useLiveOrders } from "../hooks/useLiveOrders";
import { playNewOrderSound, soundPreference } from "../utils/orderSound";

const LiveOrdersContext = createContext(null);

/**
 * Una sola consulta en vivo de pedidos para todo el panel: la barra lateral
 * (contador de pendientes), Inicio y la pantalla de Pedidos leen de aquí.
 * Suena cuando llega un pedido nuevo, esté donde esté la persona dentro del
 * panel.
 */
export function LiveOrdersProvider({ businessId, children }) {
  const onNewPending = useCallback(() => {
    if (soundPreference()) playNewOrderSound();
  }, []);
  const live = useLiveOrders(businessId, { onNewPending });
  const value = useMemo(() => ({
    ...live,
    pendingCount: live.accounts.reduce((sum, account) => sum + (account.pending_orders || 0), 0),
  }), [live]);
  return <LiveOrdersContext.Provider value={value}>{children}</LiveOrdersContext.Provider>;
}

const EMPTY = { accounts: [], ordering: null, loaded: false, error: false, pendingCount: 0, refresh: async () => {} };

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveOrdersContext() {
  return useContext(LiveOrdersContext) || EMPTY;
}
