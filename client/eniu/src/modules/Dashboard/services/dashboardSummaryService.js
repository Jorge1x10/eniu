import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";

export function dashboardDateRange(now = new Date()) {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(to); thirtyDaysAgo.setDate(to.getDate() - 29);
  const monthStart = new Date(to.getFullYear(), to.getMonth(), 1);
  const from = monthStart < thirtyDaysAgo ? monthStart : thirtyDaysAgo;
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: format(from), to: format(to), timezone: "America/Mexico_City" };
}

export function useDashboardSummaryService(businessId) {
  const { request } = useApi();
  return useCallback(async ({ preferredCatalogueId, signal } = {}) => {
    const cataloguesResponse = await request({ method: "GET", path: `businesses/${businessId}/catalogues`, signal });
    if (!cataloguesResponse.ok || cataloguesResponse.aborted) return cataloguesResponse;
    const catalogues = cataloguesResponse.data?.catalogues || [];
    const selected = catalogues.find((item) => item.id === preferredCatalogueId) || catalogues[0] || null;
    if (!selected) return { ok: true, data: { catalogues, selectedCatalogue: null, analytics: null } };
    const query = new URLSearchParams(dashboardDateRange()).toString();
    const analyticsResponse = await request({ method: "GET", path: `businesses/${businessId}/catalogues/${selected.id}/analytics?${query}`, signal });
    if (!analyticsResponse.ok || analyticsResponse.aborted) return analyticsResponse;
    return { ok: true, data: { catalogues, selectedCatalogue: selected, analytics: analyticsResponse.data } };
  }, [businessId, request]);
}
