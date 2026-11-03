import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";

/**
 * Hoy, en la zona horaria del negocio.
 *
 * No sirve la fecha del navegador: quien administra desde otro país —o desde
 * el aeropuerto— vería el resumen cortado por los días de donde está, no por
 * los de su restaurante. Se pide a `Intl` con `en-CA` porque ese locale
 * escribe las fechas como `AAAA-MM-DD`, que es justo lo que espera la API.
 */
function todayIn(timezone) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  } catch {
    // Una zona que `Intl` no reconoce: se usa la del navegador antes que
    // dejar el resumen sin cargar.
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
}

/**
 * Zona del navegador, para el instante en que el negocio aún no ha cargado.
 *
 * Antes ese hueco lo llenaba "America/Mexico_City" escrito a mano, que fuera
 * de México siempre era la respuesta equivocada. La del navegador acierta
 * casi siempre y nunca es absurda.
 */
function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function dashboardDateRange(timezone = browserTimezone(), today = todayIn(timezone)) {
  // Mediodía UTC y no medianoche: construir el día a las 00:00 lo deja a
  // merced del cambio de horario de verano, que puede correrlo al día
  // anterior. Sólo se usa para restar días, así que la hora da igual.
  const to = new Date(`${today}T12:00:00Z`);
  const thirtyDaysAgo = new Date(to); thirtyDaysAgo.setUTCDate(to.getUTCDate() - 29);
  const monthStart = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  const from = monthStart < thirtyDaysAgo ? monthStart : thirtyDaysAgo;
  return { from: from.toISOString().slice(0, 10), to: today, timezone };
}

/**
 * Qué parte de las analíticas puede pedir el resumen de Inicio.
 *
 * `full` es el informe del plan de pago; `summary`, los 7 días del gratuito.
 * Pedir el informe completo sin tenerlo devolvía 403, y Inicio lo pintaba como
 * "No pudimos cargar el resumen de tu negocio" a todo usuario gratuito.
 */
export function analyticsScopeFor(limits) {
  if (limits?.allow_analytics) return "full";
  return limits?.analytics_summary ? "summary" : "none";
}

export function useDashboardSummaryService(businessId, timezone, scope = "full") {
  // `timezone` llega vacío mientras el negocio carga; `dashboardDateRange`
  // resuelve ese hueco con la zona del navegador.
  const { request } = useApi();
  return useCallback(async ({ preferredCatalogueId, signal } = {}) => {
    const cataloguesResponse = await request({ method: "GET", path: `businesses/${businessId}/catalogues`, signal });
    if (!cataloguesResponse.ok || cataloguesResponse.aborted) return cataloguesResponse;
    const catalogues = cataloguesResponse.data?.catalogues || [];
    const selected = catalogues.find((item) => item.id === preferredCatalogueId) || catalogues[0] || null;
    const withoutAnalytics = { ok: true, data: { catalogues, selectedCatalogue: selected, analytics: null, analyticsScope: scope } };
    if (!selected || scope === "none") return withoutAnalytics;
    const path = scope === "summary"
      ? `businesses/${businessId}/catalogues/${selected.id}/analytics/summary?${new URLSearchParams({ timezone: timezone || browserTimezone() })}`
      : `businesses/${businessId}/catalogues/${selected.id}/analytics?${new URLSearchParams(dashboardDateRange(timezone || undefined))}`;
    const analyticsResponse = await request({ method: "GET", path, signal });
    if (analyticsResponse.aborted) return analyticsResponse;
    // Si el plan cambió desde que se cargó la sesión, la API dice 403: Inicio
    // se queda sin cifras en vez de mostrar un error que no lo es.
    if (analyticsResponse.status === 403) return withoutAnalytics;
    if (!analyticsResponse.ok) return analyticsResponse;
    return { ok: true, data: { catalogues, selectedCatalogue: selected, analytics: analyticsResponse.data, analyticsScope: scope } };
  }, [businessId, timezone, scope, request]);
}
