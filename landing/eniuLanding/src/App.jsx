import { useEffect } from 'react'
import './App.css'
import { RouterProvider } from './router.jsx'
import { useRouter } from './routerContext.js'
import { useLanguage } from './languageContext.js'
import { useReveal } from './useReveal.js'
import { equivalentPath, pageKeyFromPath } from './content/index.js'
import { pageMeta } from './content/routes.js'
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

/** Crea la etiqueta si no existe y le pone el valor. */
function upsert(selector, create, attribute, value) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = create()
    document.head.append(element)
  }
  element.setAttribute(attribute, value)
  return element
}

function meta(kind, name, content) {
  upsert(`meta[${kind}="${name}"]`, () => {
    const element = document.createElement('meta')
    element.setAttribute(kind, name)
    return element
  }, 'content', content)
}

/**
 * Mantiene al día lo que los buscadores y las redes leen de la página.
 *
 * El HTML que sirve el build ya trae estas etiquetas con el valor correcto de
 * cada ruta; esto las vuelve a poner al navegar dentro del sitio, donde no hay
 * recarga y el `<head>` se quedaría con el de la página anterior.
 *
 * El canonical es el que más importa: mientras estuvo clavado a la portada,
 * `/primeros-pasos` y todo el espejo en inglés se declaraban duplicados de la
 * raíz, y un canonical que contradice al `hreflang` gana. Por eso `/en` no se
 * indexaba.
 */
function useDocumentHead(pageKey, language) {
  useEffect(() => {
    const page = pageMeta(pageKey, language)

    document.title = page.title
    document.documentElement.lang = page.language

    meta('name', 'description', page.description)
    upsert('link[rel="canonical"]', () => {
      const link = document.createElement('link')
      link.rel = 'canonical'
      return link
    }, 'href', page.canonical)

    meta('property', 'og:url', page.canonical)
    meta('property', 'og:title', page.title)
    meta('property', 'og:description', page.description)
    meta('property', 'og:locale', page.locale)
    meta('name', 'twitter:title', page.title)
    meta('name', 'twitter:description', page.description)

    // Los `hreflang` se rehacen enteros en cada página: son pocos y así no hay
    // que reconciliar los que sobran de la anterior.
    const alternates = page.alternates.map(({ hreflang, href }) => {
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = hreflang
      link.href = href
      document.head.append(link)
      return link
    })

    return () => alternates.forEach((link) => link.remove())
  }, [pageKey, language])
}

function Site() {
  const { path, hash, key, navigate } = useRouter()
  const { language } = useLanguage()

  const pageKey = pageKeyFromPath(path)
  const Page = pages[pageKey || 'home']

  useReveal(key)
  useDocumentHead(pageKey || 'home', language)

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
