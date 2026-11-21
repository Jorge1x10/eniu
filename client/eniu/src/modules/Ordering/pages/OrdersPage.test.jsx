import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OrdersPage from "./OrdersPage";
import { LIVE_POLL_MS } from "../hooks/useLiveOrders";

const mocks = vi.hoisted(() => ({
  service: {},
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
  return render(<MemoryRouter><OrdersPage /></MemoryRouter>);
}

describe("OrdersPage", () => {
  beforeEach(() => {
    mocks.playSound.mockReset();
    mocks.plan = { limits: {} };
    mocks.service = {
      live: vi.fn(),
      setOrdering: vi.fn(async () => ({ ok: true })),
      setOrderStatus: vi.fn(async () => ({ ok: true })),
      cancelItem: vi.fn(async () => ({ ok: true })),
      closeAccount: vi.fn(async () => ({ ok: true })),
    };
  });

  afterEach(() => vi.useRealTimers());

  it("muestra cada pedido con su comensal y su mesa, con las mesas por atender primero", async () => {
    mocks.service.live.mockResolvedValue(snapshot([
      account("a-served", 2, [order("o-ready", "ready", { diner_name: "Ana" })], { total: "110.00", opened_at: "2026-11-22T19:00:00Z" }),
      account("a-new", 4, [order("o-new", "pending")]),
    ]));
    renderPage();

    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]).getByRole("heading", { name: "Mesa 4" })).toBeInTheDocument();
    expect(within(cards[0]).getByText("David | Mesa 4")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Nota: Con avena")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Ana | Mesa 2")).toBeInTheDocument();
    expect(screen.getByText("Por aceptar", { selector: "dt" }).nextSibling).toHaveTextContent("1");
  });

  it("acepta un pedido y vuelve a consultar sin esperar al siguiente ciclo", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "pending")])]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Aceptar" }));

    expect(mocks.service.setOrderStatus).toHaveBeenCalledWith("o-1", "received");
    expect(mocks.service.live).toHaveBeenLastCalledWith(null);
  });

  it("no deja cerrar una cuenta con pedidos por aceptar", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "pending")])]));
    renderPage();
    expect(await screen.findByRole("button", { name: "Cerrar cuenta" })).toBeDisabled();
  });

  it("cierra la cuenta tras confirmar, mostrando el total", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "ready")], { total: "110.00" })]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar cuenta" }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/110\.00/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cerrar cuenta" }));
    expect(mocks.service.closeAccount).toHaveBeenCalledWith("a");
  });

  it("cancela un producto suelto nombrándolo en la confirmación", async () => {
    mocks.service.live.mockResolvedValue(snapshot([account("a", 4, [order("o-1", "received")])]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar Latte" }));

    const dialog = screen.getByRole("alertdialog", { name: "¿Cancelar 2 × Latte?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar producto" }));
    expect(mocks.service.cancelItem).toHaveBeenCalledWith("o-1", "o-1-latte");
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
    await screen.findByText("David | Mesa 4");
    expect(mocks.playSound).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_POLL_MS); });
    expect(await screen.findByText("Luis | Mesa 7")).toBeInTheDocument();
    expect(mocks.playSound).toHaveBeenCalledTimes(1);
    expect(mocks.service.live).toHaveBeenLastCalledWith(1);
    expect(document.title).toBe("(2) Pedidos · Eniu");
  });

  it("explica que el plan no incluye pedidos y no ofrece activarlos", async () => {
    mocks.service.live.mockResolvedValue(snapshot([], 1, { enabled: false, reason: "plan" }));
    renderPage();
    expect(await screen.findByText(/Tu plan actual no incluye pedidos desde la mesa/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activar pedidos" })).not.toBeInTheDocument();
  });

  it("avisa hasta cuándo dura la prueba gratuita", async () => {
    mocks.plan = { limits: { orders_free_until: "2027-03-31" } };
    mocks.service.live.mockResolvedValue(snapshot([]));
    renderPage();
    expect(await screen.findByText(/Los pedidos son gratis hasta el 31 de marzo de 2027/)).toBeInTheDocument();
  });

  it("pausa los pedidos", async () => {
    mocks.service.live.mockResolvedValue(snapshot([]));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Pausar pedidos" }));
    expect(mocks.service.setOrdering).toHaveBeenCalledWith(false);
  });
});
