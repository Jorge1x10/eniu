import { useCallback } from "react";
import { useApi } from "../../auth/services/useApi";

export function useAnalyticsService(businessId, catalogueId) {
  const { request } = useApi();
  return useCallback((filters, options = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request({ method: "GET", path: `businesses/${businessId}/catalogues/${catalogueId}/analytics?${query}`, ...options });
  }, [businessId, catalogueId, request]);
}

/**
 * Resumen de los últimos 7 días, lo que incluye el plan gratuito.
 *
 * El periodo lo fija el backend: sólo acepta la zona horaria, que decide dónde
 * empieza cada día.
 */
export function useAnalyticsSummaryService(businessId, catalogueId) {
  const { request } = useApi();
  return useCallback((timezone, options = {}) => {
    const query = new URLSearchParams({ timezone }).toString();
    return request({ method: "GET", path: `businesses/${businessId}/catalogues/${catalogueId}/analytics/summary?${query}`, ...options });
  }, [businessId, catalogueId, request]);
}
