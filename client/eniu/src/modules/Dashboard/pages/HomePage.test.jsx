import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "./HomePage";

const mocks = vi.hoisted(() => ({
  loadSummary: vi.fn(), create: vi.fn(), navigate: vi.fn(),
  auth: { user: { name: "Jorge" } },
  business: { selectedBusiness: { id: "business-1", name: "Café real" }, isLoadingBusinesses: false },
}));

vi.mock("../../auth/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("../../Business/services/useBusiness", () => ({ useBusiness: () => mocks.business }));
vi.mock("../services/dashboardSummaryService", () => ({ useDashboardSummaryService: () => mocks.loadSummary }));
vi.mock("../../Catalogue/services/catalogueService", () => ({ useCatalogueService: () => ({ create: mocks.create }) }));
vi.mock("react-router", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => mocks.navigate }));
vi.mock("../../Business/components/CreateBusinessModal", () => ({ default: ({ isOpen }) => isOpen ? <div role="dialog">Crear negocio</div> : null }));
vi.mock("../../Catalogue/components/CreateCatalogueModal", () => ({ default: () => <div role="dialog">Formulario para crear menú</div> }));

const catalogue = { id: "catalogue-real", name: "Carta del café", description: null, is_published: true, updated_at: "2026-08-07T10:00:00Z" };
const analytics = {
  summary: { menu_views: { value: 12 } },
  visits_over_time: [
    { date: "2026-08-01", views: 0, approximate_unique_visitors: 0 }, { date: "2026-08-02", views: 1, approximate_unique_visitors: 1 },
    { date: "2026-08-03", views: 2, approximate_unique_visitors: 2 }, { date: "2026-08-04", views: 0, approximate_unique_visitors: 0 },
    { date: "2026-08-05", views: 3, approximate_unique_visitors: 2 }, { date: "2026-08-06", views: 2, approximate_unique_visitors: 2 },
    { date: "2026-08-07", views: 4, approximate_unique_visitors: 3 },
  ],
  sources: [{ key: "qr", label: "Código QR", views: 5, percentage: 41.7 }],
};
const success = { ok: true, data: { catalogues: [catalogue], selectedCatalogue: catalogue, analytics } };

function renderPage({ strict = false } = {}) {
  const page = <MemoryRouter><HomePage /></MemoryRouter>;
  return render(strict ? <StrictMode>{page}</StrictMode> : page);
}

describe("HomePage", () => {
  beforeEach(() => {
    mocks.loadSummary.mockReset(); mocks.navigate.mockReset();
    mocks.auth = { user: { name: "Jorge" } };
    mocks.business = { selectedBusiness: { id: "business-1", name: "Café real" }, isLoadingBusinesses: false };
    localStorage.clear();
  });

  it("muestra skeleton y saluda con el usuario autenticado", async () => {
    let resolve; mocks.loadSummary.mockReturnValue(new Promise((done) => { resolve = done; }));
    renderPage(); expect(screen.getByLabelText("Cargando resumen del dashboard")).toBeInTheDocument();
    resolve(success);
    expect(await screen.findByRole("heading", { name: "Hola, Jorge 👋" })).toBeInTheDocument();
  });

  it("termina de cargar correctamente dentro de React Strict Mode", async () => {
    mocks.loadSummary.mockResolvedValue(success);
    renderPage({ strict: true });
    expect(await screen.findByRole("heading", { name: "Hola, Jorge 👋" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Cargando resumen del dashboard")).not.toBeInTheDocument();
  });

  it("renderiza métricas reales, siete días y no usa demostraciones de Figma", async () => {
    mocks.loadSummary.mockResolvedValue(success); renderPage();
    await screen.findByRole("heading", { name: "Hola, Jorge 👋" });
    const qrCard = screen.getByText("Escaneos QR").closest("article");
    expect(within(qrCard).getByText("5")).toBeInTheDocument();
    expect(screen.getByLabelText(/Gráfica de vistas.*2026-08-01: 0.*2026-08-07: 4/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Periodo de la gráfica" })).toHaveValue("7");
    expect(screen.getByText("Carta del café")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("12,840"); expect(document.body).not.toHaveTextContent("4,291"); expect(document.body).not.toHaveTextContent("Desayunos");
    expect(screen.getByText("Todavía no hay actividad reciente.")).toBeInTheDocument();
  });

  it("muestra error y reintenta", async () => {
    mocks.loadSummary.mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce(success);
    const user = userEvent.setup(); renderPage();
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Hola, Jorge 👋" })).toBeInTheDocument();
    expect(mocks.loadSummary).toHaveBeenCalledTimes(2);
  });

  it("muestra el estado sin negocio y permite abrir su creación", async () => {
    mocks.business = { selectedBusiness: null, isLoadingBusinesses: false };
    const user = userEvent.setup(); renderPage();
    await user.click(await screen.findByRole("button", { name: "Crear negocio" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Crear negocio");
    expect(mocks.loadSummary).not.toHaveBeenCalled();
  });

  it("muestra menús vacíos y abre el flujo real de creación", async () => {
    mocks.loadSummary.mockResolvedValue({ ok: true, data: { catalogues: [], selectedCatalogue: null, analytics: null } });
    const user = userEvent.setup(); renderPage();
    await screen.findByText("Todavía no tienes menús.");
    await user.click(screen.getByRole("button", { name: "Crear el primero" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Formulario para crear menú");
  });

  it("conecta las acciones a rutas SPA del menú elegido", async () => {
    mocks.loadSummary.mockResolvedValue(success); renderPage(); await screen.findByText("Carta del café");
    expect(screen.getByRole("link", { name: /Agregar producto/ })).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/catalogue-real/products");
    expect(screen.getByRole("link", { name: /Descargar QR/ })).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/catalogue-real/qr");
    expect(screen.getByRole("link", { name: /Ver analíticas/ })).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/catalogue-real/analytics");
    await waitFor(() => expect(mocks.loadSummary).toHaveBeenCalledTimes(1));
  });
});
