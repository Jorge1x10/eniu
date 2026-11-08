import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AnalitycsPage from "./AnalitycsPage";

const mocks = vi.hoisted(() => ({ getAnalytics: vi.fn(), getSummary: vi.fn(), allowAnalytics: true, analyticsSummary: false, businesses: [] }));
vi.mock("../services/analyticsService", () => ({ useAnalyticsService: () => mocks.getAnalytics, useAnalyticsSummaryService: () => mocks.getSummary }));
// El plan se simula para no montar toda la sesión: la página sólo consulta si lo incluye.
vi.mock("../../auth/hooks/usePlan", () => ({ usePlan: () => ({ limits: { allow_analytics: mocks.allowAnalytics, analytics_summary: mocks.analyticsSummary } }) }));
// La zona horaria del periodo sale del negocio, así que la página necesita la
// lista; se simula por lo mismo que el plan.
vi.mock("../../Business/services/useBusiness", () => ({ useBusiness: () => ({ businesses: mocks.businesses }) }));

const metric = (value, previous = 0, change = "new", percentage = null) => ({ value, previous_value: previous, percentage_change: percentage, change_status: change });
const data = {
  period: { from: "2026-08-01", to: "2026-08-07", timezone: "America/Mexico_City" }, comparison_period: { from: "2026-07-25", to: "2026-07-31" },
  summary: { menu_views: metric(12, 10, "increased", 20), approximate_unique_visitors: metric(8, 10, "decreased", -20), product_interactions: metric(4, 5, "decreased", -20), top_product: { name: "Latte", interactions: 3 }, busiest_day: { date: "2026-08-07", views: 12 }, busiest_hour: { label: "8:00 p. m.", views: 6 } },
  visits_over_time: [{ date: "2026-08-06", views: 0, approximate_unique_visitors: 0 }, { date: "2026-08-07", views: 12, approximate_unique_visitors: 8 }],
  top_products: [{ name: "Latte", category_name: "Bebidas", interactions: 3, is_available: true }], top_categories: [{ name: "Bebidas", selections: 2, percentage: 100 }],
  devices: [{ key: "mobile", label: "Celular", views: 12, percentage: 100 }], sources: [{ key: "qr", label: "Código QR", views: 12, percentage: 100 }],
};

function renderPage() { return render(<MemoryRouter initialEntries={["/dashboard/businesses/business-1/catalogues/catalogue-1/analytics"]}><Routes><Route path="/dashboard/businesses/:businessId/catalogues/:catalogueId/analytics" element={<AnalitycsPage />} /></Routes></MemoryRouter>); }

