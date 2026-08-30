import i18n from '@/i18n';

// Fechas y cantidades se escriben distinto en cada idioma —"5 sept" frente a
// "Sep 5", el punto o la coma decimal—, así que el formato tiene que seguir al
// idioma de la interfaz y no quedarse en el del país donde nació Eniu.
const LOCALES: Record<string, string> = { es: 'es-MX', en: 'en-US' };

export function currentLocale() {
  return LOCALES[i18n.language] ?? LOCALES.es;
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
