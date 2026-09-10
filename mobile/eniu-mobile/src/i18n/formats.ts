import { getLocales } from 'expo-localization';

import i18n from '@/i18n';

// Sólo el último recurso: la región de la que salió Eniu y la de su primer
// mercado en inglés. Lo primero que se intenta es la que declara el teléfono.
const FALLBACK_LOCALES: Record<string, string> = { es: 'es-MX', en: 'en-US' };

/**
 * Locale con el que se escriben fechas y cantidades.
 *
 * El idioma lo elige el usuario; la región la pone su teléfono. Los dos hacen
 * falta y no son lo mismo: el mismo importe en euros es "68,00 €" en `es-ES`
 * y "EUR 68.00" en `es-MX`, y la misma fecha es "5/9" o "9/5" según de qué
 * lado del Atlántico se lea. Atar la región al idioma —como se hacía antes—
 * dejaba a todo hispanohablante escribiendo como en México y a todo
 * angloparlante como en Estados Unidos.
 *
 * Se busca entre los idiomas del teléfono el primero que hable el idioma
 * elegido, para respetar una elección que el usuario hizo a propósito: quien
 * puso Eniu en inglés viviendo en España quiere leerla en inglés, pero con
 * sus fechas y sus euros escritos como allí se escriben.
 */
export function currentLocale() {
  const language = i18n.language;
  for (const locale of getLocales()) {
    const tag = locale.languageTag;
    if (tag && tag.toLowerCase().split('-')[0] === language) return tag;
  }
  return FALLBACK_LOCALES[language] ?? FALLBACK_LOCALES.es;
}

/**
 * Formatea un importe en la moneda del negocio.
 *
 * La moneda es un dato del negocio y no cambia con el idioma: los precios de
 * un restaurante en México siguen siendo pesos aunque su dueño lea la app en
 * inglés. Lo que cambia es cómo se escribe el número.
 */
export function formatCurrency(value: number, currency = 'MXN') {
  return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(currentLocale()).format(value);
}

export function formatDate(value: Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(currentLocale(), options).format(value);
}
