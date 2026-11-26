import { describe, expect, it } from "vitest";

import { amountToCents, centsToAmount, parseCents, percentOf } from "./money";

describe("importes en centavos", () => {
  it("lee lo que se escribe a mano", () => {
    expect(parseCents("150")).toBe(15000);
    expect(parseCents("150.5")).toBe(15050);
    expect(parseCents("150,05")).toBe(15005);
    expect(parseCents(" 0.10 ")).toBe(10);
    expect(parseCents("")).toBe(0);
  });

  it("rechaza lo que no es un importe", () => {
    for (const value of ["-5", "1e3", "1.234", "abc", "1.2.3", "$10"]) {
      expect(parseCents(value)).toBeNull();
    }
  });

  it("no pierde centavos al sumar", () => {
    const total = [parseCents("0.10"), parseCents("0.20")].reduce((a, b) => a + b, 0);
    expect(centsToAmount(total)).toBe("0.30");
    expect(centsToAmount(-2000)).toBe("-20.00");
    expect(amountToCents("610.00")).toBe(61000);
  });

  it("calcula la propina al centavo", () => {
    expect(percentOf(15050, 10)).toBe(1505);
    expect(percentOf(3333, 15)).toBe(500);
  });
});
