import en from './en.js'
import es from './es.js'

// El español es el idioma por omisión y vive en la raíz; el inglés cuelga de
// `/en`. Se sirven desde el mismo proyecto en lugar de un subdominio aparte
// para no duplicar despliegue, DNS ni configuración: con las etiquetas
// `hreflang` que pone `App.jsx`, Google indexa las dos igual de bien.
export const DEFAULT_LANGUAGE = 'es'
export const LANGUAGES = { es, en }
export const LANGUAGE_CODES = ['es', 'en']

// Cada página tiene una ruta distinta por idioma, así que la equivalencia se
// resuelve por esta clave y no comparando direcciones.
export const PAGE_KEYS = ['home', 'onboarding', 'support', 'terms', 'privacy']

function trimTrailingSlash(path) {
  return path.replace(/\/+$/, '') || '/'
}

export function languageFromPath(path) {
  const clean = trimTrailingSlash(path)
  return clean === '/en' || clean.startsWith('/en/') ? 'en' : DEFAULT_LANGUAGE
}

export function contentFor(language) {
  return LANGUAGES[language] || LANGUAGES[DEFAULT_LANGUAGE]
}

/** Clave de página de una ruta, o null si no corresponde a ninguna. */
export function pageKeyFromPath(path) {
  const clean = trimTrailingSlash(path)
  const content = contentFor(languageFromPath(clean))
  const match = PAGE_KEYS.find((key) => trimTrailingSlash(content.paths[key]) === clean)
  return match || null
}

export function pathFor(pageKey, language) {
  return contentFor(language).paths[pageKey] || contentFor(language).paths.home
}

/**
 * La misma página en el otro idioma, conservando el ancla.
 *
 * Cuando la ruta no es una página conocida se cae al inicio de ese idioma:
 * mandar a alguien a un 404 por cambiar de idioma sería peor que llevarlo a
 * la portada.
 */
export function equivalentPath(path, hash, language) {
  const key = pageKeyFromPath(path) || 'home'
  return `${pathFor(key, language)}${hash || ''}`
}

/**
 * Resuelve un destino de navegación al idioma en curso.
 *
 * Acepta una clave de página (`'onboarding'`), un ancla (`'#planes'`) o una
 * ruta ya escrita. Así los enlaces del sitio se declaran una sola vez en el
 * contenido y siguen apuntando bien en los dos idiomas.
 */
export function resolveHref(target, language) {
  if (!target) return pathFor('home', language)
  if (/^(https?:|mailto:|tel:)/.test(target)) return target

  if (target.startsWith('#')) {
    // Un ancla siempre pertenece a la portada del idioma en curso.
    const home = pathFor('home', language)
    return home === '/' ? `/${target}` : `${home}${target}`
  }

  if (PAGE_KEYS.includes(target)) return pathFor(target, language)
  return target
}
