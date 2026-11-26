import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CheckoutDialog from "./CheckoutDialog";

const mocks = vi.hoisted(() => ({ cash: {} }));
vi.mock("../services/cashService", async (importOriginal) => ({
  ...(await importOriginal()),
  useCashService: () => mocks.cash,
}));

const ACCOUNT = { id: "cuenta-4", total: "150.00", table: { number: 4, name: null } };
const OPEN = { ok: true, data: { session: { id: "turno", status: "open" }, last_closed: null } };

function renderDialog(props = {}) {
  const handlers = { onDone: vi.fn(), onClose: vi.fn(), onCloseWithoutPayment: vi.fn(async () => ({ ok: true })) };
  render(<CheckoutDialog businessId="negocio" account={ACCOUNT} currency="MXN" {...handlers} {...props} />);
  return handlers;
}

function chargeButton() {
  return screen.getByRole("button", { name: /^Cobrar .* y cerrar$/ });
}

describe("CheckoutDialog", () => {
  beforeEach(() => {
    mocks.cash = {
      current: vi.fn(async () => OPEN),
      openCash: vi.fn(async () => ({ ok: true, data: {} })),
      checkout: vi.fn(async () => ({ ok: true, data: {} })),
    };
  });

  it("divide la cuenta entre efectivo y tarjeta, con propina y cambio", async () => {
    const { onDone } = renderDialog();
    await screen.findByRole("radiogroup", { name: "Método de pago" });

    await userEvent.click(screen.getByRole("button", { name: "Pagar una parte con otro método" }));
    const [cashRow, cardRow] = screen.getAllByRole("group", { name: /Pago \d/ });
    expect(within(cardRow).getByRole("radio", { name: /Tarjeta/ })).toHaveAttribute("aria-checked", "true");
    // El primero conserva el total; el segundo arranca vacío y la cuenta se pasa.
    await userEvent.type(within(cardRow).getByLabelText("Importe"), "50");
    expect(screen.getByText(/pasan la cuenta por/)).toBeInTheDocument();
    expect(chargeButton()).toBeDisabled();

    const cashAmount = within(cashRow).getByLabelText("Importe");
    await userEvent.clear(cashAmount);
    await userEvent.type(cashAmount, "100");
    expect(screen.getByText("La cuenta está cubierta")).toBeInTheDocument();

    await userEvent.click(within(cardRow).getByRole("button", { name: "10 %" }));
    expect(within(cardRow).getByLabelText("Propina")).toHaveValue("5.00");
    await userEvent.type(within(cashRow).getByLabelText("Paga con"), "200");
    expect(within(cashRow).getByText(/Cambio: .*100\.00/)).toBeInTheDocument();

    await userEvent.click(chargeButton());
    expect(mocks.cash.checkout).toHaveBeenCalledWith("cuenta-4", [
      { method: "cash", amount: "100.00", tip: "0.00", tendered: "200.00" },
      { method: "card", amount: "50.00", tip: "5.00" },
    ]);
    // Con cambio que dar, se queda a la vista hasta que la persona lo cierra.
    expect(await screen.findByText("Cuenta cobrada")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("no cobra si el efectivo no alcanza", async () => {
    renderDialog();
    await userEvent.type(await screen.findByLabelText("Paga con"), "100");
    expect(screen.getByText("No alcanza")).toBeInTheDocument();
    expect(chargeButton()).toBeDisabled();
  });

  it("abre la caja desde el cobro cuando está cerrada", async () => {
    mocks.cash.current
      .mockResolvedValueOnce({ ok: true, data: { session: null, last_closed: null } })
      .mockResolvedValue(OPEN);
    renderDialog();
    expect(await screen.findByText("La caja está cerrada")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Fondo inicial"), "500");
    await userEvent.click(screen.getByRole("button", { name: "Abrir caja" }));
    expect(mocks.cash.openCash).toHaveBeenCalledWith("500.00");
    expect(await screen.findByRole("radiogroup", { name: "Método de pago" })).toBeInTheDocument();
  });

  it("muestra el error del servidor y no cierra", async () => {
    mocks.cash.checkout.mockResolvedValue({ ok: false, status: 400, data: { message: "Los pagos deben sumar el total de la cuenta", code: "amount_mismatch" } });
    const { onDone } = renderDialog();
    await screen.findByRole("radiogroup", { name: "Método de pago" });
    await userEvent.click(chargeButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Los pagos deben sumar el total de la cuenta");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("una cuenta sin consumo se cierra sin pagos", async () => {
    const handlers = renderDialog({ account: { ...ACCOUNT, total: "0.00" } });
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar cuenta" }));
    expect(handlers.onCloseWithoutPayment).toHaveBeenCalled();
    expect(mocks.cash.checkout).not.toHaveBeenCalled();
    expect(handlers.onDone).toHaveBeenCalled();
  });
});
