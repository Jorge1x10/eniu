import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getMyOrders, getMyTakeawayOrders, getTable, getTableAccount, getTakeaway, sendOrder, sendTakeawayOrder,
} from "./dinerService";
import {
  dinerToken, randomToken, rememberCart, rememberDinerName, rememberDinerPhone, savedCart, savedDinerName, savedDinerPhone,
} from "./dinerIdentity";

/** El comensal pregunta cada 10 s, sólo con pedidos sin terminar (ORDERING.md). */
export const DINER_POLL_MS = 10000;
export const MAX_QUANTITY = 20;
export const MAX_LINES = 30;
export const MAX_NOTES = 200;
export const MAX_NAME = 40;
export const MAX_PHONE = 20;
/** De 8 a 15 dígitos, con `+`, espacios, guiones o paréntesis: lo mismo que el servidor. */
export function isValidPhone(value) {
  const clean = String(value || "").trim().replace(/[\s().-]/g, "");
  const digits = clean.startsWith("+") ? clean.slice(1) : clean;
  return /^\d{8,15}$/.test(digits);
}

const UNFINISHED = new Set(["pending", "received", "preparing"]);

/** Se puede pedir lo que está disponible, tiene precio y clave pública. */
export function isOrderable(product) {
  return Boolean(product?.is_available && product.price !== null && product.price !== undefined && product.tracking_key);
}

/**
 * Todo lo que el comensal hace en su mesa: el carrito (guardado por mesa), el
 * envío y el seguimiento de sus pedidos, y la cuenta de la mesa.
 *
 * Con `takeawaySlug` (el menú abierto en `/m/<slug>/para-llevar`) es lo mismo
 * para llevar: pide también el teléfono, cada pedido es independiente y no
 * hay cuenta de mesa. En ese caso `table` es `{ takeaway: true, ... }`.
 *
 * Sin ninguno de los dos (el menú abierto sin QR de mesa) el hook queda
 * inactivo: no pide nada al servidor y las plantillas se ven como siempre.
 */
