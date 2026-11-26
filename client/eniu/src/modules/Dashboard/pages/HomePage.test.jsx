import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "./HomePage";

const mocks = vi.hoisted(() => ({
  loadSummary: vi.fn(), create: vi.fn(), navigate: vi.fn(),
  auth: { user: { name: "Jorge" } },
  business: { selectedBusiness: { id: "business-1", name: "Café real", currency: "MXN" }, isLoadingBusinesses: false },
  ordering: {},
  live: {},
}));

vi.mock("../../auth/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("../../Business/services/useBusiness", () => ({ useBusiness: () => mocks.business }));
vi.mock("../services/dashboardSummaryService", async (importOriginal) => ({ ...(await importOriginal()), useDashboardSummaryService: () => mocks.loadSummary }));
vi.mock("../../Catalogue/services/catalogueService", () => ({ useCatalogueService: () => ({ create: mocks.create }) }));
vi.mock("../../Ordering/services/orderingService", async (importOriginal) => ({ ...(await importOriginal()), useOrderingService: () => mocks.ordering }));
vi.mock("../../Ordering/context/LiveOrdersContext", () => ({ useLiveOrdersContext: () => mocks.live }));
vi.mock("react-router", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => mocks.navigate }));
vi.mock("../../Business/components/CreateBusinessModal", () => ({ default: ({ isOpen }) => isOpen ? <div role="dialog">Crear negocio</div> : null }));
vi.mock("../../Catalogue/components/CreateCatalogueModal", () => ({ default: () => <div role="dialog">Formulario para crear menú</div> }));

const catalogue = { id: "catalogue-real", name: "Carta del café", description: null, is_published: true, public_slug: "cafe-real", updated_at: "2026-08-07T10:00:00Z" };
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
const success = { ok: true, data: { catalogues: [catalogue], selectedCatalogue: catalogue, analytics, productCount: 3 } };

function pendingAccount() {
  return {
    id: "account-4", status: "open", table: { id: "table-4", number: 4, name: null },
    opened_at: "2026-11-22T20:00:00Z", total: "120.00", pending_orders: 1,
    orders: [
      { id: "o-accepted", status: "received", diner_name: "Ana", created_at: "2026-11-22T20:01:00Z", total: "120.00", items: [{ id: "i-1", name: "Pan", quantity: 1, line_total: "120.00", notes: null, is_cancelled: false }] },
      { id: "o-new", status: "pending", diner_name: "David", created_at: "2026-11-22T20:05:00Z", total: "110.00", items: [{ id: "i-2", name: "Latte", quantity: 2, line_total: "110.00", notes: "Con avena", is_cancelled: false }] },
    ],
  };
}

const tables = [
  { id: "table-4", number: 4, name: null, is_active: true },
  { id: "table-5", number: 5, name: null, is_active: true },
  { id: "table-9", number: 9, name: null, is_active: false },
];

function renderPage({ strict = false } = {}) {
  const page = <MemoryRouter><HomePage /></MemoryRouter>;
  return render(strict ? <StrictMode>{page}</StrictMode> : page);
}

