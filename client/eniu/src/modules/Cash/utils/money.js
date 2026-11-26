/**
 * Importes en centavos enteros. La caja suma y resta muchos pagos; con
 * decimales de punto flotante, 0.1 + 0.2 ya no es 0.3 y el corte "no cuadra"
 * por un centavo fantasma.
 */
const AMOUNT_RE = /^\d{1,9}([.,]\d{0,2})?$/;

/** Lo que la persona escribió, en centavos; `null` si no es un importe. */
export function parseCents(value) {
  const text = String(value ?? "").trim();
  if (text === "") return 0;
  if (!AMOUNT_RE.test(text)) return null;
  const [whole, fraction = ""] = text.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** Centavos al texto que espera la API: "150.50". */
export function centsToAmount(cents) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

/** El texto de la API ("150.50") en centavos. */
export function amountToCents(amount) {
  return parseCents(amount) ?? Math.round(Number(amount || 0) * 100);
}

/** Para mostrar: `formatCurrency` recibe pesos. */
export function centsToNumber(cents) {
  return cents / 100;
}

/** Un porcentaje de un importe, redondeado al centavo. */
export function percentOf(cents, percent) {
  return Math.round((cents * percent) / 100);
}
