import * as Haptics from 'expo-haptics';
import { createContext, PropsWithChildren, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { api } from '@/lib/api';
import type { LiveOrders, OrderingState, OrderStatus, TableAccount } from '@/types/models';

/** Cada cuánto pregunta la app si llegó algo (ver `docs/ORDERING.md`). */
const POLL_MS = 5000;

type OrdersContextValue = {
  /** El plan incluye pedidos (también durante la prueba gratuita). */
  available: boolean;
  loaded: boolean;
  offline: boolean;
  accounts: TableAccount[];
  ordering: OrderingState | null;
  pendingCount: number;
  refresh: () => Promise<void>;
  setOrdering: (enabled: boolean) => Promise<void>;
  setStatus: (orderId: string, status: Exclude<OrderStatus, 'pending'>) => Promise<void>;
  cancelItem: (orderId: string, itemId: string) => Promise<void>;
  closeAccount: (accountId: string) => Promise<void>;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

/**
 * Las cuentas abiertas del negocio, al día, para toda la app: la pestaña
 * Pedidos, su globo de pendientes e Inicio leen de aquí, así que hay una sola
 * consulta en vivo y no una por pantalla.
 *
 * Pregunta con la última versión que vio: si nada cambió, el servidor responde
 * sin cargar la base. Sólo pregunta con la app en primer plano.
 */

/**
 * Una cuenta para llevar llega sin mesa (`table: null`). Para que las
 * pantallas la dibujen como una mesa, se le pone una marcada con
 * `takeaway: true` y el nombre y teléfono de quien pide.
 */
function withPlace(account: TableAccount): TableAccount {
  if (account.table) return account;
  return {
    ...account,
    table: {
      id: null, number: null, takeaway: true,
      name: account.customer?.name ?? null, phone: account.customer?.phone ?? null,
      delivery: account.delivery ?? null,
    },
  };
}

export function OrdersProvider({ children }: PropsWithChildren) {
  const { limits } = usePlan();
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id;
  const available = Boolean(limits.allow_orders) && Boolean(businessId);
  const [accounts, setAccounts] = useState<TableAccount[]>([]);
  const [ordering, setOrderingState] = useState<OrderingState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const versionRef = useRef<number | null>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async (force = false) => {
    if (!available || !businessId || (busyRef.current && !force)) return;
    busyRef.current = true;
    try {
      const version = force ? null : versionRef.current;
      const data = await api.get<LiveOrders>(`businesses/${businessId}/orders/live${version === null ? '' : `?version=${version}`}`);
      setOffline(false);
      versionRef.current = data.version;
      if (!data.changed) return;
      const pending = data.accounts.flatMap((account) => account.orders.filter((order) => order.status === 'pending').map((order) => order.id));
      // TODO(diseño): el diseño avisa con un sonido. La app no tiene librería de
      // audio y no se agregan dependencias; mientras tanto, vibra.
      if (seenRef.current && pending.some((id) => !seenRef.current!.has(id))) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      seenRef.current = new Set(pending);
      setAccounts(data.accounts.map(withPlace));
      setOrderingState(data.ordering);
    } catch {
      // Se conserva lo último que se vio: un fallo de red no vacía la pantalla.
      setOffline(true);
    } finally {
      busyRef.current = false;
      setLoaded(true);
    }
  }, [available, businessId]);

  useEffect(() => {
    versionRef.current = null;
    seenRef.current = null;
    const reset = setTimeout(() => { setAccounts([]); setOrderingState(null); setLoaded(false); }, 0);
    if (!available) return () => clearTimeout(reset);
    const first = setTimeout(() => load(true), 0);
    let active = AppState.currentState === 'active';
    const interval = setInterval(() => { if (active) load(); }, POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (active) load();
    });
    return () => { clearTimeout(reset); clearTimeout(first); clearInterval(interval); subscription.remove(); };
  }, [available, load]);

  const after = useCallback(async (request: () => Promise<unknown>) => {
    try { await request(); } finally { await load(true); }
  }, [load]);

  const value = useMemo<OrdersContextValue>(() => ({
    available,
    loaded,
    offline,
    accounts,
    ordering,
    pendingCount: accounts.reduce((sum, account) => sum + account.pending_orders, 0),
    refresh: () => load(true),
    setOrdering: (enabled) => after(() => api.patch(`businesses/${businessId}/ordering`, { enabled })),
    setStatus: (orderId, status) => after(() => api.patch(`businesses/${businessId}/orders/${orderId}`, { status })),
    cancelItem: (orderId, itemId) => after(() => api.post(`businesses/${businessId}/orders/${orderId}/items/${itemId}/cancel`)),
    closeAccount: (accountId) => after(() => api.post(`businesses/${businessId}/accounts/${accountId}/close`)),
  }), [accounts, after, available, businessId, load, loaded, offline, ordering]);

  return <OrdersContext value={value}>{children}</OrdersContext>;
}

export function useOrders() {
  const value = use(OrdersContext);
  if (!value) throw new Error('useOrders debe usarse dentro de OrdersProvider');
  return value;
}

/** Hora corta de un pedido: "13:40". */
export function orderTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
