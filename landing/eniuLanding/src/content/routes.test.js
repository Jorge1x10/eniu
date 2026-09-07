import { describe, expect, it } from 'vitest'
import { PAGE_KEYS, LANGUAGE_CODES, contentFor } from './index.js'
import { allRoutes, pageMeta } from './routes.js'

describe('cabecera de cada página', () => {
  it('las diez páginas tienen título, descripción y canonical propios', () => {
    const routes = allRoutes()
    expect(routes).toHaveLength(PAGE_KEYS.length * LANGUAGE_CODES.length)

    const canonicals = new Set()
    for (const page of routes) {
      expect(page.title, `${page.language}.${page.pageKey}.title`).toBeTruthy()
      expect(page.description, `${page.language}.${page.pageKey}.description`).toBeTruthy()
      // Un canonical repetido es el error que teníamos: todas las rutas
      // apuntando a la portada le dicen a Google que son duplicados.
      expect(canonicals.has(page.canonical), `canonical repetido: ${page.canonical}`).toBe(false)
      canonicals.add(page.canonical)
    }
  })

  it('el canonical de cada página es su propia dirección', () => {
    expect(pageMeta('home', 'es').canonical).toBe('https://eniu.app/')
    expect(pageMeta('onboarding', 'es').canonical).toBe('https://eniu.app/primeros-pasos')
    expect(pageMeta('home', 'en').canonical).toBe('https://eniu.app/en')
    expect(pageMeta('terms', 'en').canonical).toBe('https://eniu.app/en/terms')
  })

  it('los hreflang emparejan la misma página en los dos idiomas', () => {
    expect(pageMeta('onboarding', 'en').alternates).toEqual([
      { hreflang: 'es', href: 'https://eniu.app/primeros-pasos' },
      { hreflang: 'en', href: 'https://eniu.app/en/getting-started' },
      { hreflang: 'x-default', href: 'https://eniu.app/primeros-pasos' },
    ])
  })

  it('el hreflang de una página coincide con su propio canonical', () => {
    // Si no coinciden, Google se queda con el canonical y descarta el
    // hreflang: es la contradicción que dejaba `/en` fuera del índice.
    for (const page of allRoutes()) {
      const own = page.alternates.find(({ hreflang }) => hreflang === page.language)
      expect(own?.href, `${page.language}.${page.pageKey}`).toBe(page.canonical)
    }
  })

  it('el locale es el que espera Open Graph', () => {
    expect(pageMeta('home', 'es').locale).toBe('es_MX')
    expect(pageMeta('home', 'en').locale).toBe('en_US')
  })

  it('una clave desconocida cae a la portada de ese idioma', () => {
    expect(pageMeta('no-existe', 'en').canonical).toBe('https://eniu.app/en')
  })

  it('cada idioma describe todas sus páginas', () => {
    for (const code of LANGUAGE_CODES) {
      for (const key of PAGE_KEYS) {
        expect(contentFor(code).descriptions[key], `${code}.descriptions.${key}`).toBeTruthy()
      }
    }
  })
})
