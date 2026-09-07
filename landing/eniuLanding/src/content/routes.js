// Las páginas del sitio con sus etiquetas, en un solo lugar.
//
// Lo lee la aplicación al navegar y el script de prerenderizado al construir.
// Tiene que ser código que corra también en Node —sin `import.meta.env` ni
// nada del navegador— porque el build lo importa directo: si las etiquetas se
// calcularan sólo en el cliente, los rastreadores de WhatsApp y de Facebook,
// que no ejecutan JavaScript, seguirían viendo siempre la portada.

import { LANGUAGE_CODES, PAGE_KEYS, contentFor } from './index.js'

export const SITE_URL = 'https://eniu.app'

// El idioma del contenido tal como lo espera Open Graph, que no usa el código
// corto sino la variante regional.
const LOCALES = { es: 'es_MX', en: 'en_US' }

export function absolute(path) {
  return new URL(path || '/', SITE_URL).href
}

function pathOf(pageKey, language) {
  const content = contentFor(language)
  return content.paths[pageKey] || content.paths.home
}

/**
 * Las direcciones de la misma página en los dos idiomas.
 *
 * `x-default` apunta al español, que es el original. Sin estas etiquetas —o
 * con un canonical que las contradiga— Google trata `/en` como duplicado de
 * la portada y no lo indexa.
 */
export function alternatesFor(pageKey) {
  const links = LANGUAGE_CODES.map((code) => ({
    hreflang: code,
    href: absolute(pathOf(pageKey, code)),
  }))
  links.push({ hreflang: 'x-default', href: absolute(pathOf(pageKey, 'es')) })
  return links
}

/** Todo lo que va en el `<head>` de una página. */
export function pageMeta(pageKey, language) {
  const key = PAGE_KEYS.includes(pageKey) ? pageKey : 'home'
  const content = contentFor(language)
  const path = pathOf(key, language)

  return {
    pageKey: key,
    language,
    locale: LOCALES[language] || LOCALES.es,
    path,
    canonical: absolute(path),
    title: content.meta[key],
    description: content.descriptions[key],
    alternates: alternatesFor(key),
  }
}

/** Las diez páginas del sitio: cinco por idioma. */
export function allRoutes() {
  return LANGUAGE_CODES.flatMap((code) => PAGE_KEYS.map((key) => pageMeta(key, code)))
}
