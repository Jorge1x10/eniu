// Atribución de campañas entre `eniu.app` y `app.eniu.app`.
//
// El registro no ocurre en este sitio: el CTA se va a `app.eniu.app`, que es
// otro subdominio. Los dos cuelgan del mismo dominio registrable, así que una
// cookie escrita en `.eniu.app` se lee desde la app sin pasar nada por la
// dirección. Los parámetros se propagan igual en el enlace porque una cookie
// se puede bloquear, y una campaña sin origen no se puede medir.
//
// Las funciones de abajo son puras y reciben lo que leerían del navegador; los
// envoltorios del final son los que tocan `document` y `window`.

const COOKIE_NAME = 'eniu_attr'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90

// `gclid`, `fbclid` y `ttclid` los añade la propia plataforma al hacer clic:
// sirven para conciliar con su panel cuando la UTM se perdió por el camino.
export const CAMPAIGN_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'ttclid',
]

// Un valor largo no aporta nada y una cookie tiene 4 KB para todo el dominio.
const MAX_VALUE_LENGTH = 120

/** Los parámetros de campaña presentes en una cadena de consulta. */
export function parseCampaign(search) {
  const params = new URLSearchParams(search || '')
  const found = {}
  for (const key of CAMPAIGN_PARAMS) {
    const value = params.get(key)
    if (value) found[key] = value.slice(0, MAX_VALUE_LENGTH)
  }
  return found
}

/**
 * De dónde venía la visita, sin la consulta del sitio que enlazó.
 *
 * Se guarda sólo el origen: la ruta y los parámetros del sitio de origen no
 * hacen falta para atribuir y pueden traer datos de terceros que no queremos.
 * Un salto entre páginas del propio sitio no es un origen.
 */
export function cleanReferrer(referrer, host) {
  if (!referrer) return ''
  try {
    const url = new URL(referrer)
    if (host && (url.hostname === host || url.hostname.endsWith(`.${host}`))) return ''
    return url.origin
  } catch {
    return ''
  }
}

/**
 * La atribución que corresponde guardar tras una visita.
 *
 * Gana el último clic con campaña: si la visita trae parámetros, sustituyen a
 * lo anterior; si no los trae, se conserva lo guardado. Así una visita directa
 * posterior no borra la campaña que trajo a esa persona.
 */
export function buildAttribution({
  search = '',
  referrer = '',
  pathname = '/',
  host = '',
  now = Date.now(),
  stored = null,
} = {}) {
  const campaign = parseCampaign(search)
  if (Object.keys(campaign).length === 0) return stored

  return {
    ...campaign,
    referrer: cleanReferrer(referrer, host),
    landing: pathname,
    ts: new Date(now).toISOString(),
  }
}

export function serializeAttribution(value) {
  return encodeURIComponent(JSON.stringify(value))
}

export function deserializeAttribution(raw) {
  if (!raw) return null
  try {
    const value = JSON.parse(decodeURIComponent(raw))
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

/** Lee una cookie de una cadena `document.cookie`. */
export function readCookie(jar, name = COOKIE_NAME) {
  for (const part of (jar || '').split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1)
  }
  return null
}

/**
 * La cookie a escribir, ya formada.
 *
 * `domain` sólo se declara cuando el host cuelga de `eniu.app`: escribirlo
 * desde `localhost` o desde una vista previa de Vercel hace que el navegador
 * descarte la cookie entera y la atribución se pierda en silencio.
 */
export function cookieString(value, { hostname = '', secure = true, name = COOKIE_NAME } = {}) {
  const shared = hostname === 'eniu.app' || hostname.endsWith('.eniu.app')
  return [
    `${name}=${serializeAttribution(value)}`,
    'path=/',
    `max-age=${MAX_AGE_SECONDS}`,
    'samesite=lax',
    shared ? 'domain=.eniu.app' : '',
    secure ? 'secure' : '',
  ].filter(Boolean).join('; ')
}

/**
 * Añade los parámetros a una dirección sin pisar los que ya trae.
 *
 * Un destino que no es http —el marcador `#empieza` mientras no hay app
 * configurada— se devuelve tal cual: no hay dirección a la que añadir nada.
 */
export function appendParams(url, params) {
  if (!/^https?:/i.test(url || '')) return url
  const target = new URL(url)
  for (const [key, value] of Object.entries(params || {})) {
    if (value && !target.searchParams.has(key)) target.searchParams.set(key, value)
  }
  return target.toString()
}

/** Sólo los parámetros de campaña de una atribución guardada. */
export function campaignOf(attribution) {
  if (!attribution) return {}
  const campaign = {}
  for (const key of CAMPAIGN_PARAMS) {
    if (attribution[key]) campaign[key] = attribution[key]
  }
  return campaign
}

// --- Envoltorios del navegador -------------------------------------------

/** La atribución guardada, o null si no hay ninguna. */
export function storedAttribution() {
  if (typeof document === 'undefined') return null
  return deserializeAttribution(readCookie(document.cookie))
}

/**
 * Guarda el origen de esta visita. Se llama una vez, al arrancar.
 *
 * Devuelve lo que quedó guardado para que quien llame pueda medirlo sin
 * volver a leer la cookie.
 */
export function captureAttribution() {
  if (typeof window === 'undefined') return null

  const stored = storedAttribution()
  const next = buildAttribution({
    search: window.location.search,
    referrer: document.referrer,
    pathname: window.location.pathname,
    host: window.location.hostname,
    stored,
  })

  if (next && next !== stored) {
    document.cookie = cookieString(next, {
      hostname: window.location.hostname,
      secure: window.location.protocol === 'https:',
    })
  }

  return next
}

/**
 * El destino del CTA con el origen de la visita colgado.
 *
 * Toma los parámetros de la dirección actual y, si no hay, los de la cookie:
 * quien llegó por un anuncio hace tres días y hoy entra directo sigue
 * contando para esa campaña.
 */
export function withAttribution(url) {
  if (typeof window === 'undefined') return url
  const current = parseCampaign(window.location.search)
  const params = Object.keys(current).length ? current : campaignOf(storedAttribution())
  return appendParams(url, params)
}
