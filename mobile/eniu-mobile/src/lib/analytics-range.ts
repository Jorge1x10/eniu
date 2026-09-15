import { getCalendars } from 'expo-localization';

/**
 * Rangos de fechas para las consultas de analíticas.
 *
 * Existe porque cuatro pantallas armaban el mismo `from`/`to`/`timezone` por
 * su cuenta y las cuatro escribían `America/Mexico_City` a mano: fuera de
 * México eso corta los días donde no toca, y un local de Madrid veía las
 * visitas de "hoy" empezando a las siete de la tarde del día anterior.
 *
 * El día lo decide la zona horaria del negocio, no la del teléfono: quien
 * revisa su restaurante desde otro país sigue queriendo ver los días de su
 * restaurante.
 */

/** Zona del teléfono, para cuando aún no se sabe la del negocio. */
export function deviceTimezone(): string {
  const [calendar] = getCalendars();
  return calendar?.timeZone || 'UTC';
}

/**
 * Hoy, escrito como `AAAA-MM-DD` en la zona indicada.
 *
 * `en-CA` es el locale que escribe las fechas en ese orden, que es justo el
 * que espera la API. Si la zona no se reconoce se usa la del teléfono, antes
 * que dejar la pantalla sin datos.
 */
export function todayIn(timezone: string): string {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  try {
    return new Intl.DateTimeFormat('en-CA', { ...options, timeZone: timezone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', options).format(new Date());
  }
}

/**
 * Cadena de consulta de los últimos `days` días, hoy incluido.
 *
 * Se resta sobre el mediodía UTC y no sobre la medianoche: restar días desde
 * las 00:00 puede caer dentro de un cambio de horario de verano y correr la
 * fecha un día entero.
 */
export function analyticsRange(days: number, timezone?: string | null): string {
  const zone = timezone || deviceTimezone();
  const to = todayIn(zone);
  const from = new Date(`${to}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - days + 1);
  return `from=${from.toISOString().slice(0, 10)}&to=${to}&timezone=${encodeURIComponent(zone)}`;
}
