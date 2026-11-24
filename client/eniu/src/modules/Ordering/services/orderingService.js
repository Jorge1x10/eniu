import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";
import i18n from "../../../i18n";

/**
 * Mesas y pedidos del negocio (`server/eniu-backend/docs/ORDERING.md`).
 *
 * Todas las funciones devuelven `{ ok, status, data }`, como el resto de los
 * servicios del panel, para que cada pantalla decida cómo avisar.
 */
export function orderingErrorMessage(response, fallback) {
  if (response?.status === 403) {
    return response.data?.code === "plan_limit"
      ? response.data.message
      : i18n.t("No tienes permiso para administrar este negocio.");
  }
  if (response?.status === 0) return i18n.t("No hay conexión con el servidor. Revisa tu red.");
  return response?.data?.message || fallback;
}

export function useOrderingService(businessId) {
  const { request } = useApi();
  const base = `businesses/${businessId}`;

  const listTables = useCallback(
    (options = {}) => request({ method: "GET", path: `${base}/tables`, ...options }),
    [base, request]
  );
  const createTable = useCallback(
    (data) => request({ method: "POST", path: `${base}/tables`, data }),
    [base, request]
  );
  const updateTable = useCallback(
    (tableId, data) => request({ method: "PATCH", path: `${base}/tables/${tableId}`, data }),
    [base, request]
  );
  const deleteTable = useCallback(
    (tableId) => request({ method: "DELETE", path: `${base}/tables/${tableId}` }),
    [base, request]
  );
  const regenerateQr = useCallback(
    (tableId) => request({ method: "POST", path: `${base}/tables/${tableId}/regenerate-qr` }),
    [base, request]
  );
  const setOrdering = useCallback(
    (enabled) => request({ method: "PATCH", path: `${base}/ordering`, data: { enabled } }),
    [base, request]
  );
  const live = useCallback(
    (version, options = {}) => request({
      method: "GET",
      path: `${base}/orders/live${version === null || version === undefined ? "" : `?version=${version}`}`,
      ...options,
    }),
    [base, request]
  );
  const setOrderStatus = useCallback(
    (orderId, status) => request({ method: "PATCH", path: `${base}/orders/${orderId}`, data: { status } }),
    [base, request]
  );
  const cancelItem = useCallback(
    (orderId, itemId) => request({ method: "POST", path: `${base}/orders/${orderId}/items/${itemId}/cancel` }),
    [base, request]
  );
  // Lo vendido por periodo (`{ from, to }` en AAAA-MM-DD, zona del negocio).
  const stats = useCallback(
    (range, options = {}) => request({ method: "GET", path: `${base}/orders/stats?${new URLSearchParams(range)}`, ...options }),
    [base, request]
  );
  const closeAccount = useCallback(
    (accountId) => request({ method: "POST", path: `${base}/accounts/${accountId}/close` }),
    [base, request]
  );

  return {
    listTables, createTable, updateTable, deleteTable, regenerateQr,
    setOrdering, live, setOrderStatus, cancelItem, closeAccount, stats,
  };
}
