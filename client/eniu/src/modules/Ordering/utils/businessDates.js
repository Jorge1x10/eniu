/**
 * Fechas en la zona del negocio, en el formato `AAAA-MM-DD` que espera la API.
 *
 * "Hoy" lo decide el restaurante, no el navegador de quien mira: un local de
 * Madrid cierra el día a medianoche en Madrid aunque su dueño lo consulte
 * desde México. `en-CA` escribe justo `AAAA-MM-DD`.
 */
export function todayIn(timezone) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || undefined, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
}

/** Los últimos `days` días hasta hoy, incluido. Mediodía UTC para no tropezar con el horario de verano. */
export function lastDays(days, timezone) {
  const to = todayIn(timezone);
  const start = new Date(`${to}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to };
}
