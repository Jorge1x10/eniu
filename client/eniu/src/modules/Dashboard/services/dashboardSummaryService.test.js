import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { analyticsScopeFor, useDashboardSummaryService } from "./dashboardSummaryService";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../auth/services/useApi", () => ({ useApi: () => ({ request: mocks.request }) }));

const catalogue = { id: "catalogue-1", name: "Carta" };

describe("analyticsScopeFor", () => {
  it("elige el informe completo, el resumen de 7 días o nada según el plan", () => {
    expect(analyticsScopeFor({ allow_analytics: true, analytics_summary: true })).toBe("full");
    expect(analyticsScopeFor({ allow_analytics: false, analytics_summary: true })).toBe("summary");
    expect(analyticsScopeFor({ allow_analytics: false })).toBe("none");
    expect(analyticsScopeFor(null)).toBe("none");
  });
});

describe("useDashboardSummaryService", () => {
  beforeEach(() => {
    mocks.request.mockReset();
    mocks.request.mockImplementation(({ path }) => Promise.resolve(path.endsWith("/catalogues")
      ? { ok: true, data: { catalogues: [catalogue] } }
      : { ok: true, data: { summary: { menu_views: { value: 3 } }, visits_over_time: [] } }));
  });

  it("el plan gratuito pide el resumen con la zona del negocio y nada más", async () => {
    const { result } = renderHook(() => useDashboardSummaryService("business-1", "Europe/Madrid", "summary"));
    const response = await result.current();
    const analyticsPath = mocks.request.mock.calls[1][0].path;
    expect(analyticsPath).toBe("businesses/business-1/catalogues/catalogue-1/analytics/summary?timezone=Europe%2FMadrid");
    expect(response.data.analyticsScope).toBe("summary");
  });

  it("un 403 deja Inicio sin cifras en lugar de mostrar un error", async () => {
    mocks.request.mockImplementation(({ path }) => Promise.resolve(path.endsWith("/catalogues")
      ? { ok: true, data: { catalogues: [catalogue] } }
      : { ok: false, status: 403, data: { code: "plan_limit" } }));
    const { result } = renderHook(() => useDashboardSummaryService("business-1", "UTC", "full"));
    const response = await result.current();
    expect(response.ok).toBe(true);
    expect(response.data.analytics).toBeNull();
    expect(response.data.selectedCatalogue).toEqual(catalogue);
  });

  it("sin analíticas en el plan no las pide", async () => {
    const { result } = renderHook(() => useDashboardSummaryService("business-1", "UTC", "none"));
    const response = await result.current();
    expect(mocks.request).toHaveBeenCalledTimes(1);
    expect(response.data.analytics).toBeNull();
  });
});
