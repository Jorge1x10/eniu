import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OrderStatsSection from "./OrderStatsSection";

const mocks = vi.hoisted(() => ({ stats: vi.fn() }));

vi.mock("../services/orderingService", async (importOriginal) => ({
  ...(await importOriginal()),
  useOrderingService: () => ({ stats: mocks.stats }),
}));
vi.mock("../../auth/components/PlanBadge", () => ({ default: () => <a href="/planes">Incluido en Esencial</a> }));

const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: hour === 14 ? 3 : hour === 20 ? 1 : 0 }));
const data = {
  scope: "full",
  period: { from: "2026-11-18", to: "2026-11-24", timezone: "America/Mexico_City" },
  summary: {
    orders: 4, units: 9, revenue: "455.00", average_order: "113.75",
    previous_orders: 2, previous_revenue: "200.00", orders_change: 100.0, revenue_change: 127.5, busiest_hour: 14,
  },
  top_products: [
    { name: "Latte", units: 6, revenue: "330.00", orders: 3, share: 66.7 },
    { name: "Chilaquiles verdes", units: 3, revenue: "125.00", orders: 2, share: 33.3 },
  ],
  by_day: [{ date: "2026-11-23", orders: 1, revenue: "110.00" }, { date: "2026-11-24", orders: 3, revenue: "345.00" }],
  by_hour: hours,
};

function renderSection(props = {}) {
  return render(<OrderStatsSection businessId="b1" timezone="America/Mexico_City" currency="MXN" fullAccess {...props} />);
}

describe("Ventas y lo más pedido", () => {
  beforeEach(() => { mocks.stats.mockReset(); });

  it("muestra ventas, ticket promedio, hora pico y el ranking de lo más pedido", async () => {
    mocks.stats.mockResolvedValue({ ok: true, status: 200, data });
    renderSection();

    const orders = (await screen.findByText("Pedidos")).closest("article");
    expect(orders).toHaveTextContent("4");
    expect(orders).toHaveTextContent("+100% vs. periodo anterior");
    expect(screen.getByText("Ventas").closest("article")).toHaveTextContent("$455.00");
    expect(screen.getByText("Ticket promedio").closest("article")).toHaveTextContent("9 productos vendidos");
    const ranking = screen.getByRole("region", { name: "Lo más pedido" });
    const items = within(ranking).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Latte");
    expect(items[0]).toHaveTextContent("6 vendidos");
    expect(items[1]).toHaveTextContent("Chilaquiles verdes");
    expect(screen.getByRole("img", { name: /^Pedidos por hora: / })).toBeInTheDocument();
  });

  it("pide los últimos 7 días y cambia de periodo", async () => {
    mocks.stats.mockResolvedValue({ ok: true, status: 200, data });
    renderSection();
    await screen.findByText("Lo más pedido");
    const first = mocks.stats.mock.calls[0][0];
    const span = (Date.parse(first.to) - Date.parse(first.from)) / 86400000 + 1;
    expect(span).toBe(7);

    await userEvent.click(screen.getByRole("button", { name: "Hoy" }));
    const today = mocks.stats.mock.calls.at(-1)[0];
    expect(today.from).toBe(today.to);
    expect(screen.queryByRole("region", { name: "Ventas por día" })).not.toBeInTheDocument();
  });

  it("el plan gratuito no puede elegir 30 días", async () => {
    mocks.stats.mockResolvedValue({ ok: true, status: 200, data });
    renderSection({ fullAccess: false });
    await screen.findByText("Lo más pedido");
    expect(screen.getByRole("button", { name: "30 días" })).toBeDisabled();
  });

  it("sin pedidos explica qué va a aparecer", async () => {
    mocks.stats.mockResolvedValue({ ok: true, status: 200, data: { ...data, summary: { ...data.summary, orders: 0, units: 0, revenue: "0.00", average_order: "0.00", busiest_hour: null }, top_products: [] } });
    renderSection();
    expect(await screen.findByText(/Aún no hay pedidos aceptados en este periodo/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Lo más pedido" })).not.toBeInTheDocument();
  });

  it("si el plan no lo incluye, lo dice y ofrece el plan", async () => {
    mocks.stats.mockResolvedValue({ ok: false, status: 403, data: { code: "plan_limit", message: "Tu plan incluye las estadísticas de los últimos 7 días." } });
    renderSection();
    expect(await screen.findByRole("alert")).toHaveTextContent("últimos 7 días");
    expect(screen.getByRole("link", { name: "Incluido en Esencial" })).toBeInTheDocument();
  });

  it("ante un error permite reintentar", async () => {
    mocks.stats.mockResolvedValueOnce({ ok: false, status: 500, data: null }).mockResolvedValue({ ok: true, status: 200, data });
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Lo más pedido")).toBeInTheDocument();
  });
});
