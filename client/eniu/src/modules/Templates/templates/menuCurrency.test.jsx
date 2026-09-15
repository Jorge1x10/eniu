import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_THEME } from "../utils/themeDefaults";
import { resolveTemplate } from "./templateRegistry";

/**
 * El precio del menú público sale en la moneda del negocio.
 *
 * Antes las trece plantillas llamaban al formateador sin decirle la moneda y
 * caían a pesos mexicanos: un restaurante en Madrid guardaba EUR en su
 * negocio y sus comensales seguían viendo "$145.00". Como el precio se pinta
 * en la hoja del árbol y ninguna plantilla recibe el negocio, la moneda viaja
 * por contexto — y esta prueba es lo que garantiza que llega a las trece.
 */
const catalogue = { name: "Carta principal" };
const categories = [{ id: "cat-1", name: "Bebidas", tracking_key: "cat-1-key" }];
const theme = { ...DEFAULT_THEME, tokens: { background: "#FFFDF5", primary: "#FFE05A", accent: "#E8C93D", text: "#111111", surface: "#FFFDF5", muted: "#6B6B6B", price: "#111111", category_title: "#111111", nav_chip_bg: "#FFE05A", nav_chip_text: "#111111" } };
const product = {
  id: "prod-1", category_id: "cat-1", tracking_key: "prod-1-key",
  name: "Latte de avena", description: null, price: "68.00",
  is_available: true, image_url: null, promo_label: null,
};

const LAYOUT_KEYS = [
  "modern", "minimal", "elegant", "bistro", "bold", "natural", "retro",
  "luxury", "chalkboard", "magazine", "sidebar", "receipt", "story",
];

function renderMenu(layoutKey, business, products = [product]) {
  const Template = resolveTemplate(layoutKey);
  return render(createElement(Template, {
    business, catalogue, categories, products, theme,
    coverUrl: null, onCategorySelect: () => {}, showEniuBadge: false,
  }));
}

describe("moneda del menú público", () => {
  // Se busca la marca del euro y no un formato exacto: cómo se escribe el
  // importe depende de la región de quien lee ("68,00 €" o "EUR 68.00"), y
  // lo que aquí se prueba es que la moneda del negocio llega a la plantilla.
  it.each(LAYOUT_KEYS)("la plantilla \"%s\" usa la moneda del negocio", (layoutKey) => {
    renderMenu(layoutKey, { name: "Bar Atocha", currency: "EUR" });
    expect(screen.getByText(/€|EUR/)).toBeInTheDocument();
    expect(screen.queryByText(/\$\s?68/)).not.toBeInTheDocument();
  });

  it("un negocio sin moneda guardada sigue saliendo en pesos", () => {
    renderMenu("modern", { name: "Café Aurora" });
    expect(screen.getByText("$68.00")).toBeInTheDocument();
  });

  it("un producto sin precio invita a consultarlo en vez de mostrar cero", () => {
    renderMenu("modern", { name: "Bar Atocha", currency: "EUR" }, [{ ...product, price: null }]);
    expect(screen.getByText("Consultar")).toBeInTheDocument();
  });
});
