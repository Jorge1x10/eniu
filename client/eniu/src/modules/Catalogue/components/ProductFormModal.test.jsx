import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import ProductFormModal from "./ProductFormModal";

// El servicio arrastra el cliente de la API, que necesita `VITE_API_URL`; el
// formulario sólo usa de él el texto de error.
vi.mock("../services/productService", () => ({ getProductErrorMessage: (_response, fallback) => fallback }));

function renderForm(product) {
  const onSave = vi.fn(() => Promise.resolve({ ok: true, data: { product: { id: "p1" } } }));
  render(
    <MemoryRouter>
      <ProductFormModal product={product} categories={[]} categoriesPath="/categorias" onClose={vi.fn()} onSave={onSave} onSaved={vi.fn()} />
    </MemoryRouter>,
  );
  return onSave;
}

describe("ProductFormModal", () => {
  // En España el teclado decimal sólo ofrece la coma: rechazar "12,50" dejaba
  // a un restaurante europeo sin forma de escribir sus precios.
  it("acepta la coma como separador decimal y la envía con punto", async () => {
    const user = userEvent.setup();
    const onSave = renderForm();

    await user.type(screen.getByLabelText("Nombre"), "Café con leche");
    await user.type(screen.getByLabelText("Precio (opcional)"), "2,50");
    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].price).toBe("2.50");
  });

  it("sigue rechazando un precio con más de dos decimales", async () => {
    const user = userEvent.setup();
    const onSave = renderForm();

    await user.type(screen.getByLabelText("Nombre"), "Café con leche");
    await user.type(screen.getByLabelText("Precio (opcional)"), "2,505");
    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByText("Usa un precio válido, no negativo y con máximo dos decimales.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("no cuenta como cambio el mismo precio escrito con coma", async () => {
    const user = userEvent.setup();
    const onSave = renderForm({ id: "p1", name: "Café", description: "", price: "2.50", category_id: null, is_available: true, pictures: [] });

    const price = screen.getByLabelText("Precio (opcional)");
    await user.clear(price);
    await user.type(price, "2,50");
    await user.type(screen.getByLabelText("Nombre"), " solo");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual({ name: "Café solo" });
  });
});
