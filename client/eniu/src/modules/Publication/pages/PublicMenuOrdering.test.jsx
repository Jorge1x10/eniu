import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicMenuPage from "./PublicMenuPage";

const mocks = vi.hoisted(() => ({
  getPublicMenu: vi.fn(),
  getTable: vi.fn(),
  sendOrder: vi.fn(),
  getMyOrders: vi.fn(),
  getTableAccount: vi.fn(),
}));

vi.mock("../services/publicMenuService", () => ({ getPublicMenu: mocks.getPublicMenu, sendAnalyticsEvents: vi.fn() }));
vi.mock("../ordering/dinerService", () => ({
  getTable: mocks.getTable,
  sendOrder: mocks.sendOrder,
  getMyOrders: mocks.getMyOrders,
  getTableAccount: mocks.getTableAccount,
}));

const menu = {
  business: { name: "Café Luna", currency: "MXN" },
  catalogue: { name: "Carta" },
  template: { key: "modern", theme: {} },
  categories: [{
    name: "Bebidas", tracking_key: "cat-bebidas",
    products: [
      { name: "Latte", price: "55.00", is_available: true, tracking_key: "p-latte" },
      { name: "Americano", price: "40.00", is_available: true, tracking_key: "p-americano" },
      { name: "Té del día", price: null, is_available: true, tracking_key: "p-te" },
      { name: "Chocolate", price: "50.00", is_available: false, tracking_key: "p-choco" },
    ],
  }],
  uncategorized_products: [],
};

const table = { ok: true, status: 200, data: { table: { number: 4, name: null }, menu: { public_slug: "cafe-luna" }, ordering: { enabled: true } } };

