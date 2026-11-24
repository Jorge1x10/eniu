import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OrderNotifications from "./OrderNotifications";
import { LiveOrdersProvider } from "../context/LiveOrdersContext";
import { LIVE_POLL_MS } from "../hooks/useLiveOrders";

const mocks = vi.hoisted(() => ({ service: {}, notifications: [] }));

vi.mock("../services/orderingService", async (importOriginal) => ({
  ...(await importOriginal()),
  useOrderingService: () => mocks.service,
}));
vi.mock("../utils/orderSound", () => ({
  soundPreference: () => false,
  orderSoundReady: () => false,
  unlockOrderSound: async () => false,
  rememberSoundPreference: vi.fn(),
  playNewOrderSound: vi.fn(),
}));

class FakeNotification {
  static permission = "granted";
  static requestPermission = vi.fn(async () => "granted");
  constructor(title, options) {
    Object.assign(this, { title, ...options, closed: false });
    mocks.notifications.push(this);
  }
  close() { this.closed = true; }
}

const table = { id: "t4", number: 4, name: null };
const order = (id, status, diner = "David") => ({
  id, status, diner_name: diner, created_at: "2026-11-22T20:05:00Z", total: "110.00",
  items: [{ id: `${id}-i`, name: "Latte", quantity: 2, line_total: "110.00", notes: "Con avena", is_cancelled: false }],
});
const snapshot = (orders, version) => ({
  ok: true, status: 200,
  data: { changed: true, version, ordering: { enabled: true, reason: null }, accounts: orders.length ? [{ id: "a4", status: "open", table, opened_at: "2026-11-22T20:00:00Z", total: "0.00", pending_orders: orders.filter((o) => o.status === "pending").length, orders }] : [] },
});

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderPanel(path = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LiveOrdersProvider businessId="business-1">
        <Routes><Route path="*" element={<Where />} /></Routes>
        <OrderNotifications />
      </LiveOrdersProvider>
    </MemoryRouter>,
  );
}

async function nextPoll() {
  await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_POLL_MS); });
}

function setHidden(hidden) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
}

describe("Avisos de pedidos del panel", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    localStorage.setItem("eniu.notify.prompt.dismissed", "1");
    mocks.notifications = [];
    window.Notification = FakeNotification;
    FakeNotification.permission = "granted";
    setHidden(false);
    mocks.service = { live: vi.fn(), setOrderStatus: vi.fn(async () => ({ ok: true })) };
  });

  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
    delete window.Notification;
  });

  it("muestra el pedido por aceptar hasta que se acepta, y luego avisa que se aceptó con su mesa", async () => {
    mocks.service.live
      .mockResolvedValueOnce(snapshot([order("o1", "pending")], 1))
      .mockResolvedValue(snapshot([order("o1", "received")], 2));
    renderPanel();

    const card = await screen.findByRole("article", { name: "Nuevo pedido de David | Mesa 4" });
    expect(within(card).getByText("↳ Con avena")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /Cerrar/ })).not.toBeInTheDocument();

    await userEvent.click(within(card).getByRole("button", { name: "Aceptar" }));
    expect(mocks.service.setOrderStatus).toHaveBeenCalledWith("o1", "received");
    expect(await screen.findByText("Pedido aceptado · Mesa 4")).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /Nuevo pedido/ })).not.toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(6500); });
    expect(screen.queryByText("Pedido aceptado · Mesa 4")).not.toBeInTheDocument();
  });

  it("también se quita si otro dispositivo lo rechaza", async () => {
    mocks.service.live
      .mockResolvedValueOnce(snapshot([order("o1", "pending")], 1))
      .mockResolvedValue(snapshot([order("o1", "cancelled")], 2));
    renderPanel();
    await screen.findByRole("article", { name: /Nuevo pedido/ });
    await nextPoll();
    expect(screen.queryByRole("article", { name: /Nuevo pedido/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Pedido aceptado/)).not.toBeInTheDocument();
  });

  it("rechazar pide confirmación", async () => {
    mocks.service.live.mockResolvedValue(snapshot([order("o1", "pending")], 1));
    renderPanel();
    await userEvent.click(within(await screen.findByRole("article", { name: /Nuevo pedido/ })).getByRole("button", { name: "Rechazar" }));
    const dialog = screen.getByRole("alertdialog", { name: "¿Rechazar el pedido de David | Mesa 4?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar pedido" }));
    expect(mocks.service.setOrderStatus).toHaveBeenCalledWith("o1", "cancelled");
  });

  it("avisa cuando un pedido está listo para llevar, hasta que alguien lo da por visto", async () => {
    mocks.service.live
      .mockResolvedValueOnce(snapshot([order("o1", "preparing")], 1))
      .mockResolvedValue(snapshot([order("o1", "ready")], 2));
    renderPanel();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    await nextPoll();
    const ready = await screen.findByText("Listo para llevar · Mesa 4");
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(ready).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByText("Listo para llevar · Mesa 4")).not.toBeInTheDocument();
  });

  it("con la pestaña oculta abre avisos del sistema y cierra el del pedido al aceptarse", async () => {
    mocks.service.live
      .mockResolvedValueOnce(snapshot([], 1))
      .mockResolvedValueOnce(snapshot([order("o1", "pending")], 2))
      .mockResolvedValue(snapshot([order("o1", "ready")], 3));
    renderPanel();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    setHidden(true);
    // Oculta, el panel sigue preguntando, más espaciado.
    await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 3); });
    const pending = mocks.notifications.find((notification) => notification.title === "Nuevo pedido · Mesa 4");
    expect(pending).toMatchObject({ requireInteraction: true, body: "David · 2× Latte" });
    expect(pending.closed).toBe(false);

    await act(async () => { await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 3); });
    expect(pending.closed).toBe(true);
    expect(mocks.notifications.map((notification) => notification.title)).toEqual([
      "Nuevo pedido · Mesa 4", "Pedido aceptado · Mesa 4", "Listo para llevar · Mesa 4",
    ]);
    expect(mocks.notifications[2].requireInteraction).toBe(true);
  });

  it("en Pedidos no repite los pedidos por aceptar", async () => {
    mocks.service.live.mockResolvedValue(snapshot([order("o1", "pending")], 1));
    renderPanel("/dashboard/pedidos");
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.queryByRole("article", { name: /Nuevo pedido/ })).not.toBeInTheDocument();
  });

  it("pide permiso para los avisos del navegador una sola vez", async () => {
    localStorage.clear();
    FakeNotification.permission = "default";
    mocks.service.live.mockResolvedValue(snapshot([], 1));
    renderPanel();
    await userEvent.click(await screen.findByRole("button", { name: "Activar avisos" }));
    expect(FakeNotification.requestPermission).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Activar avisos" })).not.toBeInTheDocument();
    expect(localStorage.getItem("eniu.notify.prompt.dismissed")).toBe("1");
  });
});