export function useTableOrdering(qrToken, products, takeawaySlug = null) {
  const { t } = useTranslation();
  const mode = qrToken ? "table" : takeawaySlug ? "takeaway" : null;
  const active = Boolean(mode);
  const takeaway = mode === "takeaway";
  // El carrito se guarda por mesa, o por menú para llevar.
  const placeKey = takeaway ? `llevar.${takeawaySlug}` : qrToken;
  const token = useMemo(() => (active ? dinerToken() : null), [active]);
  const [table, setTable] = useState({ status: active ? "loading" : "none" });
  const [dinerName, setDinerName] = useState(savedDinerName);
  const [dinerPhone, setDinerPhone] = useState(savedDinerPhone);
  const [cart, setCart] = useState(() => (active ? savedCart(placeKey) : []));
  const [orders, setOrders] = useState([]);
  // "closed": el restaurante ya cerró la cuenta en la que pidió este teléfono.
  const [accountStatus, setAccountStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);
  const versionRef = useRef(null);
  const sendKeyRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // El menú es la fuente de nombres y precios: lo que se dejó en el carrito y
  // ya no se puede pedir (se agotó, cambió de precio a "Consultar") sale.
  const orderable = useMemo(() => {
    const map = new Map();
    for (const product of products || []) if (isOrderable(product)) map.set(product.tracking_key, product);
    return map;
  }, [products]);

  const lines = useMemo(() => {
    if (!products) return cart;
    return cart
      .filter((line) => orderable.has(line.key))
      .map((line) => ({ ...line, name: orderable.get(line.key).name, price: orderable.get(line.key).price }));
  }, [cart, orderable, products]);

  useEffect(() => {
    if (active) rememberCart(placeKey, lines.map(({ key, name, price, quantity, notes }) => ({ key, name, price, quantity, notes })));
  }, [active, placeKey, lines]);

  const loadOrders = useCallback(async ({ force = false, signal } = {}) => {
    if (!active) return;
    if (takeaway) {
      const response = await getMyTakeawayOrders(takeawaySlug, { token, signal });
      if (response.aborted || !mountedRef.current || !response.ok) return;
      // El servidor los manda del más reciente al más antiguo; aquí van en
      // el orden en que se pidieron, como en la mesa.
      setOrders(Array.isArray(response.data?.orders) ? [...response.data.orders].reverse() : []);
      return;
    }
    const response = await getMyOrders(qrToken, { token, version: force ? null : versionRef.current, signal });
    if (response.aborted || !mountedRef.current || !response.ok) return;
    const data = response.data || {};
    if (data.changed === false) return;
    versionRef.current = data.account?.version ?? null;
    setOrders(Array.isArray(data.orders) ? data.orders : []);
    setAccountStatus(data.account?.status ?? null);
  }, [active, takeaway, takeawaySlug, qrToken, token]);

  // La mesa y lo que este teléfono ya pidió en ella, al abrir.
  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    (async () => {
      if (takeaway) {
        const response = await getTakeaway(takeawaySlug, { token, signal: controller.signal });
        if (response.aborted || !mountedRef.current) return;
        if (!response.ok) {
          setTable({ status: response.status === 404 ? "missing" : "error", takeaway: true });
          return;
        }
        setTable({ status: "ready", takeaway: true, number: null, name: null, orderingEnabled: Boolean(response.data?.ordering?.enabled) });
        loadOrders({ force: true, signal: controller.signal });
        return;
      }
      const response = await getTable(qrToken, { token, signal: controller.signal });
      if (response.aborted || !mountedRef.current) return;
      if (!response.ok) {
        setTable({ status: response.status === 404 ? "missing" : "error" });
        return;
      }
      const data = response.data || {};
      setTable({
        status: "ready",
        number: data.table?.number,
        name: data.table?.name || null,
        orderingEnabled: Boolean(data.ordering?.enabled),
      });
      loadOrders({ force: true, signal: controller.signal });
    })();
    return () => controller.abort();
  }, [active, takeaway, takeawaySlug, qrToken, token, loadOrders]);

  const hasUnfinished = orders.some((order) => UNFINISHED.has(order.status));

  // Sondeo sólo mientras algo está en camino y la pestaña se ve. Cuando todo
  // está "Listo", deja de preguntar.
  useEffect(() => {
    if (!active || !hasUnfinished) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadOrders();
    }, DINER_POLL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") loadOrders();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, hasUnfinished, loadOrders]);

  // Cambiar el carrito es otro envío: la clave de idempotencia se rehace.
  const updateCart = useCallback((change) => {
    sendKeyRef.current = null;
    setNotice(null);
    setCart((current) => change(current));
  }, []);

  const quantityOf = useCallback(
    (key) => lines.find((line) => line.key === key)?.quantity || 0,
    [lines],
  );

  const add = useCallback((product) => {
    if (!isOrderable(product)) return;
    updateCart((current) => {
      const existing = current.find((line) => line.key === product.tracking_key);
      if (existing) {
        return current.map((line) => (line.key === product.tracking_key
          ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + 1) }
          : line));
      }
      if (current.length >= MAX_LINES) return current;
      return [...current, { key: product.tracking_key, name: product.name, price: product.price, quantity: 1, notes: "" }];
    });
  }, [updateCart]);

  const addByKey = useCallback((key) => {
    const product = orderable.get(key);
    if (product) add(product);
  }, [add, orderable]);

  const decrement = useCallback((key) => {
    updateCart((current) => current
      .map((line) => (line.key === key ? { ...line, quantity: line.quantity - 1 } : line))
      .filter((line) => line.quantity > 0));
  }, [updateCart]);

  const remove = useCallback((key) => {
    updateCart((current) => current.filter((line) => line.key !== key));
  }, [updateCart]);

  const setNotes = useCallback((key, notes) => {
    updateCart((current) => current.map((line) => (line.key === key ? { ...line, notes: notes.slice(0, MAX_NOTES) } : line)));
  }, [updateCart]);

  const saveName = useCallback((name) => {
    const clean = name.trim().slice(0, MAX_NAME);
    setDinerName(clean);
    rememberDinerName(clean);
  }, []);

  const savePhone = useCallback((phone) => {
    const clean = phone.trim().slice(0, MAX_PHONE);
    setDinerPhone(clean);
    rememberDinerPhone(clean);
  }, []);

  // `nameOverride` y `phoneOverride`: lo que se acaba de escribir en el
  // carrito, que aún no llegó al estado cuando se toca "Mandar pedido".
  const send = useCallback(async (nameOverride, phoneOverride) => {
    const name = (nameOverride ?? dinerName).trim();
    const phone = (phoneOverride ?? dinerPhone).trim();
    if (!lines.length || sending) return { ok: false };
    if (!name) return { ok: false, needsName: true };
    if (takeaway && !isValidPhone(phone)) return { ok: false, needsPhone: true };
    // La misma clave en los reintentos: un doble toque o una red lenta
    // devuelven el mismo pedido en vez de duplicarlo.
    if (!sendKeyRef.current) sendKeyRef.current = randomToken(24);
    setSending(true);
    setNotice(null);
    const payload = {
      token,
      dinerName: name,
      idempotencyKey: sendKeyRef.current,
      items: lines.map((line) => ({ product_key: line.key, quantity: line.quantity, ...(line.notes?.trim() ? { notes: line.notes.trim() } : {}) })),
    };
    const response = takeaway
      ? await sendTakeawayOrder(takeawaySlug, { ...payload, phone })
      : await sendOrder(qrToken, payload);
    if (!mountedRef.current) return { ok: false };
    setSending(false);
    if (response.ok) {
      sendKeyRef.current = null;
      setCart([]);
      if (response.data?.order) setOrders((current) => [...current.filter((order) => order.idempotency_key !== response.data.order.idempotency_key), response.data.order]);
      setNotice({ tone: "success", text: t("¡Pedido enviado! Te avisamos aquí cuando el restaurante lo reciba.") });
      loadOrders({ force: true });
      return { ok: true };
    }
    const code = response.data?.code;
    if (code === "products_unavailable") {
      const gone = new Set(response.data.product_keys || []);
      sendKeyRef.current = null;
      setCart((current) => current.filter((line) => !gone.has(line.key)));
      setNotice({ tone: "error", text: t("Algunos productos ya no se pueden pedir y los quitamos de tu carrito. Revísalo y vuelve a mandarlo.") });
    } else if (code === "ordering_disabled") {
      setTable((current) => ({ ...current, orderingEnabled: false }));
      setNotice({ tone: "error", text: takeaway
        ? t("El restaurante no está recibiendo pedidos para llevar en este momento.")
        : t("El restaurante pausó los pedidos. Puedes seguir viendo el menú o pedirle al mesero.") });
    } else if (code === "too_many_pending") {
      setNotice({ tone: "error", text: t("Espera a que el restaurante confirme tus pedidos antes de mandar otro.") });
    } else if (response.status === 0) {
      setNotice({ tone: "error", text: t("No hay conexión. Revisa tu internet y vuelve a intentarlo; no se duplicará tu pedido.") });
    } else {
      setNotice({ tone: "error", text: response.data?.message || t("No pudimos mandar tu pedido. Intenta de nuevo.") });
    }
    return { ok: false };
  }, [dinerName, dinerPhone, lines, loadOrders, qrToken, sending, t, takeaway, takeawaySlug, token]);

  const loadAccount = useCallback(async () => {
    const response = await getTableAccount(qrToken, { token });
    if (response.ok) return { ok: true, account: response.data?.account || null };
    if (response.data?.code === "no_account") return { ok: true, account: null };
    return { ok: false };
  }, [qrToken, token]);

  // "Te avisamos cuando lo reciba" deja de tener sentido en cuanto lo recibe.
  const visibleNotice = notice?.tone === "success" && !orders.some((order) => order.status === "pending") ? null : notice;
  const canOrder = active && table.status === "ready" && table.orderingEnabled;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);

  return {
    active, takeaway, placeKey, table, canOrder, dinerName, saveName, dinerPhone, savePhone,
    lines, count, total, quantityOf, add, addByKey, decrement, remove, setNotes,
    orders, send, sending, notice: visibleNotice, dismissNotice: () => setNotice(null),
    loadAccount, refreshOrders: () => loadOrders({ force: true }),
    accountClosed: accountStatus === "closed",
  };
}
