import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicationPage from "./PublicationPage";

const mocks = vi.hoisted(() => ({
  getPublication: vi.fn(),
  updatePublication: vi.fn(),
  getPreview: vi.fn(),
  toCanvas: vi.fn(() => Promise.resolve()),
  toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,qr")),
}));

vi.mock("../../Business/services/useBusiness", () => ({
  useBusiness: () => ({ businesses: [], selectedBusiness: null, selectBusiness: vi.fn() }),
}));
vi.mock("../services/publicationService", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    usePublicationService: () => ({
      getPublication: mocks.getPublication,
      updatePublication: mocks.updatePublication,
      getPreview: mocks.getPreview,
    }),
  };
});
vi.mock("qrcode", () => ({ default: { toCanvas: mocks.toCanvas, toDataURL: mocks.toDataURL } }));
vi.mock("../../Templates/components/MobilePreviewFrame", () => ({
  default: ({ children }) => <div data-testid="mobile-preview">{children}</div>,
}));
vi.mock("../../Templates/templates/templateRegistry", () => ({
  resolveTemplate: () => function TestTemplate({ products }) {
    return <div data-testid="menu-template">{products.map((product) => product.name).join(",")}</div>;
  },
}));

const previewResponse = {
  ok: true,
  data: {
    menu: {
      business: { name: "Café ENIU", description: null },
      catalogue: { name: "Menú", description: null },
      template: { key: "modern", theme: {} },
      categories: [],
      uncategorized_products: [{ name: "Té", price: "30.00", is_available: false }],
    },
  },
};

const unpublished = {
  is_published: false,
  public_slug: null,
  public_url: null,
  published_at: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/businesses/business-1/catalogues/catalogue-1/qr"]}>
      <Routes>
        <Route path="/dashboard/businesses/:businessId/catalogues/:catalogueId/qr" element={<PublicationPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PublicationPage", () => {
  beforeEach(() => {
    mocks.getPublication.mockResolvedValue({ ok: true, data: { publication: unpublished } });
    mocks.getPreview.mockResolvedValue(previewResponse);
    mocks.updatePublication.mockReset();
    mocks.toCanvas.mockClear();
    mocks.toDataURL.mockClear();
  });

  it("muestra carga, menú no publicado y la vista previa", async () => {
    renderPage();
    expect(screen.getByLabelText("Cargando publicación")).toBeInTheDocument();
    expect(await screen.findByText("Menú no publicado")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-preview")).toHaveTextContent("Té");
    expect(screen.queryByRole("button", { name: "Descargar QR" })).not.toBeInTheDocument();
  });

  it("publica sin recargar y genera el QR solamente con la URL pública", async () => {
    const published = {
      is_published: true,
      public_slug: "cafe-eniu-menu",
      public_url: "https://eniu.app/m/cafe-eniu-menu",
      published_at: "2026-08-06T18:00:00Z",
    };
    mocks.updatePublication.mockResolvedValue({ ok: true, data: { publication: published } });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Publicar menú" }));

    expect(mocks.updatePublication).toHaveBeenCalledWith(true);
    expect(await screen.findByText("El menú se publicó correctamente.")).toBeInTheDocument();
    await waitFor(() => expect(mocks.toCanvas).toHaveBeenCalled());
    expect(mocks.toCanvas.mock.calls.at(-1)[1]).toBe(`${published.public_url}?src=qr`);
    expect(mocks.toCanvas.mock.calls.at(-1)[1]).not.toMatch(/catalogue-1|jwt/i);
  });

  it("conserva el estado anterior y muestra error si publicar falla", async () => {
    mocks.updatePublication.mockResolvedValue({ ok: false, status: 500, data: null });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Publicar menú" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cambiar el estado del menú.");
    expect(screen.getByText("Menú no publicado")).toBeInTheDocument();
  });

  it("copia la URL y descarga un PNG de 1024 px con nombre sanitizado", async () => {
    const published = {
      is_published: true,
      public_slug: "menu-seguro",
      public_url: "https://eniu.app/m/menu-seguro",
      published_at: "2026-08-06T18:00:00Z",
    };
    mocks.getPublication.mockResolvedValue({ ok: true, data: { publication: published } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Copiar URL" }));
    expect(writeText).toHaveBeenCalledWith(`${published.public_url}?src=copy`);
    expect(screen.getByRole("status")).toHaveTextContent("URL copiada al portapapeles.");

    await user.click(screen.getByRole("button", { name: "Descargar QR" }));
    expect(mocks.toDataURL).toHaveBeenCalledWith(`${published.public_url}?src=qr`, expect.objectContaining({ width: 1024, margin: 4 }));
    expect(click).toHaveBeenCalledOnce();
  });

  it("permite reintentar tras un error de carga", async () => {
    mocks.getPublication
      .mockResolvedValueOnce({ ok: false, status: 403, data: null })
      .mockResolvedValueOnce({ ok: true, data: { publication: unpublished } });
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes permiso");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Menú no publicado")).toBeInTheDocument();
  });
});
