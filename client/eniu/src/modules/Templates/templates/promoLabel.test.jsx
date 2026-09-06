import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_THEME } from "../utils/themeDefaults";
import { resolveTemplate } from "./templateRegistry";

/**
 * `promo_label` lo resuelve el backend (`promotion/services.py`) según los
 * días activos de cada promoción; aquí sólo se comprueba que, si el producto
 * ya lo trae, el menú lo pinta — sin esto la promoción existiría en el
 * dashboard pero nunca se vería en el menú real.
 */
const business = { name: "Café Aurora" };
const catalogue = { name: "Carta principal" };
const categories = [{ id: "cat-1", name: "Bebidas", tracking_key: "cat-1-key" }];
const theme = { ...DEFAULT_THEME, tokens: { background: "#FFFDF5", primary: "#FFE05A", accent: "#E8C93D", text: "#111111", surface: "#FFFDF5", muted: "#6B6B6B", price: "#111111", category_title: "#111111", nav_chip_bg: "#FFE05A", nav_chip_text: "#111111" } };

function productWithPromo(overrides = {}) {
  return {
    id: "prod-1", category_id: "cat-1", tracking_key: "prod-1-key",
    name: "Latte de avena", description: null, price: "68.00",
    is_available: true, image_url: null, promo_label: "2x1 hoy",
    ...overrides,
  };
}

describe("etiqueta de promoción en el menú", () => {
  it.each(["modern", "minimal", "elegant", "bistro", "chalkboard", "magazine", "sidebar", "receipt", "story"])(
    "la plantilla \"%s\" muestra la etiqueta cuando el producto la trae",
    (layoutKey) => {
      const Template = resolveTemplate(layoutKey);
      render(createElement(Template, {
        business, catalogue, categories, products: [productWithPromo()], theme,
        coverUrl: null, onCategorySelect: () => {}, showEniuBadge: false,
      }));
      expect(screen.getByText("2x1 hoy")).toBeInTheDocument();
    }
  );

  it("no muestra ninguna etiqueta cuando el producto no está en promoción", () => {
    const Template = resolveTemplate("modern");
    render(createElement(Template, {
      business, catalogue, categories, products: [productWithPromo({ promo_label: null })], theme,
      coverUrl: null, onCategorySelect: () => {}, showEniuBadge: false,
    }));
    expect(screen.queryByText("2x1 hoy")).not.toBeInTheDocument();
  });
});
