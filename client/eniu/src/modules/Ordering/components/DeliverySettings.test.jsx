import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DeliverySettings from "./DeliverySettings";

const mocks = vi.hoisted(() => ({ service: {} }));
vi.mock("../services/orderingService", async (importOriginal) => ({
  ...(await importOriginal()),
  useOrderingService: () => mocks.service,
}));

describe("DeliverySettings", () => {
  beforeEach(() => {
    mocks.service = {
      getDelivery: vi.fn(async () => ({ ok: true, data: { delivery: { enabled: false, fee: "0.00", min_order: null, zones: [] } } })),
      setDelivery: vi.fn(async () => ({ ok: true, data: { delivery: {} } })),
    };
  });

  it("guarda costo, mínimo y colonias, una por renglón", async () => {
    const onChange = vi.fn();
    render(<DeliverySettings businessId="negocio" onChange={onChange} />);
    await userEvent.click(await screen.findByRole("switch", { name: /Entregar a domicilio/ }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar entrega a domicilio" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Agrega al menos una colonia");
    expect(mocks.service.setDelivery).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Costo de envío"), "35,5");
    await userEvent.type(screen.getByLabelText(/Pedido mínimo/), "150");
    await userEvent.type(screen.getByLabelText("Colonias a las que entregas"), "Roma Norte{enter}{enter}  Condesa ");
    expect(screen.getByText("2 colonias. El cliente elige la suya de esta lista.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Guardar entrega a domicilio" }));
    expect(mocks.service.setDelivery).toHaveBeenCalledWith({ enabled: true, fee: "35.5", min_order: "150", zones: ["Roma Norte", "Condesa"] });
    expect(await screen.findByText("Guardado.")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalled();
  });
});
