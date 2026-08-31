import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { RouterContext, useRouter } from './routerContext.js'
import { LanguageContext } from './languageContext.js'
import { contentFor, languageFromPath, resolveHref } from './content/index.js'

// Enrutado mínimo con la History API: el sitio son tres páginas y no vale la
// pena sumar una dependencia. El worker de `server/index.js` ya devuelve
// index.html para cualquier ruta sin extensión, así que /primeros-pasos y
// /terminos funcionan también al recargar o al compartir el enlace.

function currentRoute(key = 0) {
  return { path: window.location.pathname, hash: window.location.hash, key }
}

export function RouterProvider({ children }) {
  const [route, setRoute] = useState(() => currentRoute())

  useEffect(() => {
    const onPopState = () => setRoute((previous) => currentRoute(previous.key + 1))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // En capa de layout y sin animación: al cambiar de página el navegador
  // reancla el desplazamiento y cancelaría un scroll suave a medio camino.
  useLayoutEffect(() => {
    const target = route.hash ? document.querySelector(route.hash) : null
    if (target) {
      target.scrollIntoView({ behavior: route.key === 0 ? 'auto' : 'smooth', block: 'start' })
      return
    }
    if (route.key > 0) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [route])

  const navigate = useCallback((to) => {
    const url = new URL(to, window.location.origin)
    window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
    setRoute((previous) => ({ path: url.pathname, hash: url.hash, key: previous.key + 1 }))
  }, [])

  const value = useMemo(() => ({ ...route, navigate }), [route, navigate])

  // El idioma se deduce de la ruta y no de un estado aparte: así la dirección
  // es siempre la verdad, y compartir un enlace comparte también el idioma.
  const language = languageFromPath(route.path)
  const languageValue = useMemo(
    () => ({ language, content: contentFor(language) }),
    [language],
  )

  return (
    <RouterContext.Provider value={value}>
      <LanguageContext.Provider value={languageValue}>
        {children}
      </LanguageContext.Provider>
    </RouterContext.Provider>
  )
}

/**
 * Enlace interno que se queda en el idioma en curso.
 *
 * `href` admite una clave de página (`"onboarding"`), un ancla (`"#planes"`) o
 * una ruta literal. Declarar el destino por clave evita que un enlace escrito
 * a mano mande a alguien que lee en inglés de vuelta a la versión en español.
 */
export function Link({ href, onClick, children, ...rest }) {
  const { navigate } = useRouter()
  const { language } = useContext(LanguageContext)
  const target = resolveHref(href, language)

  function handleClick(event) {
    onClick?.(event)
    const external = /^(https?:|mailto:|tel:)/.test(target)
    if (external || event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(target)
  }

  return <a href={target} onClick={handleClick} {...rest}>{children}</a>
}
