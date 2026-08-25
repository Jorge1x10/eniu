import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicMenuPage from "./PublicMenuPage";

const mocks = vi.hoisted(() => ({ getPublicMenu: vi.fn(), sendAnalyticsEvents: vi.fn() }));

vi.mock("../services/publicMenuService", () => ({ getPublicMenu: mocks.getPublicMenu, sendAnalyticsEvents: mocks.sendAnalyticsEvents }));
vi.mock("../../Templates/templates/templateRegistry", () => ({
  resolveTemplate: (key) => function TestTemplate({ catalogue, products }) {
    return <div data-testid="public-template" data-template={key}>{catalogue.name}:{products.map((product) => `${product.name}-${product.is_available ? "ok" : "Agotado"}`).join(",")}</div>;
  },
}));

const menu = {
  business: { name: "ENIU", description: null },
  catalogue: { name: "Carta", description: null },
  template: { key: "elegant", theme: {} },
  categories: [],
  uncategorized_products: [{ name: "Café", price: "42.00", is_available: false }],
};

function renderPage(entry = "/m/menu-publico", strict = false) {
  const content = <MemoryRouter initialEntries={[entry]}>
    <Routes><Route path="/m/:publicSlug" element={<PublicMenuPage />} /></Routes>
  </MemoryRouter>;
  return render(
    strict ? <StrictMode>{content}</StrictMode> : content
  );
}

describe("PublicMenuPage", () => {
  beforeEach(() => { mocks.getPublicMenu.mockReset(); mocks.sendAnalyticsEvents.mockReset(); sessionStorage.clear(); localStorage.clear(); });

  it("carga por slug sin dashboard y usa la plantilla guardada", async () => {
    mocks.getPublicMenu.mockResolvedValue({ ok: true, data: { menu } });
    renderPage();
    expect(screen.getByText("Cargando menú...")).toBeInTheDocument();
    const template = await screen.findByTestId("public-template");
    expect(mocks.getPublicMenu).toHaveBeenCalledWith("menu-publico", expect.any(Object));
    expect(template).toHaveAttribute("data-template", "elegant");
    expect(template).toHaveTextContent("Café-Agotado");
    expect(screen.queryByText("URL y código QR")).not.toBeInTheDocument();
  });

  it("no revela si el slug no existe o fue despublicado", async () => {
    mocks.getPublicMenu.mockResolvedValue({ ok: false, status: 404, data: null });
    renderPage();
    expect(await screen.findByText("Este menú no está disponible.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("muestra error de red y permite reintentar", async () => {
    mocks.getPublicMenu
      .mockResolvedValueOnce({ ok: false, status: 0, data: null })
      .mockResolvedValueOnce({ ok: true, data: { menu } });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByTestId("public-template")).toBeInTheDocument();
  });

  it("registra una sola visita anónima incluso con Strict Mode", async () => {
    mocks.getPublicMenu.mockResolvedValue({ ok: true, data: { menu } });
    renderPage("/m/menu-publico?src=qr", true);
    await screen.findByTestId("public-template");
    await waitFor(() => expect(mocks.sendAnalyticsEvents).toHaveBeenCalledTimes(1), { timeout: 1200 });
    const [slug, events] = mocks.sendAnalyticsEvents.mock.calls[0];
    expect(slug).toBe("menu-publico");
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(expect.objectContaining({ type: "menu_view", source: "qr", target_key: null }));
    expect(JSON.stringify(events)).not.toMatch(/jwt|businessId|catalogueId|email/i);
  });

  it("no registra aperturas iniciadas desde el dashboard", async () => {
    mocks.getPublicMenu.mockResolvedValue({ ok: true, data: { menu } });
    renderPage("/m/menu-publico?src=dashboard");
    await screen.findByTestId("public-template");
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    expect(mocks.sendAnalyticsEvents).not.toHaveBeenCalled();
  });
});
