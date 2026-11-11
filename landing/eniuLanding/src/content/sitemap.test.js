import { describe, expect, it } from 'vitest'

import { buildSitemap } from '../../scripts/sitemap.mjs'
import { LANGUAGE_CODES, PAGE_KEYS, contentFor } from './index.js'

/**
 * El sitemap se genera de la tabla de rutas, y esta prueba es lo que garantiza
 * que sigue cubriéndolas todas.
 *
 * El anterior estaba escrito a mano y listaba sólo las cinco páginas en
 * español: las cinco en inglés existían, se servían y nadie se las había dicho
 * a Google. Una página nueva, o un idioma nuevo, volvería a caer en lo mismo
 * si nadie vigila.
 */
describe('sitemap', () => {
  const xml = buildSitemap()

  it('incluye cada página en cada idioma', () => {
    const faltan = []
    for (const code of LANGUAGE_CODES) {
      for (const key of PAGE_KEYS) {
        const url = new URL(contentFor(code).paths[key], 'https://eniu.app').href
        if (!xml.includes(`<loc>${url}</loc>`)) faltan.push(`${code}.${key} → ${url}`)
      }
    }
    expect(faltan).toEqual([])
  })

  it('no lista ninguna URL de más ni repetida', () => {
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
    expect(locs).toHaveLength(LANGUAGE_CODES.length * PAGE_KEYS.length)
    expect(new Set(locs).size).toBe(locs.length)
  })

  it('cada entrada declara sus alternativas y un x-default', () => {
    // Sin esto Google trata las dos versiones como páginas distintas que
    // compiten entre sí, en vez de como la misma página en dos idiomas.
    const entradas = xml.split('<url>').slice(1)
    for (const entrada of entradas) {
      for (const code of LANGUAGE_CODES) {
        expect(entrada).toContain(`hreflang="${code}"`)
      }
      expect(entrada).toContain('hreflang="x-default"')
    }
  })

  it('es XML válido y bien formado', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect((xml.match(/<url>/g) || []).length).toBe((xml.match(/<\/url>/g) || []).length)
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true)
  })
})
