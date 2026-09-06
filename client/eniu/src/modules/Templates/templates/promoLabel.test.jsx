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

describe("sección \"Promociones de hoy\"", () => {
  const render13 = (layoutKey, products) => {
    const Template = resolveTemplate(layoutKey);
    return render(createElement(Template, {
      business, catalogue, categories, products, theme,
      coverUrl: null, onCategorySelect: () => {}, showEniuBadge: false,
    }));
  };

  it.each(["modern", "minimal", "elegant", "bistro", "bold", "natural", "retro", "luxury", "chalkboard", "magazine", "sidebar", "receipt", "story"])(
    "la plantilla \"%s\" encabeza el menú cuando la promoción lo pide",
    (layoutKey) => {
      render13(layoutKey, [productWithPromo({ promo_featured: true })]);
      // Puede salir más de una vez: como título de la sección y, en las
      // plantillas con barra de categorías, también como filtro.
      expect(screen.getAllByText("Promociones de hoy").length).toBeGreaterThan(0);
      // El producto sale dos veces: en el escaparate y en su categoría.
      expect(screen.getAllByText("Latte de avena")).toHaveLength(2);
    }
  );

  it("no aparece si ninguna promoción pidió encabezar", () => {
    render13("modern", [productWithPromo()]);
    expect(screen.queryAllByText("Promociones de hoy")).toHaveLength(0);
    expect(screen.getAllByText("Latte de avena")).toHaveLength(1);
    // La etiqueta sigue saliendo: encabezar y etiquetar son cosas distintas.
    expect(screen.getByText("2x1 hoy")).toBeInTheDocument();
  });

  it("sólo lleva los productos marcados, no todos los de la promoción", () => {
    render13("modern", [
      productWithPromo({ promo_featured: true }),
      productWithPromo({ id: "prod-2", name: "Café filtrado", promo_label: null }),
    ]);
    expect(screen.getAllByText("Latte de avena")).toHaveLength(2);
    expect(screen.getAllByText("Café filtrado")).toHaveLength(1);
  });
});
