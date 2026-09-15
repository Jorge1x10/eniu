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

/**
 * Países cuya moneda ofrece Stripe para el plan, y cuál es.
 *
 * No hay API del navegador que traduzca un país a su moneda, así que esta
 * tabla es a mano. Se mantiene corta a propósito: sólo los mercados donde
 * Eniu se vende, y cualquier equivocación es inofensiva porque
 * `preferredCurrency` únicamente devuelve monedas que el precio de Stripe
 * declara —si la tabla se queda atrás, se cae al valor por omisión en vez de
 * enseñar un importe inventado.
 */
const EUROZONE = [
  "AD", "AT", "BE", "BG", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE",
  "IT", "LV", "LT", "LU", "MT", "MC", "ME", "NL", "PT", "SM", "SK", "SI",
  "ES", "VA", "XK",
];
const REGION_CURRENCIES = {
  ...Object.fromEntries(EUROZONE.map((region) => [region, "EUR"])),
  GB: "GBP", US: "USD", MX: "MXN", CA: "CAD", CO: "COP",
  AR: "ARS", CL: "CLP", BR: "BRL", PE: "PEN", UY: "UYU",
};

/** Código de país del locale en curso, o null si el navegador no lo declara. */
function currentRegion(locale = currentLocale()) {
  // Se descarta el primer trozo, que es el idioma: en "es" a secas mide dos
  // letras igual que un país y se leería como España.
  const subtags = locale.split("-").slice(1);
  // "es-419" es Latinoamérica entera, no un país: no dice qué moneda usar, y
  // por eso se exigen letras y no dígitos.
  const region = subtags.find((part) => part.length === 2 && /^[A-Za-z]+$/.test(part));
  return region ? region.toUpperCase() : null;
}

/**
 * Moneda en la que conviene enseñar el precio del plan.
 *
 * Quién paga en qué moneda lo decide Stripe al cobrar, según dónde esté el
 * cliente; esto sólo elige qué enseñar antes de llegar ahí. Se guía por el
 * país y no por el idioma, que es lo que hacía antes: quien vive en Madrid y
 * lee en español veía pesos mexicanos, y quien lee en inglés desde ahí,
 * dólares. Ninguno de los dos iba a pagar en esa moneda.
 *
 * `available` son las monedas que el precio de Stripe declara. Si la del país
 * no está entre ellas se devuelve `fallback`, la moneda base del precio.
 */
export function preferredCurrency(available, fallback, locale = currentLocale()) {
  const region = currentRegion(locale);
  const candidate = region ? REGION_CURRENCIES[region] : null;
  const offered = new Set(Object.keys(available || {}).map((code) => code.toLowerCase()));
  return candidate && offered.has(candidate.toLowerCase()) ? candidate.toLowerCase() : fallback;
}
