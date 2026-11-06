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
  const respond = ({ analytics = { ok: true, data: { summary: { menu_views: { value: 3 } }, visits_over_time: [] } }, products = { ok: true, data: { products: [{ id: "p1" }, { id: "p2" }] } } } = {}) => ({ path }) => Promise.resolve(
    path.endsWith("/catalogues") ? { ok: true, data: { catalogues: [catalogue] } } : path.endsWith("/products") ? products : analytics,
  );
  const analyticsCalls = () => mocks.request.mock.calls.map(([options]) => options.path).filter((path) => path.includes("/analytics"));

  beforeEach(() => {
    mocks.request.mockReset();
    mocks.request.mockImplementation(respond());
  });

  it("el plan gratuito pide el resumen con la zona del negocio y nada más", async () => {
    const { result } = renderHook(() => useDashboardSummaryService("business-1", "Europe/Madrid", "summary"));
    const response = await result.current();
    expect(analyticsCalls()).toEqual(["businesses/business-1/catalogues/catalogue-1/analytics/summary?timezone=Europe%2FMadrid"]);
    expect(response.data.analyticsScope).toBe("summary");
  });

  it("trae cuántos productos tiene el menú elegido para la tarjeta de Inicio", async () => {
    const { result } = renderHook(() => useDashboardSummaryService("business-1", "UTC", "full"));
    expect((await result.current()).data.productCount).toBe(2);

    // Si esa consulta falla, Inicio no se cae: la tarjeta vuelve a su guion.
    mocks.request.mockImplementation(respond({ products: { ok: false, status: 500, data: null } }));
    const response = await result.current();
    expect(response.ok).toBe(true);
    expect(response.data.productCount).toBeNull();
  });

  it("un 403 deja Inicio sin cifras en lugar de mostrar un error", async () => {
    mocks.request.mockImplementation(respond({ analytics: { ok: false, status: 403, data: { code: "plan_limit" } } }));
    const { result } = renderHook(() => useDashboardSummaryService("business-1", "UTC", "full"));
    const response = await result.current();
    expect(response.ok).toBe(true);
    expect(response.data.analytics).toBeNull();
    expect(response.data.selectedCatalogue).toEqual(catalogue);
    expect(response.data.productCount).toBe(2);
  });

  it("si el backend todavía no tiene el resumen (404), Inicio tampoco muestra error", async () => {
    mocks.request.mockImplementation(respond({ analytics: { ok: false, status: 404, data: null } }));
    const { result } = renderHook(() => useDashboardSummaryService("business-1", "UTC", "summary"));
    const response = await result.current();
    expect(response.ok).toBe(true);
    expect(response.data.analytics).toBeNull();
  });

  it("sin analíticas en el plan no las pide", async () => {
    const { result } = renderHook(() => useDashboardSummaryService("business-1", "UTC", "none"));
    const response = await result.current();
    expect(analyticsCalls()).toEqual([]);
    expect(response.data.analytics).toBeNull();
    expect(response.data.productCount).toBe(2);
  });
});
