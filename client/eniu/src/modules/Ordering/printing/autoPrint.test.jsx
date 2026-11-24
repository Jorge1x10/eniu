import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OrdersPage from "../pages/OrdersPage";
import { LiveOrdersProvider } from "../context/LiveOrdersContext";
import { LIVE_POLL_MS } from "../hooks/useLiveOrders";
import { savePrintSettings } from "./printSettings";

const mocks = vi.hoisted(() => ({ service: {}, print: vi.fn(async () => {}) }));

vi.mock("./printTicket", () => ({ printOrderTicket: mocks.print, printHtml: vi.fn() }));
vi.mock("../services/orderingService", async (importOriginal) => ({
  ...(await importOriginal()),
  useOrderingService: () => mocks.service,
}));
vi.mock("../../Business/services/useBusiness", () => ({
  useBusiness: () => ({ selectedBusiness: { id: "business-1", name: "Café Luna", currency: "MXN" }, isLoadingBusinesses: false }),
}));
vi.mock("../../auth/hooks/usePlan", () => ({ usePlan: () => ({ limits: {} }) }));
vi.mock("../utils/orderSound", () => ({
  soundPreference: () => false, orderSoundReady: () => false, unlockOrderSound: async () => false,
  rememberSoundPreference: vi.fn(), playNewOrderSound: vi.fn(),
}));

const table = { id: "t4", number: 4, name: null };
const order = (id, status) => ({
  id, status, diner_name: "David", created_at: "2026-11-24T20:05:00Z", total: "110.00",
  items: [{ id: `${id}-i`, name: "Latte", quantity: 2, line_total: "110.00", notes: null, is_cancelled: false }],
});
const snapshot = (orders, version) => ({
  ok: true, status: 200,
  data: { changed: true, version, ordering: { enabled: true, reason: null }, accounts: [{ id: "a4", status: "open", table, opened_at: "2026-11-24T20:00:00Z", total: "0.00", pending_orders: orders.filter((o) => o.status === "pending").length, orders }] },
});

function renderPanel() {
  return render(<MemoryRouter><LiveOrdersProvider businessId="business-1" businessName="Café Luna"><OrdersPage /></LiveOrdersProvider></MemoryRouter>);
}

describe("Comanda impresa", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    mocks.print.mockClear();
    mocks.service = { live: vi.fn(), setOrderStatus: vi.fn(async () => ({ ok: true })), setOrdering: vi.fn(), cancelItem: vi.fn(), closeAccount: vi.fn() };
  });
  afterEach(() => vi.useRealTimers());

  it("en el dispositivo marcado, imprime la comanda al aceptarse el pedido, una sola vez", async () => {
    savePrintSettings({ autoPrint: true });
    mocks.service.live
      .mockResolvedValueOnce(snapshot([order("o1", "pending")], 1))
      .mockResolvedValue(snapshot([order("o1", "received")], 2));
    renderPanel();
    await userEvent.click(await screen.findByRole("button", { name: "Aceptar" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 2); });

    expect(mocks.print).toHaveBeenCalledTimes(1);
    expect(mocks.print.mock.calls[0][0]).toMatchObject({ businessName: "Café Luna", table: { number: 4 }, order: { id: "o1", status: "received" } });
  });

  it("sin marcar el dispositivo no imprime solo", async () => {
    mocks.service.live
      .mockResolvedValueOnce(snapshot([order("o1", "pending")], 1))
      .mockResolvedValue(snapshot([order("o1", "received")], 2));
    renderPanel();
    await userEvent.click(await screen.findByRole("button", { name: "Aceptar" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_POLL_MS); });
    expect(mocks.print).not.toHaveBeenCalled();
  });

  it("reimprime desde la comanda, marcando la reimpresión si ya salió sola", async () => {
    localStorage.setItem("eniu.print.claimed.o1", String(Date.now()));
    mocks.service.live.mockResolvedValue(snapshot([order("o1", "preparing"), order("o2", "pending")], 1));
    renderPanel();
    await userEvent.click(await screen.findByRole("button", { name: "Imprimir la comanda de David" }));
    expect(mocks.print).toHaveBeenCalledWith(expect.objectContaining({ reprint: true, order: expect.objectContaining({ id: "o1" }) }));
    // Lo que no se ha aceptado no tiene comanda.
    expect(screen.getAllByRole("button", { name: "Imprimir la comanda de David" })).toHaveLength(1);
  });

  it("el diálogo guarda los ajustes en este dispositivo e imprime una prueba", async () => {
    mocks.service.live.mockResolvedValue(snapshot([], 1));
    renderPanel();
    await userEvent.click(await screen.findByRole("button", { name: "Impresión de comandas" }));
    const dialog = screen.getByRole("dialog", { name: "Impresión de comandas" });
    await userEvent.click(within(dialog).getByRole("switch", { name: /Imprimir la comanda al aceptar/ }));
    await userEvent.click(within(dialog).getByLabelText("58 mm"));
    expect(JSON.parse(localStorage.getItem("eniu.print.settings"))).toEqual({ autoPrint: true, paper: "58" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Imprimir una prueba" }));
    expect(mocks.print).toHaveBeenCalledWith(expect.objectContaining({ businessName: "Café Luna" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(screen.getByRole("button", { name: "Impresión de comandas: activada en este equipo" })).toBeInTheDocument();
  });
});
