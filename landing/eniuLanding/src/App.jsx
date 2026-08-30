import { useEffect } from 'react'
import './App.css'
import { RouterProvider } from './router.jsx'
import { useRouter } from './routerContext.js'
import { useLanguage } from './languageContext.js'
import { useReveal } from './useReveal.js'
import { LANGUAGE_CODES, contentFor, equivalentPath, pageKeyFromPath } from './content/index.js'
import { SiteFooter, SiteHeader } from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Privacy from './pages/Privacy.jsx'
import Support from './pages/Support.jsx'
import Terms from './pages/Terms.jsx'

const pages = {
  home: Home,
  onboarding: Onboarding,
  support: Support,
  privacy: Privacy,
  terms: Terms,
}

/**
 * Mantiene al día lo que los buscadores leen de la página.
 *
 * `lang` en el `<html>` es lo que usan los lectores de pantalla para elegir
 * pronunciación, y las etiquetas `hreflang` son las que le dicen a Google que
 * `/` y `/en` son la misma página en dos idiomas y no contenido duplicado.
 * Sin ellas, servir ambos desde un mismo dominio sí penalizaría.
 */
function useDocumentLanguage(pageKey, language, title) {
  useEffect(() => {
    document.title = title
    document.documentElement.lang = language
  }, [title, language])

  useEffect(() => {
    const links = LANGUAGE_CODES.map((code) => {
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = code
      link.href = new URL(
        contentFor(code).paths[pageKey] || contentFor(code).paths.home,
        window.location.origin,
      ).href
      document.head.appendChild(link)
      return link
    })

    // `x-default` es lo que se sirve a quien no encaja en ningún idioma
    // declarado; apunta al español, que es el original.
    const fallback = document.createElement('link')
    fallback.rel = 'alternate'
    fallback.hreflang = 'x-default'
    fallback.href = new URL(contentFor('es').paths[pageKey] || '/', window.location.origin).href
    document.head.appendChild(fallback)
    links.push(fallback)

    return () => links.forEach((link) => link.remove())
  }, [pageKey])
}

function Site() {
  const { path, hash, key, navigate } = useRouter()
  const { language, content } = useLanguage()

  const pageKey = pageKeyFromPath(path)
  const Page = pages[pageKey || 'home']

  useReveal(key)
  useDocumentLanguage(pageKey || 'home', language, content.meta[pageKey || 'home'])

  // Una ruta desconocida cae a la portada, pero a la del idioma que pedía:
  // quien escribe mal una dirección en inglés no debería acabar en español.
  useEffect(() => {
    if (pageKey) return
    const home = equivalentPath(path, hash, language)
    if (path !== home) navigate(home)
  }, [pageKey, path, hash, language, navigate])

  return (
    <div className="site-shell">
      <SiteHeader />
      <Page />
      <SiteFooter />
    </div>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <Site />
    </RouterProvider>
  )
}
