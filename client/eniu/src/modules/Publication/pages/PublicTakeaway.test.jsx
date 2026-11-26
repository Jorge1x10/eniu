import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicMenuPage from "./PublicMenuPage";

const mocks = vi.hoisted(() => ({
  getPublicMenu: vi.fn(),
  getTakeaway: vi.fn(),
  sendTakeawayOrder: vi.fn(),
  getMyTakeawayOrders: vi.fn(),
  getTable: vi.fn(),
}));

vi.mock("../services/publicMenuService", () => ({ getPublicMenu: mocks.getPublicMenu, sendAnalyticsEvents: vi.fn() }));
vi.mock("../ordering/dinerService", () => ({
  getTable: mocks.getTable,
  sendOrder: vi.fn(),
  getMyOrders: vi.fn(),
  getTableAccount: vi.fn(),
  getTakeaway: mocks.getTakeaway,
  sendTakeawayOrder: mocks.sendTakeawayOrder,
  getMyTakeawayOrders: mocks.getMyTakeawayOrders,
}));

const menu = (takeaway = true) => ({
  business: { name: "Café Luna", currency: "MXN" },
  catalogue: { name: "Carta" },
  template: { key: "modern", theme: {} },
  ordering: { takeaway },
  categories: [{
    name: "Bebidas", tracking_key: "cat-bebidas",
    products: [{ name: "Latte", price: "55.00", is_available: true, tracking_key: "p-latte" }],
  }],
  uncategorized_products: [],
});

function renderPage(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/m/:publicSlug" element={<PublicMenuPage />} />
        <Route path="/m/:publicSlug/para-llevar" element={<PublicMenuPage takeaway />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Pedir para llevar", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    localStorage.clear();
    sessionStorage.clear();
    mocks.getPublicMenu.mockResolvedValue({ ok: true, status: 200, data: { menu: menu() } });
    mocks.getTakeaway.mockResolvedValue({ ok: true, status: 200, data: { ordering: { enabled: true } } });
    mocks.getMyTakeawayOrders.mockResolvedValue({ ok: true, status: 200, data: { orders: [] } });
  });

  it("el menú sin mesa ofrece pedir para llevar si el negocio lo tiene activo", async () => {
    renderPage("/m/cafe-luna");
    const link = await screen.findByRole("link", { name: "Pedir para llevar" });
    expect(link).toHaveAttribute("href", "/m/cafe-luna/para-llevar");
    expect(mocks.getTakeaway).not.toHaveBeenCalled();
  });

  it("sin pedidos para llevar, el menú se ve como siempre", async () => {
    mocks.getPublicMenu.mockResolvedValue({ ok: true, status: 200, data: { menu: menu(false) } });
    renderPage("/m/cafe-luna");
    await screen.findByRole("heading", { name: "Carta" });
    expect(screen.queryByRole("link", { name: "Pedir para llevar" })).not.toBeInTheDocument();
  });

  it("pide nombre y teléfono, y manda el pedido para llevar", async () => {
    const sent = {
      status: "pending", diner_name: "David", created_at: "2026-11-26T20:05:00Z", idempotency_key: "k",
      total: "55.00", items: [{ name: "Latte", quantity: 1, line_total: "55.00", notes: null, is_cancelled: false }],
      account: { status: "open", closed_at: null, total: "0.00" },
    };
    mocks.sendTakeawayOrder.mockImplementation(async () => {
      mocks.getMyTakeawayOrders.mockResolvedValue({ ok: true, status: 200, data: { orders: [sent] } });
      return { ok: true, status: 201, data: { order: sent } };
    });
    renderPage("/m/cafe-luna/para-llevar");

    const welcome = await screen.findByRole("dialog", { name: "Pide para llevar" });
    await userEvent.type(within(welcome).getByLabelText("Tu nombre"), "David");
    const start = within(welcome).getByRole("button", { name: "Empezar a pedir" });
    await userEvent.type(within(welcome).getByLabelText("Tu teléfono"), "123");
    expect(start).toBeDisabled();
    expect(within(welcome).getByText("Escribe un teléfono de 8 a 15 dígitos.")).toBeInTheDocument();
    await userEvent.type(within(welcome).getByLabelText("Tu teléfono"), "4567890");
    await userEvent.click(start);

    await userEvent.click(screen.getByRole("button", { name: "Agregar Latte al pedido" }));
    await userEvent.click(screen.getByRole("button", { name: /Ver pedido \(1\)/ }));
    const cart = screen.getByRole("dialog", { name: "Tu pedido para llevar" });
    expect(within(cart).getByText(/Pagas al recoger/)).toBeInTheDocument();
    expect(within(cart).queryByRole("button", { name: /Ver cuenta de la mesa/ })).not.toBeInTheDocument();
    await userEvent.click(within(cart).getByRole("button", { name: /Mandar pedido/ }));

    const [slug, payload] = mocks.sendTakeawayOrder.mock.calls[0];
    expect(slug).toBe("cafe-luna");
    expect(payload).toMatchObject({ dinerName: "David", phone: "1234567890", items: [{ product_key: "p-latte", quantity: 1 }] });
    expect(await within(cart).findByText(/¡Pedido enviado!/)).toBeInTheDocument();
    expect(mocks.getTable).not.toHaveBeenCalled();
  });

  it("muestra cuándo está listo para recoger y cuándo se entregó", async () => {
    const base = {
      diner_name: "David", idempotency_key: "k", total: "55.00",
      items: [{ name: "Latte", quantity: 1, line_total: "55.00", notes: null, is_cancelled: false }],
    };
    mocks.getMyTakeawayOrders.mockResolvedValue({ ok: true, status: 200, data: { orders: [
      { ...base, idempotency_key: "b", status: "ready", created_at: "2026-11-26T20:30:00Z", account: { status: "open", total: "55.00" } },
      { ...base, idempotency_key: "a", status: "ready", created_at: "2026-11-26T19:00:00Z", account: { status: "closed", total: "55.00" } },
    ] } });
    localStorage.setItem("eniu.diner.name", "David");
    localStorage.setItem("eniu.diner.phone", "5512345678");
    renderPage("/m/cafe-luna/para-llevar");
    await userEvent.click(await screen.findByRole("button", { name: /Mis pedidos/ }));
    const cart = screen.getByRole("dialog", { name: "Tu pedido para llevar" });
    expect(within(cart).getByText(/¡Listo! Pasa a recogerlo/)).toBeInTheDocument();
    expect(within(cart).getByText("Entregado")).toBeInTheDocument();
  });

  it("con los pedidos para llevar apagados, no deja pedir", async () => {
    mocks.getTakeaway.mockResolvedValue({ ok: true, status: 200, data: { ordering: { enabled: false } } });
    renderPage("/m/cafe-luna/para-llevar");
    expect(await screen.findByText("Por ahora no hay pedidos para llevar.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
