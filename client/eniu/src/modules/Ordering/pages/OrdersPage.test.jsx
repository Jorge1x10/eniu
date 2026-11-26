import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OrdersPage from "./OrdersPage";
import { LiveOrdersProvider } from "../context/LiveOrdersContext";
import { LIVE_POLL_MS } from "../hooks/useLiveOrders";

const mocks = vi.hoisted(() => ({
  service: {},
  cash: {},
  plan: { limits: {} },
  playSound: vi.fn(),
}));

vi.mock("../../Business/services/useBusiness", () => ({
  useBusiness: () => ({ selectedBusiness: { id: "business-1", name: "Café Luna", currency: "MXN" }, isLoadingBusinesses: false }),
}));
vi.mock("../../auth/hooks/usePlan", () => ({ usePlan: () => mocks.plan }));
vi.mock("../services/orderingService", async (importOriginal) => ({
  ...(await importOriginal()),
  useOrderingService: () => mocks.service,
}));
vi.mock("../../Cash/services/cashService", async (importOriginal) => ({
  ...(await importOriginal()),
  useCashService: () => mocks.cash,
}));
vi.mock("../utils/orderSound", () => ({
  soundPreference: () => true,
  orderSoundReady: () => true,
  unlockOrderSound: async () => true,
  rememberSoundPreference: vi.fn(),
  playNewOrderSound: mocks.playSound,
}));

function order(id, status, extra = {}) {
  return {
    id, status, diner_name: "David", created_at: "2026-11-22T20:05:00Z",
    items: [
      { id: `${id}-latte`, name: "Latte", quantity: 2, unit_price: "55.00", line_total: "110.00", notes: "Con avena", is_cancelled: false },
    ],
    total: "110.00",
    ...extra,
  };
}

function account(id, number, orders, extra = {}) {
  return {
    id, status: "open", table: { id: `table-${number}`, number, name: null },
    opened_at: "2026-11-22T20:00:00Z", total: "0.00",
    pending_orders: orders.filter((entry) => entry.status === "pending").length,
    orders, ...extra,
  };
}

function snapshot(accounts, version = 1, ordering = { enabled: true, reason: null }) {
  return { ok: true, status: 200, data: { changed: true, version, ordering, accounts } };
}

function renderPage() {
  return render(<MemoryRouter><LiveOrdersProvider businessId="business-1"><OrdersPage /></LiveOrdersProvider></MemoryRouter>);
}

