import { describe, expect, it } from "vitest";

import { deriveTokens } from "./themeDefaults";

describe("deriveTokens", () => {
  it("reproduce lo mismo que calcula el backend para los mismos 4 colores", () => {
    // Valores tomados de una corrida real de `catalog.derive_tokens` en el
    // backend con estos mismos colores — si alguno de los dos lados cambia
    // la fórmula sin avisarle al otro, esta prueba lo delata.
    expect(deriveTokens("#FFFDF5", "#FFE05A", "#E8C93D", "#111111")).toEqual({
      surface: "#FFFDF5",
      muted: "#646461",
      price: "#111111",
      category_title: "#111111",
      nav_chip_bg: "#FFE05A",
      nav_chip_text: "#111111",
    });
    expect(deriveTokens("#111111", "#2A2A2A", "#FFE05A", "#FFFFFF")).toEqual({
      surface: "#111111",
      muted: "#ACACAC",
      price: "#FFFFFF",
      category_title: "#FFFFFF",
      nav_chip_bg: "#2A2A2A",
      nav_chip_text: "#FFFFFF",
    });
  });
});
