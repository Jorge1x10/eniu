import { useCallback, useEffect, useRef, useState } from "react";

import { useOrderingService } from "../services/orderingService";
import { diffOrders } from "../notifications/orderEvents";
import { withPlace } from "../utils/labels";

/** Cada cuánto pregunta el panel si llegó algo. Ver `docs/ORDERING.md`. */
export const LIVE_POLL_MS = 5000;
/**
 * Con la pestaña oculta pregunta cada 15 s: sin eso, quien tiene el panel
 * detrás de otra pestaña no se enteraría de un pedido nuevo. "Sin cambios" le
 * cuesta al servidor una lectura por clave primaria. (El navegador puede
 * espaciarlo más en pestañas que llevan mucho tiempo ocultas.)
 */
export const HIDDEN_POLL_EVERY = 3;

const EMPTY = { accounts: [], ordering: null, loaded: false, error: false };

/**
 * Las cuentas abiertas del negocio, al día.
 *
 * Pregunta cada pocos segundos con la última versión que vio: si nada cambió,
 * el servidor responde sin cargar la base. Con la pestaña oculta pregunta
 * más espaciado (para poder avisar), y al volver a ella pregunta en el acto.
 *
 * `onNewPending(count)` avisa cuando aparecen pedidos por aceptar que no
 * estaban en la consulta anterior (no en la primera carga: lo que ya había al
 * abrir la pantalla no es "nuevo"). `onEvents(events)` entrega todos los
 * cambios (ver `diffOrders`) para las notificaciones.
 */
export function useLiveOrders(businessId, { onNewPending, onEvents } = {}) {
  const { live } = useOrderingService(businessId);
  const [state, setState] = useState(EMPTY);
  const versionRef = useRef(null);
  const seenRef = useRef(null);
  const busyRef = useRef(false);
  const notifyRef = useRef(onNewPending);
  const eventsRef = useRef(onEvents);

  useEffect(() => { notifyRef.current = onNewPending; }, [onNewPending]);
  useEffect(() => { eventsRef.current = onEvents; }, [onEvents]);

  const refresh = useCallback(async ({ force = false } = {}) => {
    if (!businessId || (busyRef.current && !force)) return;
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
    const accounts = (data.accounts || []).map(withPlace);
    const { current, events } = diffOrders(seenRef.current, accounts);
    seenRef.current = current;
    const fresh = events.filter((event) => event.type === "new").length;
    if (fresh) notifyRef.current?.(fresh);
    if (events.length) eventsRef.current?.(events);
    setState({ accounts, ordering: data.ordering || null, loaded: true, error: false });
  }, [businessId, live]);

  useEffect(() => {
    versionRef.current = null;
    seenRef.current = null;
    if (!businessId) return undefined;
    const first = window.setTimeout(() => refresh({ force: true }), 0);
    let tick = 0;
    const interval = window.setInterval(() => {
      tick += 1;
      if (document.visibilityState === "visible" || tick % HIDDEN_POLL_EVERY === 0) refresh();
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
