import { getLocales } from 'expo-localization';

import { currentLocale } from '@/i18n/formats';

/**
 * Listas de monedas y zonas horarias, tomadas del propio dispositivo.
 *
 * `Intl.supportedValuesOf` devuelve las monedas ISO 4217 y las zonas IANA que
 * el motor conoce. Se prefiere a una lista escrita en el repositorio porque
 * ésa envejece —nacen monedas, se redenominan, cambian los husos de un país—
 * y mantener a mano cuatrocientas entradas no aporta nada.
 *
 * Los respaldos son deliberadamente cortos: cubren el motor que no implemente
 * la función y contienen los mercados donde Eniu opera hoy, para que el
 * selector nunca aparezca vacío.
 */
const FALLBACK_CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP', 'CAD', 'COP', 'ARS', 'CLP', 'BRL', 'PEN'];
const FALLBACK_TIMEZONES = [
  'America/Mexico_City', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Bogota', 'America/Argentina/Buenos_Aires',
  'America/Santiago', 'America/Sao_Paulo', 'America/Lima',
  'Europe/Madrid', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Rome', 'Europe/Lisbon', 'UTC',
];

export type Choice = { value: string; label: string };

function supportedValues(key: 'currency' | 'timeZone', fallback: string[]): string[] {
  try {
    // `supportedValuesOf` es reciente y no todos los motores de React Native
    // la traen; el respaldo evita que el selector quede vacío donde falte.
    const values = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(key);
    return values?.length ? values : fallback;
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
export function currencyChoices(locale: string = currentLocale()): Choice[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'currency' });
  } catch {
    names = null;
  }
  return supportedValues('currency', FALLBACK_CURRENCIES)
    .map((code) => ({ value: code, label: names ? `${names.of(code)} (${code})` : code }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

/** Zonas horarias IANA, ordenadas como se leen. */
export function timezoneChoices(): Choice[] {
  const zones = supportedValues('timeZone', FALLBACK_TIMEZONES);
  // `UTC` no siempre viene en la lista del motor y es una elección legítima
  // para quien no quiere que sus analíticas dependan de un país.
  const withUtc = zones.includes('UTC') ? zones : [...zones, 'UTC'];
  return [...withUtc].sort((a, b) => a.localeCompare(b)).map((zone) => ({ value: zone, label: zone }));
}

/**
 * Moneda que el teléfono declara para su región.
 *
 * Sirve para proponerla al dar de alta un negocio, en vez de estrenar a todo
 * el mundo en pesos mexicanos y esperar a que lo note. Es una propuesta y no
 * una decisión: se cambia en Ajustes, y hay quien cobra en una moneda
 * distinta a la de donde vive.
 */
export function deviceCurrency(): string {
  for (const locale of getLocales()) {
    const code = locale.currencyCode;
    if (code && code.length === 3) return code.toUpperCase();
  }
  return 'MXN';
}
