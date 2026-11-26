import { useCallback, useEffect, useRef, useState } from "react";

import { useOrderingService } from "../services/orderingService";

/** Cada cuánto pregunta el panel si llegó algo. Ver `docs/ORDERING.md`. */
export const LIVE_POLL_MS = 5000;

const EMPTY = { accounts: [], ordering: null, loaded: false, error: false };

function pendingIds(accounts) {
  return accounts.flatMap((account) =>
    account.orders.filter((order) => order.status === "pending").map((order) => order.id));
}

/**
 * Las cuentas abiertas del negocio, al día.
 *
 * Pregunta cada pocos segundos con la última versión que vio: si nada cambió,
 * el servidor responde sin cargar la base. Sólo pregunta con la pestaña
 * visible, y al volver a ella pregunta en el acto.
 *
 * `onNewPending(count)` avisa cuando aparecen pedidos por aceptar que no
 * estaban en la consulta anterior (no en la primera carga: lo que ya había al
 * abrir la pantalla no es "nuevo").
 */
export function useLiveOrders(businessId, { onNewPending } = {}) {
  const { live } = useOrderingService(businessId);
  const [state, setState] = useState(EMPTY);
  const versionRef = useRef(null);
  const seenRef = useRef(null);
  const busyRef = useRef(false);
  const notifyRef = useRef(onNewPending);

  useEffect(() => { notifyRef.current = onNewPending; }, [onNewPending]);

  const refresh = useCallback(async ({ force = false } = {}) => {
    if (busyRef.current && !force) return;
    busyRef.current = true;
    const response = await live(force ? null : versionRef.current);
    busyRef.current = false;
    if (response.aborted) return;
    if (!response.ok) {
      // Se conserva lo último que se vio: un fallo de red no vacía la pantalla.
      setState((current) => ({ ...current, loaded: true, error: true }));
      return;
    }
    const data = response.data || {};
    versionRef.current = data.version ?? null;
    if (data.changed === false) {
      setState((current) => (current.error ? { ...current, error: false } : current));
      return;
    }
    const accounts = data.accounts || [];
    const pending = pendingIds(accounts);
    if (seenRef.current) {
      const fresh = pending.filter((id) => !seenRef.current.has(id));
      if (fresh.length) notifyRef.current?.(fresh.length);
    }
    seenRef.current = new Set(pending);
    setState({ accounts, ordering: data.ordering || null, loaded: true, error: false });
  }, [live]);

  useEffect(() => {
    versionRef.current = null;
    seenRef.current = null;
    const first = window.setTimeout(() => refresh({ force: true }), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, LIVE_POLL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [businessId, refresh]);

  return { ...state, refresh };
}
