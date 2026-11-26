import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";
import i18n from "../../../i18n";

/**
 * Caja: turno, cobro de cuentas, movimientos y corte
 * (`server/eniu-backend/docs/CASH.md`). Devuelven `{ ok, status, data }`.
 */
export function cashErrorMessage(response, fallback) {
  if (response?.status === 403) return i18n.t("No tienes permiso para administrar este negocio.");
  if (response?.status === 0) return i18n.t("No hay conexión con el servidor. Revisa tu red.");
  return response?.data?.message || fallback;
}

export function useCashService(businessId) {
  const { request } = useApi();
  const base = `businesses/${businessId}`;

  const current = useCallback(
    (options = {}) => request({ method: "GET", path: `${base}/cash`, ...options }),
    [base, request]
  );
  const openCash = useCallback(
    (openingFloat) => request({ method: "POST", path: `${base}/cash/open`, data: { opening_float: openingFloat } }),
    [base, request]
  );
  const addMovement = useCallback(
    (movement) => request({ method: "POST", path: `${base}/cash/movements`, data: movement }),
    [base, request]
  );
  const closeCash = useCallback(
    (countedCash, notes) => request({ method: "POST", path: `${base}/cash/close`, data: { counted_cash: countedCash, notes } }),
    [base, request]
  );
  const sessions = useCallback(
    (options = {}) => request({ method: "GET", path: `${base}/cash/sessions`, ...options }),
    [base, request]
  );
  const session = useCallback(
    (sessionId, options = {}) => request({ method: "GET", path: `${base}/cash/sessions/${sessionId}`, ...options }),
    [base, request]
  );
  const checkout = useCallback(
    (accountId, payments) => request({ method: "POST", path: `${base}/accounts/${accountId}/checkout`, data: { payments } }),
    [base, request]
  );

  return { current, openCash, addMovement, closeCash, sessions, session, checkout };
}
