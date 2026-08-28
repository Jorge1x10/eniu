import { describe, expect, it } from "vitest";

import { adaptPublicMenu } from "./publicMenuAdapter";

const menu = {
  business: { name: "Café Central", description: null },
  catalogue: { name: "Menú principal", description: null },
  template: { key: "modern", theme: {} },
  categories: [],
  uncategorized_products: [],
};

describe("adaptPublicMenu", () => {
  it("lleva la marca de Eniu cuando el backend la pide", () => {
    const adapted = adaptPublicMenu({ ...menu, branding: { show_eniu_badge: true } });
    expect(adapted.showEniuBadge).toBe(true);
  });

  it("la oculta en los planes de pago", () => {
    const adapted = adaptPublicMenu({ ...menu, branding: { show_eniu_badge: false } });
    expect(adapted.showEniuBadge).toBe(false);
  });

  it("no la muestra si la respuesta no trae branding", () => {
    // Un backend viejo no debe hacer aparecer la marca en un menú de pago.
    expect(adaptPublicMenu(menu).showEniuBadge).toBe(false);
  });
});
