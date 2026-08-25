import { describe, expect, it } from "vitest";
import { buildDashboardViewModel } from "./dashboardViewModel";

const visits = Array.from({ length: 10 }, (_, index) => ({ date: `2026-08-${String(index + 1).padStart(2, "0")}`, views: index, approximate_unique_visitors: index }));

describe("buildDashboardViewModel", () => {
  it("genera siete días reales, métricas seguras y QR atribuido", () => {
    const catalogue = { id: "catalogue-1", name: "Carta real", is_published: true };
    const result = buildDashboardViewModel({ catalogues: [catalogue], selectedCatalogue: catalogue, analytics: { visits_over_time: visits, sources: [{ key: "qr", views: 4 }], summary: { menu_views: { value: 45 } } }, chartDays: 7, now: new Date(2026, 7, 10) });
    expect(result.chart).toHaveLength(7);
    expect(result.chart[0].date).toBe("2026-08-04");
    expect(result.metrics.monthlyViews).toBe(45);
    expect(result.metrics.qrScans).toBe(4);
    expect(result.metrics.products).toBeNull();
    expect(result.menus[0].views).toBe(45);
  });

  it("maneja ausencia de analíticas sin NaN ni cifras ficticias", () => {
    const result = buildDashboardViewModel({ catalogues: [], analytics: null });
    expect(result.metrics.monthlyViews).toBeNull();
    expect(result.chartTotal).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/12840|4291|Menú principal|Desayunos/);
  });
});