describe("OrdersPage", () => {
  beforeEach(() => {
    mocks.playSound.mockReset();
    localStorage.clear();
    mocks.plan = { limits: {} };
    mocks.service = {
      live: vi.fn(),
      setOrdering: vi.fn(async () => ({ ok: true })),
      setOrderStatus: vi.fn(async () => ({ ok: true })),
      cancelItem: vi.fn(async () => ({ ok: true })),
      closeAccount: vi.fn(async () => ({ ok: true })),
    };
    mocks.cash = {
      current: vi.fn(async () => ({ ok: true, data: { session: { id: "turno-1", status: "open" }, last_closed: null } })),
      openCash: vi.fn(async () => ({ ok: true, data: {} })),
      checkout: vi.fn(async () => ({ ok: true, data: {} })),
    };
  });

  afterEach(() => vi.useRealTimers());

  it("muestra una tarjeta por mesa, con las que tienen pedidos por aceptar primero", async () => {
    mocks.service.live.mockResolvedValue(snapshot([
      account("a-served", 2, [order("o-ready", "ready", { diner_name: "Ana" })], { total: "110.00", opened_at: "2026-11-22T19:00:00Z" }),
      account("a-new", 4, [order("o-new", "pending")]),
    ]));
    renderPage();

    const tables = await screen.findAllByRole("heading", { level: 2 });
    expect(tables.map((heading) => heading.getAttribute("aria-label"))).toEqual(["Mesa 4", "Mesa 2"]);
    expect(screen.getByText("1 por aceptar")).toBeInTheDocument();
    expect(screen.getByText(/^DAVID · /)).toBeInTheDocument();
    expect(screen.getAllByText("↳ Con avena")).toHaveLength(2);
    expect(screen.getByText("Cuentas abiertas · 2")).toBeInTheDocument();
    expect(screen.getByText("Por aceptar", { selector: "dt" }).nextSibling).toHaveTextContent("1");
  });

  it("agrupa los pedidos por estado en tres columnas", async () => {
    mocks.service.live.mockResolvedValue(snapshot([
      account("a", 4, [order("o-1", "pending"), order("o-2", "preparing", { diner_name: "Luis" })]),
    ]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Por estado" }));

    const kitchen = screen.getByRole("region", { name: /En cocina/ });
    expect(within(kitchen).getByText("LUIS")).toBeInTheDocument();
    expect(within(kitchen).getByRole("button", { name: "Marcar listo" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /Listos/ })).getByText("Nada por aquí")).toBeInTheDocument();
  });

  it("acepta un pedido y vuelve a consultar sin esperar al siguiente ciclo", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "pending")])]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Aceptar" }));

    expect(mocks.service.setOrderStatus).toHaveBeenCalledWith("o-1", "received");
    expect(mocks.service.live).toHaveBeenLastCalledWith(null);
  });

  it("no deja cobrar una cuenta con pedidos por aceptar", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "pending")])]));
    renderPage();
    const charge = await screen.findByRole("button", { name: "Cobrar" });
    expect(charge).toBeDisabled();
    expect(charge).toHaveAccessibleDescription("Acepta o rechaza los pedidos pendientes para cobrar la cuenta.");
  });

  it("cobra la cuenta con el total y la cierra", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "ready")], { total: "110.00" })]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Cobrar" }));

    const dialog = await screen.findByRole("dialog", { name: "Cobrar Mesa 4" });
    await userEvent.click(await within(dialog).findByRole("button", { name: /Cobrar .*110\.00 y cerrar/ }));
    expect(mocks.cash.checkout).toHaveBeenCalledWith("a", [{ method: "cash", amount: "110.00", tip: "0.00" }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cierra sin cobrar sólo tras confirmarlo", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "ready")], { total: "110.00" })]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Cobrar" }));
    const dialog = await screen.findByRole("dialog", { name: "Cobrar Mesa 4" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Cerrar sin cobrar" }));
    expect(mocks.service.closeAccount).not.toHaveBeenCalled();
    await userEvent.click(within(within(dialog).getByRole("group", { name: "Cerrar sin cobrar" })).getByRole("button", { name: "Cerrar sin cobrar" }));
    expect(mocks.service.closeAccount).toHaveBeenCalledWith("a");
  });

  it("quita un producto suelto tras confirmarlo en el mismo renglón", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "received")])]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Quitar Latte del pedido" }));

    expect(screen.getByText("¿Quitarlo del pedido?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sí, quitar" }));
    expect(mocks.service.cancelItem).toHaveBeenCalledWith("o-1", "o-1-latte");
  });

  it("pide confirmación para rechazar un pedido", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "pending")])]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Rechazar" }));

    const dialog = screen.getByRole("alertdialog", { name: "¿Rechazar el pedido de David | Mesa 4?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar pedido" }));
    expect(mocks.service.setOrderStatus).toHaveBeenCalledWith("o-1", "cancelled");
  });

  it("suena cuando llega un pedido nuevo, pero no por lo que ya había al abrir", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mocks.service.live
      .mockResolvedValueOnce(snapshot([account("a", 4, [order("o-1", "pending")])], 1))
      .mockResolvedValueOnce(snapshot([
        account("a", 4, [order("o-1", "pending")]),
        account("b", 7, [order("o-2", "pending", { diner_name: "Luis" })]),
      ], 2));
    renderPage();
    await screen.findByText(/^DAVID · /);
    expect(mocks.playSound).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_POLL_MS); });
    expect(await screen.findByText(/^LUIS · /)).toBeInTheDocument();
    expect(mocks.playSound).toHaveBeenCalledTimes(1);
    expect(mocks.service.live).toHaveBeenLastCalledWith(1);
  });

  it("explica que el plan no incluye pedidos y no ofrece activarlos", async () => {
    mocks.service.live.mockResolvedValue(snapshot([], 1, { enabled: false, reason: "plan" }));
    renderPage();
    expect(await screen.findByText(/Tu plan actual no incluye pedidos desde la mesa/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("avisa hasta cuándo dura la prueba gratuita", async () => {
    mocks.plan = { limits: { orders_free_until: "2027-03-31" } };
    mocks.service.live.mockResolvedValue(snapshot([]));
    renderPage();
    expect(await screen.findByText(/Los pedidos son gratis hasta el 31 de marzo de 2027/)).toBeInTheDocument();
  });

  it("pausa los pedidos con el interruptor", async () => {
    mocks.service.live.mockResolvedValue(snapshot([]));
    renderPage();
    const toggle = await screen.findByRole("switch", { name: "Recibiendo pedidos" });
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    expect(mocks.service.setOrdering).toHaveBeenCalledWith(false);
  });

  it("explica la pausa a quien la ve", async () => {
    mocks.service.live.mockResolvedValue(snapshot([], 1, { enabled: false, reason: "paused" }));
    renderPage();
    expect(await screen.findByText(/Pedidos en pausa. Tus clientes ven el menú/)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Pedidos en pausa" })).not.toBeChecked();
  });
});
