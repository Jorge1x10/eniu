import { afterEach, describe, expect, it, vi } from "vitest";

import { preferredCurrency } from "./regions";

/**
 * Qué moneda se enseña en la pantalla del plan.
 *
 * Antes se elegía por idioma —inglés era dólares, español pesos mexicanos—,
 * que es la respuesta equivocada para casi toda Europa: quien vive en Madrid
 * iba a pagar en euros leyera en el idioma que leyera. Stripe decide la
 * moneda real por la ubicación del cliente; esto sólo procura que la cifra
 * anunciada sea la que luego se cobra.
 */
const STRIPE_PRICE = { mxn: 129, usd: 10, eur: 9, gbp: 8 };

afterEach(() => vi.unstubAllGlobals());

describe("moneda con la que se anuncia el plan", () => {
  it.each([
    ["es-ES", "eur"],
    ["en-GB", "gbp"],
    ["en-US", "usd"],
    ["es-MX", "mxn"],
    ["fr-FR", "eur"],
    ["de-DE", "eur"],
  ])("desde %s se anuncia en %s", (locale, expected) => {
    expect(preferredCurrency(STRIPE_PRICE, "mxn", locale)).toBe(expected);
  });

  it("cae a la moneda base cuando el precio no ofrece la del país", () => {
    // Stripe sólo cobra en las monedas que el precio declara; anunciar una
    // que no existe sería prometer un importe que nadie va a cobrar.
    expect(preferredCurrency({ mxn: 129, usd: 10 }, "mxn", "es-ES")).toBe("mxn");
    expect(preferredCurrency(STRIPE_PRICE, "mxn", "ja-JP")).toBe("mxn");
  });

  it("un idioma sin país no inventa una moneda", () => {
    // "es" a secas no dice desde dónde se mira, y "es-419" es Latinoamérica
    // entera, que no comparte moneda.
    expect(preferredCurrency(STRIPE_PRICE, "mxn", "es")).toBe("mxn");
    expect(preferredCurrency(STRIPE_PRICE, "mxn", "es-419")).toBe("mxn");
  });
});
