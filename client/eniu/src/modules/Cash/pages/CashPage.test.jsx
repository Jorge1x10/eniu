import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CashPage from "./CashPage";

const mocks = vi.hoisted(() => ({ cash: {}, print: vi.fn() }));
vi.mock("../../Business/services/useBusiness", () => ({
  useBusiness: () => ({ selectedBusiness: { id: "negocio", name: "Café Luna", currency: "MXN" }, isLoadingBusinesses: false }),
}));
vi.mock("../services/cashService", async (importOriginal) => ({
  ...(await importOriginal()),
  useCashService: () => mocks.cash,
}));
vi.mock("../printing/cashReport", async (importOriginal) => ({
  ...(await importOriginal()),
  printCashReport: mocks.print,
}));

const METHODS = ["cash", "card", "transfer", "other"];

function report(extra = {}) {
  return {
    id: "turno-1", status: "open", opened_at: "2026-11-26T15:00:00Z", closed_at: null,
    opening_float: "500.00",
    by_method: METHODS.map((method) => ({ method, amount: "0.00", tips: "0.00", payments: 0 })),
    sales_total: "0.00", tips_total: "0.00", accounts_paid: 0, average_ticket: "0.00",
    accounts_cancelled: 0, accounts_unpaid: [], checkouts: [], cash_in: "0.00", cash_out: "0.00",
    movements: [], expected_cash: "500.00", counted_cash: null, difference: null, notes: null,
    ...extra,
  };
}

const SERVED = report({
  by_method: [
    { method: "cash", amount: "100.00", tips: "10.00", payments: 1 },
    { method: "card", amount: "50.00", tips: "7.50", payments: 1 },
    { method: "transfer", amount: "0.00", tips: "0.00", payments: 0 },
    { method: "other", amount: "0.00", tips: "0.00", payments: 0 },
  ],
  sales_total: "150.00", tips_total: "17.50", accounts_paid: 1, average_ticket: "150.00",
  checkouts: [{ id: "c1", table_number: 4, paid_at: "2026-11-26T16:00:00Z", amount: "150.00", tip: "17.50", methods: ["cash", "card"] }],
  expected_cash: "610.00",
});

function renderPage() {
  return render(<MemoryRouter><CashPage /></MemoryRouter>);
}

describe("CashPage", () => {
  beforeEach(() => {
    mocks.print.mockReset();
    mocks.cash = {
      current: vi.fn(async () => ({ ok: true, data: { session: SERVED, last_closed: null } })),
      sessions: vi.fn(async () => ({ ok: true, data: { sessions: [] } })),
      openCash: vi.fn(async () => ({ ok: true, data: {} })),
      addMovement: vi.fn(async () => ({ ok: true, data: { session: report({ movements: [{ id: "m1", kind: "out", amount: "80.00", reason: "Hielo", created_at: "2026-11-26T16:10:00Z" }], cash_out: "80.00" }) } })),
      closeCash: vi.fn(async () => ({ ok: true, data: { session: { ...SERVED, status: "closed", closed_at: "2026-11-26T22:00:00Z", counted_cash: "600.00", difference: "-10.00" } } })),
      session: vi.fn(),
    };
  });

  it("muestra el turno con ventas por método, propinas y efectivo esperado", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Caja" })).toBeInTheDocument();
    expect(screen.getByText(/Abierta desde las/)).toBeInTheDocument();
    expect(screen.getByText("Efectivo en caja").nextSibling).toHaveTextContent("610.00");
    const methods = screen.getByRole("table");
    expect(within(methods).getByRole("rowheader", { name: /Efectivo/ })).toBeInTheDocument();
    expect(within(methods).queryByRole("rowheader", { name: /Transferencia/ })).not.toBeInTheDocument();
    expect(screen.getByText("Mesa 4")).toBeInTheDocument();
    expect(screen.getByText(/Efectivo \+ Tarjeta/)).toBeInTheDocument();
  });

  it("abre la caja con fondo cuando está cerrada", async () => {
    mocks.cash.current.mockResolvedValueOnce({ ok: true, data: { session: null, last_closed: null } });
    renderPage();
    await userEvent.type(await screen.findByLabelText("Fondo inicial"), "750.5");
    await userEvent.click(screen.getByRole("button", { name: "Abrir caja" }));
    expect(mocks.cash.openCash).toHaveBeenCalledWith("750.50");
  });

  it("registra un retiro con su motivo", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Retiro" }));
    await userEvent.type(screen.getByLabelText("Importe"), "80");
    await userEvent.click(screen.getByRole("button", { name: "Registrar retiro" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/motivo/);
    await userEvent.type(screen.getByLabelText("Motivo"), "Hielo");
    await userEvent.click(screen.getByRole("button", { name: "Registrar retiro" }));
    expect(mocks.cash.addMovement).toHaveBeenCalledWith({ kind: "out", amount: "80.00", reason: "Hielo" });
    expect(await screen.findByText("Hielo")).toBeInTheDocument();
  });

  it("hace el corte mostrando la diferencia antes de cerrar", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Hacer corte" }));
    const dialog = screen.getByRole("dialog", { name: "Hacer corte de caja" });
    await userEvent.type(within(dialog).getByLabelText("Efectivo contado"), "600");
    expect(within(dialog).getByText(/Faltan .*10\.00/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Notas/), "Faltó un billete");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cerrar caja" }));
    expect(mocks.cash.closeCash).toHaveBeenCalledWith("600.00", "Faltó un billete");

    const result = await screen.findByRole("dialog", { name: "Corte de caja" });
    await userEvent.click(within(result).getByRole("button", { name: "Imprimir corte" }));
    expect(mocks.print).toHaveBeenCalledWith(expect.objectContaining({ businessName: "Café Luna", currency: "MXN" }));
  });
});
