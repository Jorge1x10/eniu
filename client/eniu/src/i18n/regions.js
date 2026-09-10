import { currentLocale } from "./formats";

/**
 * Listas de monedas y zonas horarias, tomadas del propio navegador.
 *
 * `Intl.supportedValuesOf` devuelve las monedas ISO 4217 y las zonas IANA que
 * el motor conoce. Se prefiere a una lista escrita en el repositorio porque
 * ésa envejece —nacen monedas, se redenominan, cambian los husos de un
 * país— y porque escribirla completa a mano para vender fuera de México
 * significaría mantener cuatrocientas entradas sin ganar nada.
 *
 * Los respaldos son deliberadamente cortos: sólo cubren el navegador viejo
 * que no implemente la función, y contienen los mercados donde Eniu opera
 * hoy para que el formulario nunca aparezca vacío.
 */
const FALLBACK_CURRENCIES = ["MXN", "USD", "EUR", "GBP", "CAD", "COP", "ARS", "CLP", "BRL", "PEN"];
const FALLBACK_TIMEZONES = [
  "America/Mexico_City", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Bogota", "America/Argentina/Buenos_Aires",
  "America/Santiago", "America/Sao_Paulo", "America/Lima",
  "Europe/Madrid", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Europe/Rome", "Europe/Lisbon", "UTC",
];

function supportedValues(key, fallback) {
  try {
    const values = Intl.supportedValuesOf(key);
    return values.length ? values : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Monedas con su nombre en el idioma de quien mira.
 *
 * Ordenadas por ese nombre y no por el código: quien busca euros mira la "e",
 * no la "E" de EUR.
 */
export function currencyOptions(locale = currentLocale()) {
  let names;
  try {
    names = new Intl.DisplayNames(locale, { type: "currency" });
  } catch {
    names = null;
  }
  return supportedValues("currency", FALLBACK_CURRENCIES)
    .map((code) => ({ code, label: names ? `${names.of(code)} (${code})` : code }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

/** Zonas horarias IANA, ordenadas como se leen. */
export function timezoneOptions() {
  const zones = supportedValues("timeZone", FALLBACK_TIMEZONES);
  // `UTC` no siempre viene en la lista del motor y es una elección legítima
  // para quien no quiere que sus analíticas dependan de un país.
  const withUtc = zones.includes("UTC") ? zones : [...zones, "UTC"];
  return [...withUtc].sort((a, b) => a.localeCompare(b));
}
