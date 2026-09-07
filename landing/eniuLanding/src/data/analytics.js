// Medición del landing.
//
// Sin proveedor configurado no hace nada: `track` es un no-op y no se carga
// ningún script. Así el sitio funciona igual en local y en las vistas previas,
// y encender la medición es poner una variable de entorno.
//
// Plausible en lugar de GA4 a propósito: no necesita banner de cookies porque
// no guarda datos personales ni identifica al visitante, y pesa unos 2 KB
// contra los ~90 KB de gtag. Lo que hace falta medir aquí son visitas por
// fuente y clics al CTA, no un embudo de comercio electrónico.

const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN
const SCRIPT = import.meta.env.VITE_PLAUSIBLE_SRC
  || 'https://plausible.io/js/script.tagged-events.outbound-links.js'

export function analyticsEnabled() {
  return Boolean(DOMAIN)
}

/**
 * Carga el script de medición. Se llama una vez, al arrancar.
 *
 * La cola se define antes de inyectar el script para que un clic ocurrido
 * mientras carga no se pierda: es justo el caso del visitante que llega y
 * toca el botón de inmediato.
 */
export function initAnalytics() {
  if (typeof window === 'undefined' || !analyticsEnabled()) return
  if (document.getElementById('eniu-analytics')) return

  window.plausible = window.plausible || function queue() {
    (window.plausible.q = window.plausible.q || []).push(arguments)
  }

  const script = document.createElement('script')
  script.id = 'eniu-analytics'
  script.defer = true
  script.dataset.domain = DOMAIN
  script.src = SCRIPT
  document.head.append(script)
}

/**
 * Registra un evento. Silencioso si no hay proveedor.
 *
 * `props` se manda tal cual: los nombres de propiedad son los que después se
 * ven en el panel, así que se escriben en español como el resto del sitio.
 */
export function track(event, props) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') return
  window.plausible(event, props ? { props } : undefined)
}
