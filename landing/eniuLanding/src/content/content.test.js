import { describe, expect, it } from 'vitest'
import en from './en.js'
import es from './es.js'
import {
  LANGUAGE_CODES,
  contentFor,
  equivalentPath,
  languageFromPath,
  pageKeyFromPath,
  resolveHref,
} from './index.js'

/** Rutas de cada clave hasta las hojas, para comparar dos árboles por forma. */
function shapeOf(value, path = '') {
  if (Array.isArray(value)) {
    // La longitud importa: un titular partido en dos trozos se pinta con dos
    // huecos, y una traducción con tres o con uno rompería el marcado.
    return value.flatMap((item, index) => shapeOf(item, `${path}[${index}]`))
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .flatMap((key) => shapeOf(value[key], path ? `${path}.${key}` : key))
  }
  return [`${path}:${typeof value}`]
}

describe('árbol de contenido', () => {
  it('el inglés y el español tienen exactamente la misma forma', () => {
    // Sin esto, una clave añadida sólo en español revienta la página en
    // inglés al leer una propiedad de `undefined`, y sólo se nota al abrirla.
    //
    // `legal.referenceNotice` es la excepción a propósito: sólo la traducción
    // lleva aviso de versión de referencia, así que en español es `null`.
    const ignored = ['legal.referenceNotice']
    const shape = (tree) =>
      shapeOf({ ...tree, code: '', label: '', shortLabel: '', paths: {}, meta: {}, locale: '' })
        .filter((entry) => !ignored.some((key) => entry.startsWith(`${key}:`)))

    const spanish = shape(es)
    const english = shape(en)

    const onlyInSpanish = spanish.filter((key) => !english.includes(key))
    const onlyInEnglish = english.filter((key) => !spanish.includes(key))

    expect({ onlyInSpanish, onlyInEnglish }).toEqual({ onlyInSpanish: [], onlyInEnglish: [] })
  })

  it('cada idioma declara una ruta propia para cada página', () => {
    const keys = ['home', 'onboarding', 'support', 'terms', 'privacy']
    const seen = new Set()

    for (const code of LANGUAGE_CODES) {
      for (const key of keys) {
        const path = contentFor(code).paths[key]
        expect(path, `${code}.paths.${key}`).toBeTruthy()
        expect(seen.has(path), `la ruta ${path} está repetida`).toBe(false)
        seen.add(path)
      }
    }
  })

  it('ninguna cadena en inglés se quedó en español', () => {
    // No detecta una mala traducción, pero sí la que nadie tocó.
    //
    // Lo exento se escribe igual en los dos idiomas a propósito: nombres
    // propios de platos y marcas, y las duraciones de la guía, donde "5 min"
    // ya es la forma en ambos.
    const shared = new Set(['Casa Nopal', 'Café de olla', 'Inter', 'Poppins', 'Lora', 'Playfair Display', 'Eniu'])
    const ignoredPaths = [/^onboarding\.steps\[\d+\]\.minutes$/]
    const leftovers = []

    const walk = (spanish, english, path = '') => {
      if (typeof spanish === 'string' && typeof english === 'string') {
        const exempt = shared.has(spanish) || ignoredPaths.some((rule) => rule.test(path))
        if (spanish === english && spanish.includes(' ') && !exempt) {
          leftovers.push(`${path}: ${spanish}`)
        }
        return
      }
      if (Array.isArray(spanish) && Array.isArray(english)) {
        spanish.forEach((item, index) => walk(item, english[index], `${path}[${index}]`))
        return
      }
      if (spanish && english && typeof spanish === 'object') {
        for (const key of Object.keys(spanish)) {
          walk(spanish[key], english[key], path ? `${path}.${key}` : key)
        }
      }
    }

    walk({ ...es, paths: {}, code: '', label: '', shortLabel: '' }, { ...en, paths: {}, code: '', label: '', shortLabel: '' })
    expect(leftovers).toEqual([])
  })
})

describe('rutas por idioma', () => {
  it('deduce el idioma del prefijo de la ruta', () => {
    expect(languageFromPath('/')).toBe('es')
    expect(languageFromPath('/primeros-pasos')).toBe('es')
    expect(languageFromPath('/en')).toBe('en')
    expect(languageFromPath('/en/')).toBe('en')
    expect(languageFromPath('/en/getting-started')).toBe('en')
    // `/english` no es el prefijo de idioma, es otra ruta cualquiera.
    expect(languageFromPath('/english')).toBe('es')
  })

  it('reconoce cada página en los dos idiomas', () => {
    expect(pageKeyFromPath('/')).toBe('home')
    expect(pageKeyFromPath('/terminos')).toBe('terms')
    expect(pageKeyFromPath('/en')).toBe('home')
    expect(pageKeyFromPath('/en/terms')).toBe('terms')
    expect(pageKeyFromPath('/no-existe')).toBe(null)
  })

  it('cambiar de idioma conserva la página y el ancla', () => {
    expect(equivalentPath('/terminos', '', 'en')).toBe('/en/terms')
    expect(equivalentPath('/en/getting-started', '', 'es')).toBe('/primeros-pasos')
    expect(equivalentPath('/', '#planes', 'en')).toBe('/en#planes')
    // Una ruta desconocida lleva a la portada del idioma pedido, no a un 404.
    expect(equivalentPath('/no-existe', '', 'en')).toBe('/en')
  })

  it('resuelve destinos al idioma en curso', () => {
    expect(resolveHref('onboarding', 'es')).toBe('/primeros-pasos')
    expect(resolveHref('onboarding', 'en')).toBe('/en/getting-started')
    expect(resolveHref('#planes', 'es')).toBe('/#planes')
    expect(resolveHref('#planes', 'en')).toBe('/en#planes')
    expect(resolveHref('https://eniu.app', 'en')).toBe('https://eniu.app')
    expect(resolveHref('mailto:hola@eniu.app', 'en')).toBe('mailto:hola@eniu.app')
  })
})
