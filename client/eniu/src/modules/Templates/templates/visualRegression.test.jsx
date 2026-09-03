import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_THEME } from "../utils/themeDefaults";
import { TEMPLATE_OPTIONS, resolveTemplate } from "./templateRegistry";

/**
 * Congela el HTML que cada plantilla produce hoy con un set de datos fijo.
 *
 * El rediseño reemplaza los 8 componentes hardcodeados por un renderer
 * genérico dirigido por datos; esta prueba es la que garantiza que ese
 * cambio de implementación no mueve un solo píxel de lo que ya ve un menú
 * publicado. Si algún día una plantilla cambia de intención a propósito,
 * hay que actualizar el snapshot junto con el cambio, no antes.
 */
const business = { name: "Café Aurora", description: "Café de especialidad" };
const catalogue = { name: "Carta principal", description: "Temporada de otoño" };
const categories = [
  { id: "cat-1", name: "Bebidas", tracking_key: "cat-1-key" },
  { id: "cat-2", name: "Postres", tracking_key: "cat-2-key" },
];
const products = [
  {
    id: "prod-1", category_id: "cat-1", tracking_key: "prod-1-key",
    name: "Latte de avena", description: "Espresso doble con leche de avena", price: "68.00",
    is_available: true, image_url: "https://example.test/latte.jpg",
  },
  {
    id: "prod-2", category_id: "cat-1", tracking_key: "prod-2-key",
    name: "Té de manzanilla", description: null, price: null,
    is_available: false, image_url: null,
  },
  {
    id: "prod-3", category_id: "cat-2", tracking_key: "prod-3-key",
    name: "Pay de queso", description: "Con coulis de zarzamora", price: "95.00",
    is_available: true, image_url: null,
  },
];
const theme = {
  ...DEFAULT_THEME,
  cover_image_url: null,
  color_preset_key: "classic",
  theme_overrides: {},
  tokens: {
    background: "#FFFDF5", primary: "#FFE05A", accent: "#E8C93D", text: "#111111",
    surface: "#FFFDF5", muted: "#6B6B6B", price: "#111111", category_title: "#111111",
    nav_chip_bg: "#FFE05A", nav_chip_text: "#111111",
  },
};

describe("plantillas: regresión visual", () => {
  TEMPLATE_OPTIONS.forEach(({ key }) => {
    it(`la plantilla "${key}" no cambia su salida`, () => {
      const Template = resolveTemplate(key);
      const { container } = render(
        createElement(Template, {
          business, catalogue, categories, products, theme,
          coverUrl: null, onCategorySelect: () => {}, showEniuBadge: false,
        })
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });
});
