import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TablesPage from "./TablesPage";

const mocks = vi.hoisted(() => ({ service: {}, listCatalogues: vi.fn() }));

vi.mock("../../Business/services/useBusiness", () => ({
  useBusiness: () => ({ selectedBusiness: { id: "business-1", name: "Café Luna" }, isLoadingBusinesses: false }),
}));
vi.mock("../../Catalogue/services/catalogueService", () => ({
  useCatalogueService: () => ({ list: mocks.listCatalogues }),
}));
vi.mock("../services/orderingService", async (importOriginal) => ({
  ...(await importOriginal()),
  useOrderingService: () => mocks.service,
}));
// jsdom no dibuja en canvas; lo que importa aquí es a qué URL apunta el QR.
vi.mock("../components/TableQr", () => ({ default: ({ url, label }) => <span role="img" aria-label={label} data-url={url} /> }));

const table4 = {
  id: "t-4", number: 4, name: "Terraza", catalogue_id: "c-1", is_active: true, catalogue_published: true,
  qr_url: "https://menu.eniu.app/m/cafe-luna/mesa/abc123",
};

function renderPage() {
  return render(<MemoryRouter><TablesPage /></MemoryRouter>);
}

describe("TablesPage", () => {
  beforeEach(() => {
    mocks.listCatalogues.mockResolvedValue({ ok: true, data: { catalogues: [{ id: "c-1", name: "Carta" }] } });
    mocks.service = {
      listTables: vi.fn(async () => ({ ok: true, data: { tables: [table4] } })),
      createTable: vi.fn(async () => ({ ok: true, data: {} })),
      updateTable: vi.fn(async () => ({ ok: true, data: {} })),
      deleteTable: vi.fn(async () => ({ ok: true, data: {} })),
      regenerateQr: vi.fn(async () => ({ ok: true, data: {} })),
    };
  });

  it("muestra cada mesa con el QR que abre su menú", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Mesa 4 · Terraza" })).toBeInTheDocument();
    expect(screen.getByText("Carta")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR de Mesa 4 · Terraza" })).toHaveAttribute("data-url", table4.qr_url);
  });

  it("avisa que el QR no funciona hasta publicar el menú", async () => {
    mocks.service.listTables.mockResolvedValue({ ok: true, data: { tables: [{ ...table4, qr_url: null, catalogue_published: false }] } });
    renderPage();
    expect(await screen.findByText("Publica su menú para que el QR funcione.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar QR" })).toBeDisabled();
  });

  it("crea una mesa con el siguiente número sugerido", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Agregar mesas" }));
    expect(screen.getByLabelText("Número de mesa")).toHaveValue(5);
    await userEvent.type(screen.getByLabelText("Nombre (opcional)"), "Barra");
    await userEvent.click(screen.getByRole("button", { name: "Crear mesa" }));

    expect(mocks.service.createTable).toHaveBeenCalledWith({ number: 5, name: "Barra", catalogue_id: "c-1" });
    expect(await screen.findByText("La mesa se creó.")).toBeInTheDocument();
  });

  it("crea varias mesas a la vez y dice cuáles ya existían", async () => {
    mocks.service.createTable.mockImplementation(async ({ number }) => (
      number === 4 ? { ok: false, status: 409, data: { code: "duplicate_number" } } : { ok: true, data: {} }
    ));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Agregar mesas" }));
    await userEvent.click(screen.getByRole("radio", { name: "Varias mesas" }));
    await userEvent.clear(screen.getByLabelText("Desde la mesa"));
    await userEvent.type(screen.getByLabelText("Desde la mesa"), "3");
    await userEvent.clear(screen.getByLabelText("Hasta la mesa"));
    await userEvent.type(screen.getByLabelText("Hasta la mesa"), "6");
    await userEvent.click(screen.getByRole("button", { name: "Crear mesas" }));

    expect(mocks.service.createTable.mock.calls.map(([data]) => data.number)).toEqual([3, 4, 5, 6]);
    expect(await screen.findByText("Se crearon 3 mesas. Ya existían: 4.")).toBeInTheDocument();
  });

  it("rechaza un rango al revés sin llamar al servidor", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Agregar mesas" }));
    await userEvent.click(screen.getByRole("radio", { name: "Varias mesas" }));
    await userEvent.clear(screen.getByLabelText("Desde la mesa"));
    await userEvent.type(screen.getByLabelText("Desde la mesa"), "9");
    await userEvent.clear(screen.getByLabelText("Hasta la mesa"));
    await userEvent.type(screen.getByLabelText("Hasta la mesa"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Crear mesas" }));

    expect(screen.getByRole("alert")).toHaveTextContent("la primera mesa no puede ser mayor que la última");
    expect(mocks.service.createTable).not.toHaveBeenCalled();
  });

  it("pide confirmación antes de cambiar el QR impreso", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Cambiar el QR de Mesa 4 · Terraza" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("El QR impreso dejará de funcionar");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cambiar QR" }));
    expect(mocks.service.regenerateQr).toHaveBeenCalledWith("t-4");
  });

  it("explica por qué no se puede borrar una mesa con la cuenta abierta", async () => {
    mocks.service.deleteTable.mockResolvedValue({
      ok: false, status: 409, data: { code: "account_open", message: "Cierra la cuenta de la mesa antes de borrarla" },
    });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar Mesa 4 · Terraza" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar mesa" }));
    expect(await within(screen.getByRole("alertdialog")).findByRole("alert")).toHaveTextContent("Cierra la cuenta de la mesa antes de borrarla");
  });
});