describe("HomePage", () => {
  beforeEach(() => {
    mocks.loadSummary.mockReset(); mocks.navigate.mockReset();
    mocks.auth = { user: { name: "Jorge" } };
    mocks.business = { selectedBusiness: { id: "business-1", name: "Café real", currency: "MXN" }, isLoadingBusinesses: false };
    mocks.ordering = {
      listTables: vi.fn(async () => ({ ok: true, data: { tables } })),
      setOrdering: vi.fn(async () => ({ ok: true })),
      setOrderStatus: vi.fn(async () => ({ ok: true })),
    };
    mocks.live = { accounts: [], ordering: { enabled: true, reason: null }, refresh: vi.fn(async () => {}) };
    localStorage.clear();
  });

  it("muestra skeleton y saluda con el usuario autenticado", async () => {
    let resolve; mocks.loadSummary.mockReturnValue(new Promise((done) => { resolve = done; }));
    renderPage(); expect(screen.getByLabelText("Cargando resumen del dashboard")).toBeInTheDocument();
    resolve(success);
    expect(await screen.findByRole("heading", { name: "Hola, Jorge" })).toBeInTheDocument();
  });

  it("termina de cargar correctamente dentro de React Strict Mode", async () => {
    mocks.loadSummary.mockResolvedValue(success);
    renderPage({ strict: true });
    expect(await screen.findByRole("heading", { name: "Hola, Jorge" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Cargando resumen del dashboard")).not.toBeInTheDocument();
  });

  it("renderiza los KPI con datos reales y sin crear menú en el encabezado", async () => {
    mocks.live.accounts = [pendingAccount()];
    mocks.loadSummary.mockResolvedValue(success); renderPage();
    await screen.findByRole("heading", { name: "Hola, Jorge" });

    const views = screen.getByText("Vistas en 7 días").closest("article");
    expect(within(views).getByText("12")).toBeInTheDocument();
    const products = screen.getByText("Productos").closest("article");
    expect(products).toHaveTextContent("3de 40");
    expect(within(products).getByText("Límite por menú de tu plan")).toBeInTheDocument();
    const open = screen.getByText("Cuentas abiertas").closest("article");
    expect(await within(open).findByText("de 2 mesas")).toBeInTheDocument();
    expect(within(open).getByText(/120\.00 por cobrar/)).toBeInTheDocument();
    expect(screen.getByText("Pedidos en curso").closest("article")).toHaveTextContent("1 por aceptar");
    expect(screen.queryByRole("button", { name: /Crear menú/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver menú como cliente/ })).toHaveAttribute("href", "/m/cafe-real");
    expect(document.body).not.toHaveTextContent("12,840"); expect(document.body).not.toHaveTextContent("Desayunos");
  });

  it("acepta un pedido desde Inicio", async () => {
    mocks.live.accounts = [pendingAccount()];
    mocks.loadSummary.mockResolvedValue(success); renderPage();
    const card = (await screen.findByRole("heading", { name: "1 pedido por aceptar" })).closest("section");
    expect(within(card).getByText("↳ Con avena")).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Aceptar el pedido de David, mesa 4" }));
    expect(mocks.ordering.setOrderStatus).toHaveBeenCalledWith("o-new", "received");
    expect(mocks.live.refresh).toHaveBeenCalledWith({ force: true });
  });

  it("dice que todo está al día cuando no hay pendientes y muestra las mesas", async () => {
    mocks.loadSummary.mockResolvedValue(success); renderPage();
    expect(await screen.findByText("Todo al día. Los pedidos nuevos aparecen aquí con un sonido.")).toBeInTheDocument();
    expect(await screen.findByLabelText("Mesa 4, libre")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mesa 9/)).not.toBeInTheDocument();
  });

  it("pausa los pedidos desde el encabezado", async () => {
    mocks.loadSummary.mockResolvedValue(success); renderPage();
    await userEvent.click(await screen.findByRole("switch", { name: "Recibiendo pedidos" }));
    expect(mocks.ordering.setOrdering).toHaveBeenCalledWith(false);
  });

  it("marca hoy en la gráfica y explica cómo empezar cuando no hay vistas", async () => {
    mocks.loadSummary.mockResolvedValue(success); renderPage();
    expect(await screen.findByLabelText(/Gráfica de vistas.*2026-08-01: 0.*2026-08-07: 4/)).toBeInTheDocument();
    expect(screen.getByText("Hoy")).toBeInTheDocument();
  });

  it("sin vistas no dibuja barras vacías", async () => {
    const empty = { ...analytics, visits_over_time: analytics.visits_over_time.map((point) => ({ ...point, views: 0 })) };
    mocks.loadSummary.mockResolvedValue({ ok: true, data: { ...success.data, analytics: empty } }); renderPage();
    expect(await screen.findByText("Pon el QR en tus mesas para empezar a medir.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Gráfica de vistas/ })).not.toBeInTheDocument();
  });

  it("muestra error y reintenta", async () => {
    mocks.loadSummary.mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce(success);
    const user = userEvent.setup(); renderPage();
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Hola, Jorge" })).toBeInTheDocument();
    expect(mocks.loadSummary).toHaveBeenCalledTimes(2);
  });

  it("muestra el estado sin negocio y permite abrir su creación", async () => {
    mocks.business = { selectedBusiness: null, isLoadingBusinesses: false };
    const user = userEvent.setup(); renderPage();
    await user.click(await screen.findByRole("button", { name: "Crear negocio" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Crear negocio");
    expect(mocks.loadSummary).not.toHaveBeenCalled();
  });

  it("sin menús ofrece crear el primero", async () => {
    mocks.loadSummary.mockResolvedValue({ ok: true, data: { catalogues: [], selectedCatalogue: null, analytics: null } });
    const user = userEvent.setup(); renderPage();
    await user.click(await screen.findByRole("button", { name: "Crea tu primer menú" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Formulario para crear menú");
  });

  it("conecta los atajos a rutas SPA del menú elegido", async () => {
    mocks.loadSummary.mockResolvedValue(success); renderPage(); await screen.findByRole("heading", { name: "Atajos" });
    expect(screen.getByRole("link", { name: /Agregar producto/ })).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/catalogue-real/products");
    expect(screen.getByRole("link", { name: /Imprimir QR de mesas/ })).toHaveAttribute("href", "/dashboard/mesas");
    expect(screen.getByRole("link", { name: /Marcar agotados/ })).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/catalogue-real/products");
    await waitFor(() => expect(mocks.loadSummary).toHaveBeenCalledTimes(1));
  });
});
