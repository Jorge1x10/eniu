import { useQueries } from '@tanstack/react-query';

import { analyticsRange } from '@/lib/analytics-range';
import { api } from '@/lib/api';
import type { Analytics, Business, Catalogue } from '@/types/models';

type BusinessSummary = { views: number; catalogueCount: number };

async function fetchBusinessSummary(businessId: string, timezone: string | undefined, allowAnalytics: boolean): Promise<BusinessSummary> {
  const { catalogues } = await api.get<{ catalogues: Catalogue[] }>(`businesses/${businessId}/catalogues`);
  if (!allowAnalytics) return { views: 0, catalogueCount: catalogues.length };
  const range = analyticsRange(1, timezone);
  const totals = await Promise.all(catalogues.map((catalogue) =>
    api.get<Analytics>(`businesses/${businessId}/catalogues/${catalogue.id}/analytics?${range}`)
      .then((data) => (data.visits_over_time ?? []).reduce((sum, point) => sum + Number(point.views || 0), 0))
      .catch(() => 0),
  ));
  return { views: totals.reduce((sum, value) => sum + value, 0), catalogueCount: catalogues.length };
}

/**
 * La API expone analíticas por catálogo y rango de fechas, no un total "hoy"
 * por negocio. Se arma sumando las vistas de hoy de todos los catálogos de
 * cada negocio — razonable con pocos negocios y catálogos por negocio, no
 * pensado para cadenas con decenas de ellos.
 */
export function useBusinessesTodayViews(businesses: Business[], allowAnalytics: boolean) {
  const results = useQueries({
    queries: businesses.map((business) => ({
      queryKey: ['business-summary-today', business.id, business.timezone],
      queryFn: () => fetchBusinessSummary(business.id, business.timezone, allowAnalytics),
      enabled: Boolean(business.id),
      staleTime: 60_000,
    })),
  });

  const map = new Map<string, { views: number; catalogueCount: number; isLoading: boolean }>();
  businesses.forEach((business, index) => {
    const result = results[index];
    const data = result?.data;
    map.set(business.id, { views: data?.views ?? 0, catalogueCount: data?.catalogueCount ?? 0, isLoading: Boolean(result?.isLoading) });
  });
  return map;
}
