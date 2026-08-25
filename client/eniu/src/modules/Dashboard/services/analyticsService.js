import { useCallback } from "react";
import { useApi } from "../../auth/services/useApi";

export function useAnalyticsService(businessId, catalogueId) {
  const { request } = useApi();
  return useCallback((filters, options = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request({ method: "GET", path: `businesses/${businessId}/catalogues/${catalogueId}/analytics?${query}`, ...options });
  }, [businessId, catalogueId, request]);
}