function renderPage(entry = "/m/cafe-luna/mesa/qr-mesa-4") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/m/:publicSlug" element={<PublicMenuPage />} />
        <Route path="/m/:publicSlug/mesa/:qrToken" element={<PublicMenuPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function startAs(name) {
  const dialog = await screen.findByRole("dialog", { name: "Estás en la Mesa 4" });
  await userEvent.type(within(dialog).getByLabelText("Tu nombre o el de tu mesa"), name);
  await userEvent.click(within(dialog).getByRole("button", { name: "Empezar a pedir" }));
}

describe("Pedir desde la mesa", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    localStorage.clear();
    sessionStorage.clear();
    mocks.getPublicMenu.mockResolvedValue({ ok: true, status: 200, data: { menu } });
    mocks.getTable.mockResolvedValue(table);
    mocks.getMyOrders.mockResolvedValue({ ok: true, status: 200, data: { account: null, orders: [] } });
  });

  it("sin el QR de una mesa, el menú se ve como siempre", async () => {
    renderPage("/m/cafe-luna");
    await screen.findByRole("heading", { name: "Carta" });
    expect(screen.queryByRole("button", { name: /Agregar/ })).not.toBeInTheDocument();
    expect(mocks.getTable).not.toHaveBeenCalled();
  });

  it("pide el nombre, arma el carrito con notas y manda el pedido", async () => {
    const sent = {
      status: "pending", diner_name: "David", created_at: "2026-11-22T20:05:00Z", idempotency_key: "k",
      total: "110.00", items: [{ name: "Latte", quantity: 2, line_total: "110.00", notes: "Uno con avena", is_cancelled: false }],
    };
    mocks.sendOrder.mockImplementation(async () => {
      mocks.getMyOrders.mockResolvedValue({ ok: true, status: 200, data: { account: { status: "open", version: 1 }, orders: [sent] } });
      return { ok: true, status: 201, data: { order: sent } };
    });
    renderPage();
    await startAs("David");

    // Sólo lo que se puede pedir: con precio y disponible.
    expect(screen.queryByRole("button", { name: "Agregar Té del día al pedido" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar Chocolate al pedido" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Agregar Latte al pedido" }));
    await userEvent.click(screen.getByRole("button", { name: "Agregar otro Latte" }));
    await userEvent.click(screen.getByRole("button", { name: /Ver pedido \(2\)/ }));

    const cart = screen.getByRole("dialog", { name: "Tu pedido · Mesa 4" });
    expect(within(cart).getByText("Pides como")).toHaveTextContent("Pides como");
    await userEvent.click(within(cart).getByRole("button", { name: "Agregar nota" }));
    await userEvent.type(within(cart).getByLabelText("Nota para la cocina"), "Uno con avena");
    await userEvent.click(within(cart).getByRole("button", { name: /Mandar pedido/ }));

    const [qrToken, payload] = mocks.sendOrder.mock.calls[0];
    expect(qrToken).toBe("qr-mesa-4");
    expect(payload).toMatchObject({ dinerName: "David", items: [{ product_key: "p-latte", quantity: 2, notes: "Uno con avena" }] });
    expect(payload.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(payload.idempotencyKey).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(await within(cart).findByText(/¡Pedido enviado!/)).toBeInTheDocument();
    expect(within(cart).getByRole("list", { name: "Estado del pedido" })).toBeInTheDocument();
    expect(within(cart).queryByRole("button", { name: /Mandar pedido/ })).not.toBeInTheDocument();
  });

  it("quien no dio su nombre lo escribe antes de mandar", async () => {
    mocks.sendOrder.mockResolvedValue({ ok: true, status: 201, data: { order: null } });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Solo ver el menú" }));
    await userEvent.click(screen.getByRole("button", { name: "Agregar Americano al pedido" }));
    await userEvent.click(screen.getByRole("button", { name: /Ver pedido/ }));

    const cart = screen.getByRole("dialog");
    const send = within(cart).getByRole("button", { name: /Mandar pedido/ });
    expect(send).toBeDisabled();
    await userEvent.type(within(cart).getByLabelText("Tu nombre o el de tu mesa"), "Ana");
    await userEvent.click(send);
    expect(mocks.sendOrder.mock.calls[0][1].dinerName).toBe("Ana");
    expect(localStorage.getItem("eniu.diner.name")).toBe("Ana");
  });

  it("reintenta con la misma clave para no duplicar el pedido", async () => {
    mocks.sendOrder
      .mockResolvedValueOnce({ ok: false, status: 0, data: null })
      .mockResolvedValueOnce({ ok: true, status: 201, data: { order: null } });
    renderPage();
    await startAs("David");
    await userEvent.click(screen.getByRole("button", { name: "Agregar Latte al pedido" }));
    await userEvent.click(screen.getByRole("button", { name: /Ver pedido/ }));
    const cart = screen.getByRole("dialog");
    await userEvent.click(within(cart).getByRole("button", { name: /Mandar pedido/ }));
    expect(await within(cart).findByRole("alert")).toHaveTextContent(/no se duplicará tu pedido/);
    await userEvent.click(within(cart).getByRole("button", { name: /Mandar pedido/ }));

    const [first, second] = mocks.sendOrder.mock.calls.map((call) => call[1].idempotencyKey);
    expect(second).toBe(first);
  });

  it("quita del carrito lo que ya no se puede pedir y avisa", async () => {
    mocks.sendOrder.mockResolvedValue({ ok: false, status: 409, data: { code: "products_unavailable", product_keys: ["p-latte"] } });
    renderPage();
    await startAs("David");
    await userEvent.click(screen.getByRole("button", { name: "Agregar Latte al pedido" }));
    await userEvent.click(screen.getByRole("button", { name: "Agregar Americano al pedido" }));
    await userEvent.click(screen.getByRole("button", { name: /Ver pedido/ }));
    const cart = screen.getByRole("dialog");
    await userEvent.click(within(cart).getByRole("button", { name: /Mandar pedido/ }));

    expect(await within(cart).findByRole("alert")).toHaveTextContent(/ya no se pueden pedir/);
    expect(within(cart).queryByText("Latte")).not.toBeInTheDocument();
    expect(within(cart).getByText("Americano")).toBeInTheDocument();
  });

  it("con los pedidos en pausa deja ver el menú sin botones de pedir", async () => {
    mocks.getTable.mockResolvedValue({ ...table, data: { ...table.data, ordering: { enabled: false } } });
    renderPage();
    expect(await screen.findByText("Los pedidos están en pausa. Pídele al mesero.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Agregar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("avisa si el QR de la mesa ya no funciona", async () => {
    mocks.getTable.mockResolvedValue({ ok: false, status: 404, data: null });
    renderPage();
    expect(await screen.findByText(/Este QR de mesa ya no está activo/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Carta" })).toBeInTheDocument();
  });

  it("muestra lo ya pedido y la cuenta de la mesa por comensal", async () => {
    localStorage.setItem("eniu.diner.name", "David");
    mocks.getMyOrders.mockResolvedValue({ ok: true, status: 200, data: {
      account: { status: "open", version: 3 },
      orders: [{ status: "preparing", diner_name: "David", created_at: "2026-11-22T20:05:00Z", idempotency_key: "k1", total: "110.00", items: [{ name: "Latte", quantity: 2, line_total: "110.00", notes: null, is_cancelled: false }] }],
    } });
    mocks.getTableAccount.mockResolvedValue({ ok: true, status: 200, data: { account: {
      table: { number: 4, name: null }, total: "150.00",
      lines: [
        { name: "Latte", quantity: 2, line_total: "110.00", diner_name: "David", status: "preparing" },
        { name: "Americano", quantity: 1, line_total: "40.00", diner_name: "Ana", status: "received" },
      ],
    } } });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /Mis pedidos · 1 en camino/ }));
    const cart = screen.getByRole("dialog");
    expect(within(cart).getByRole("listitem", { current: "step" })).toHaveTextContent("Preparando");
    await userEvent.click(within(cart).getByRole("button", { name: "Ver cuenta de la mesa" }));

    const account = await screen.findByRole("dialog", { name: "Cuenta de la Mesa 4" });
    expect(await within(account).findByRole("heading", { name: "Ana" })).toBeInTheDocument();
    expect(within(account).getByRole("heading", { name: "David" })).toBeInTheDocument();
    expect(within(account).getByText("Total de la mesa").nextSibling).toHaveTextContent("150.00");
  });
});
