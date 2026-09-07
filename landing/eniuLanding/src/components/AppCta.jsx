import { appUrl } from '../data/site.js'
import { withAttribution } from '../data/attribution.js'
import { track } from '../data/analytics.js'

/**
 * Enlace al registro de la app.
 *
 * Existe para que ningún CTA se escriba a mano: los tres botones de la
 * portada, el de la barra, el del pie, el de la demo y los de la guía tienen
 * que llevar el origen de la visita pegado y avisar de su clic. Un `<a>`
 * suelto con `href={appUrl}` no lo hace, y es lo que dejaba la campaña sin
 * atribuir.
 *
 * `place` es el nombre con el que ese botón aparece en el panel de medición,
 * para poder distinguir el que convierte del que sólo se ve. `fallback` es a
 * dónde va cuando todavía no hay app configurada.
 */
export default function AppCta({ place, fallback, children, onClick, ...rest }) {
  const external = /^https?:/i.test(appUrl)
  const href = external ? withAttribution(appUrl) : (fallback || appUrl)

  function handleClick(event) {
    track('cta_registro', { lugar: place })
    onClick?.(event)
  }

  return (
    <a {...rest} href={href} onClick={handleClick}>{children}</a>
  )
}
