import { writeFile } from 'node:fs/promises'

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  PAGE_KEYS,
  contentFor,
} from '../src/content/index.js'

/**
 * El sitemap, generado de las mismas rutas que sirve el sitio.
 *
 * Antes era un archivo escrito a mano en `public/`, y listaba sólo las cinco
 * páginas en español: las cinco en inglés existían, se servían y nadie se las
 * había dicho a Google. Un sitemap a mano al lado de una tabla de rutas es una
 * copia que se desincroniza sola, así que se calcula de la tabla.
 *
 * Cada página sale una vez por idioma, y cada entrada declara sus alternativas
 * con `hreflang`. Es la vía fiable para decirlo: `App.jsx` también las inyecta
 * en el `<head>`, pero lo hace desde JavaScript, y un rastreador puede no
 * llegar a ejecutarlo.
 */
const BASE = 'https://eniu.app'

function url(ruta) {
  return new URL(ruta, BASE).href
}

function alternativas(pageKey) {
  const enlaces = LANGUAGE_CODES.map(
    (code) =>
      `    <xhtml:link rel="alternate" hreflang="${code}" href="${url(contentFor(code).paths[pageKey])}"/>`,
  )
  // `x-default` es lo que se sirve a quien no encaja en ningún idioma
  // declarado; apunta al español, que es el original.
  enlaces.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(contentFor(DEFAULT_LANGUAGE).paths[pageKey])}"/>`,
  )
  return enlaces.join('\n')
}

export function buildSitemap() {
  const entradas = PAGE_KEYS.flatMap((pageKey) =>
    LANGUAGE_CODES.map((code) =>
      [
        '  <url>',
        `    <loc>${url(contentFor(code).paths[pageKey])}</loc>`,
        alternativas(pageKey),
        '  </url>',
      ].join('\n'),
    ),
  )

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entradas,
    '</urlset>',
    '',
  ].join('\n')
}

export async function writeSitemap(destino) {
  await writeFile(destino, buildSitemap())
}

// Suelto imprime el resultado, para poder mirarlo sin compilar el sitio.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(buildSitemap())
}
