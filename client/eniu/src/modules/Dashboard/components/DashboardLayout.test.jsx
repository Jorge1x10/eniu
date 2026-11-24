import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardNav from "./DashboardLayout";
import { getLastCatalogue, rememberCatalogue } from "../../Catalogue/utils/lastCatalogue";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  auth: { user: { name: "Jorge" }, isLoading: false },
  business: { selectedBusiness: { id: "business-1", name: "Café real" } },
}));

vi.mock("../../auth/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("../../Business/services/useBusiness", () => ({ useBusiness: () => mocks.business }));
vi.mock("../../Ordering/context/LiveOrdersContext", () => ({ useLiveOrdersContext: () => ({ pendingCount: 0 }) }));
vi.mock("../../Catalogue/services/catalogueService", () => ({ useCatalogueService: () => ({ list: mocks.list }) }));
vi.mock("../../Business/components/selectBusiness", () => ({ default: () => null }));
vi.mock("../../Business/components/CreateBusinessModal", () => ({ default: () => null }));

const MENU_SECTIONS = [
  ["Productos y categorías", "products"],
  ["Diseño", "templates"],
  ["Promociones", "promotions"],
  ["Analíticas", "analytics"],
];

function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function renderNav(path = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardNav />
      <Routes><Route path="*" element={<CurrentPath />} /></Routes>
    </MemoryRouter>
  );
}

const link = (name) => screen.getByRole("link", { name });

describe("DashboardNav", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.list.mockReset();
  });

  it("sin menú recordado, abre cada sección en el primer menú del negocio", async () => {
    mocks.list.mockResolvedValue({ ok: true, data: { catalogues: [{ id: "first" }, { id: "second" }] } });
    renderNav();

    await waitFor(() => expect(link("Analíticas")).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/first/analytics"));
    for (const [name, section] of MENU_SECTIONS) {
      expect(link(name)).toHaveAttribute("href", `/dashboard/businesses/business-1/catalogues/first/${section}`);
    }
    expect(getLastCatalogue("business-1")).toBe("first");

    await userEvent.click(link("Analíticas"));
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard/businesses/business-1/catalogues/first/analytics");
  });

  it("usa el menú recordado sin consultar la lista", () => {
    rememberCatalogue("business-1", "remembered");
    renderNav();

    expect(link("Analíticas")).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/remembered/analytics");
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("se actualiza cuando otra pantalla recuerda un menú", async () => {
    mocks.list.mockReturnValue(new Promise(() => {}));
    renderNav();
    expect(link("Analíticas")).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues");

    act(() => rememberCatalogue("business-1", "from-home"));
    expect(link("Analíticas")).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/from-home/analytics");
  });

  it("no pisa un menú elegido mientras se consultaba la lista", async () => {
    let resolve;
    mocks.list.mockReturnValue(new Promise((done) => { resolve = done; }));
    renderNav();

    act(() => rememberCatalogue("business-1", "chosen"));
    await act(async () => resolve({ ok: true, data: { catalogues: [{ id: "first" }] } }));
    expect(getLastCatalogue("business-1")).toBe("chosen");
    expect(link("Analíticas")).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/chosen/analytics");
  });

  it("cae a la lista de menús sólo cuando el negocio no tiene ninguno", async () => {
    mocks.list.mockResolvedValue({ ok: true, data: { catalogues: [] } });
    renderNav();

    await waitFor(() => expect(mocks.list).toHaveBeenCalled());
    for (const [name] of MENU_SECTIONS) {
      expect(link(name)).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues");
    }
    expect(getLastCatalogue("business-1")).toBeNull();
  });

  it("dentro de un menú usa el de la ruta y no consulta la lista", () => {
    renderNav("/dashboard/businesses/business-1/catalogues/in-route/products");

    expect(link("Analíticas")).toHaveAttribute("href", "/dashboard/businesses/business-1/catalogues/in-route/analytics");
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