describe("AnalitycsPage", () => {
  beforeEach(() => { mocks.getAnalytics.mockReset(); mocks.getSummary.mockReset(); mocks.allowAnalytics = true; mocks.analyticsSummary = false; mocks.businesses = [{ id: "business-1", timezone: "Europe/Madrid" }]; });

  it("bloquea las analíticas cuando el plan no las incluye y no consulta al backend", async () => {
    mocks.allowAnalytics = false; renderPage();
    expect(await screen.findByText("Tu plan actual no incluye analíticas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Incluido en Esencial/ })).toBeInTheDocument();
    expect(mocks.getAnalytics).not.toHaveBeenCalled();
    expect(mocks.getSummary).not.toHaveBeenCalled();
  });

  it("muestra al plan gratuito sus visitas de 7 días y anuncia el informe completo", async () => {
    mocks.allowAnalytics = false; mocks.analyticsSummary = true;
    mocks.getSummary.mockResolvedValue({ ok: true, data: { period: data.period, comparison_period: data.comparison_period, summary: { menu_views: metric(12, 10, "increased", 20) }, visits_over_time: [{ date: "2026-08-06", views: 0 }, { date: "2026-08-07", views: 12 }] } });
    renderPage();
    expect(await screen.findByText("Aumentó 20% respecto al periodo anterior")).toBeInTheDocument();
    expect(within(screen.getByText("Visitas al menú").closest("article")).getByText("12")).toBeInTheDocument();
    expect(screen.getByText("El informe completo viene con Esencial")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Incluido en Esencial/ })).toBeInTheDocument();
    // El periodo lo fija el backend: sólo se manda la zona del negocio.
    expect(mocks.getSummary).toHaveBeenCalledWith("Europe/Madrid", expect.anything());
    expect(mocks.getAnalytics).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Últimos 30 días" })).not.toBeInTheDocument();
  });

  it("termina de cargar dentro de React Strict Mode, como en desarrollo", async () => {
    // StrictMode monta, desmonta y vuelve a montar: una bandera de "montado"
    // que sólo se apaga dejaba la página en el esqueleto para siempre.
    mocks.allowAnalytics = false; mocks.analyticsSummary = true;
    mocks.getSummary.mockResolvedValue({ ok: true, data: { period: data.period, comparison_period: data.comparison_period, summary: { menu_views: metric(12, 10, "increased", 20) }, visits_over_time: [{ date: "2026-08-07", views: 12 }] } });
    render(<StrictMode><MemoryRouter initialEntries={["/dashboard/businesses/business-1/catalogues/catalogue-1/analytics"]}><Routes><Route path="/dashboard/businesses/:businessId/catalogues/:catalogueId/analytics" element={<AnalitycsPage />} /></Routes></MemoryRouter></StrictMode>);
    expect(await screen.findByText("Aumentó 20% respecto al periodo anterior")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cargando analíticas")).not.toBeInTheDocument();

    mocks.allowAnalytics = true; mocks.getAnalytics.mockResolvedValue({ ok: true, data });
    render(<StrictMode><MemoryRouter initialEntries={["/dashboard/businesses/business-1/catalogues/catalogue-1/analytics"]}><Routes><Route path="/dashboard/businesses/:businessId/catalogues/:catalogueId/analytics" element={<AnalitycsPage />} /></Routes></MemoryRouter></StrictMode>);
    expect((await screen.findAllByText("Latte")).length).toBeGreaterThan(0);
  });

  it("muestra carga y resultados agregados sin Infinity", async () => {
    mocks.getAnalytics.mockResolvedValue({ ok: true, data }); renderPage();
    expect(screen.getByLabelText("Cargando analíticas")).toBeInTheDocument();
    expect((await screen.findAllByText("Latte")).length).toBeGreaterThan(0);
    expect(screen.getByText("Aumentó 20% respecto al periodo anterior")).toBeInTheDocument();
    expect(screen.getByText("Disminuyó 20% respecto al periodo anterior")).toBeInTheDocument();
    expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
    // La zona es la del negocio, no una escrita a mano: un local de Madrid
    // corta sus días a medianoche en Madrid.
    await waitFor(() => expect(mocks.getAnalytics.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({ timezone: "Europe/Madrid" })));
  });

  it("cambia presets y espera Aplicar periodo para fechas personalizadas", async () => {
    mocks.getAnalytics.mockResolvedValue({ ok: true, data }); const user = userEvent.setup(); renderPage();
    await screen.findAllByText("Latte"); const calls = mocks.getAnalytics.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Últimos 30 días" }));
    await waitFor(() => expect(mocks.getAnalytics.mock.calls.length).toBeGreaterThan(calls));
    const afterPreset = mocks.getAnalytics.mock.calls.length;
    // Relativa a hoy y no escrita a mano: una fecha fija termina quedando a más
    // de 90 días y la página la rechaza con razón, sin pedir nada.
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
    const from = screen.getByLabelText("Desde"); await user.clear(from); await user.type(from, tenDaysAgo);
    expect(mocks.getAnalytics).toHaveBeenCalledTimes(afterPreset);
    await user.click(screen.getByRole("button", { name: "Aplicar periodo" }));
    await waitFor(() => expect(mocks.getAnalytics.mock.calls.length).toBeGreaterThan(afterPreset));
  });

  it("muestra error, permite reintentar y maneja catálogo sin datos", async () => {
    const empty = { ...data, summary: { ...data.summary, menu_views: metric(0, 0, "unchanged", 0) }, top_products: [], top_categories: [] };
    mocks.getAnalytics.mockResolvedValueOnce({ ok: false, status: 500, data: null }).mockResolvedValueOnce({ ok: true, data: empty });
    const user = userEvent.setup(); renderPage();
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Todavía no hay suficientes visitas para mostrar analíticas en este periodo.")).toBeInTheDocument();
  });
});
