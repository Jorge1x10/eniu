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

  it("con el resumen del gratuito cuenta los 7 días y no los presenta como del mes", () => {
    const week = visits.slice(-7).map(({ date, views }) => ({ date, views }));
    const result = buildDashboardViewModel({ catalogues: [], analytics: { visits_over_time: week, summary: { menu_views: { value: 42 } } }, analyticsScope: "summary", now: new Date(2026, 7, 10) });
    expect(result.metrics.weeklyViews).toBe(42);
    expect(result.metrics.monthlyViews).toBeNull();
    expect(result.metrics.qrScans).toBeNull();
    expect(result.chart).toHaveLength(7);
  });

  it("cuenta los productos sólo del menú elegido, que es el único que se consulta", () => {
    const selected = { id: "catalogue-1", name: "Carta", is_published: true };
    const other = { id: "catalogue-2", name: "Bebidas", is_published: true };
    const result = buildDashboardViewModel({ catalogues: [selected, other], selectedCatalogue: selected, productCount: 12 });
    expect(result.metrics.products).toBe(12);
    expect(result.menus.find((menu) => menu.id === "catalogue-1").productCount).toBe(12);
    expect(result.menus.find((menu) => menu.id === "catalogue-2").productCount).toBeNull();
  });

  it("maneja ausencia de analíticas sin NaN ni cifras ficticias", () => {
    const result = buildDashboardViewModel({ catalogues: [], analytics: null });
    expect(result.metrics.monthlyViews).toBeNull();
    expect(result.chartTotal).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/12840|4291|Menú principal|Desayunos/);
  });
});
