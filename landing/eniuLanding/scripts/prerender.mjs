// Escribe un HTML por página con sus propias etiquetas de cabecera.
//
// El sitio es una aplicación de una sola página: sin esto, `dist/index.html`
// es lo único que existe y todas las rutas se sirven con el `<title>`, la
// descripción, el canonical y las etiquetas Open Graph de la portada. Google
// renderiza JavaScript y acabaría viendo el título correcto, pero el canonical
// clavado a la raíz le decía que cada página era un duplicado —y los
// rastreadores de WhatsApp y Facebook no ejecutan nada, así que compartir la
// guía mostraba la tarjeta de la portada.
//
// Sólo se reescribe la cabecera. El cuerpo lo sigue pintando React en el
// cliente: renderizar también el HTML de cada página es otro cambio, más
// grande, porque el enrutador de hoy lee `window.location` al montar.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_URL, allRoutes } from '../src/content/routes.js'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const template = await readFile(resolve(dist, 'index.html'), 'utf8')

function escapeAttribute(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/**
 * Sustituye el valor de una etiqueta que ya está en la plantilla.
 *
 * Falla en lugar de seguir si no la encuentra: una etiqueta renombrada en
 * `index.html` dejaría el sitio publicando la cabecera de la portada en todas
 * las páginas, y en silencio es justo el error que veníamos de arreglar.
 */
function replaceAttribute(html, pattern, value, label) {
  if (!pattern.test(html)) throw new Error(`prerender: no se encontró ${label} en index.html`)
  return html.replace(pattern, (match) => match.replace(/(content|href)="[^"]*"/, `$1="${escapeAttribute(value)}"`))
}

function renderPage(page) {
  let html = template

  html = html.replace(/<html lang="[^"]*"/, `<html lang="${escapeAttribute(page.language)}"`)
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeText(page.title)}</title>`)

  const tags = [
    [/<meta name="description"[^>]*>/, page.description, 'meta description'],
    [/<link rel="canonical"[^>]*>/, page.canonical, 'link canonical'],
    [/<meta property="og:url"[^>]*>/, page.canonical, 'og:url'],
    [/<meta property="og:title"[^>]*>/, page.title, 'og:title'],
    [/<meta property="og:description"[^>]*>/, page.description, 'og:description'],
    [/<meta property="og:locale"[^>]*>/, page.locale, 'og:locale'],
    [/<meta name="twitter:title"[^>]*>/, page.title, 'twitter:title'],
    [/<meta name="twitter:description"[^>]*>/, page.description, 'twitter:description'],
  ]
  for (const [pattern, value, label] of tags) {
    html = replaceAttribute(html, pattern, value, label)
  }

  const alternates = page.alternates
    .map(({ hreflang, href }) => `    <link rel="alternate" hreflang="${escapeAttribute(hreflang)}" href="${escapeAttribute(href)}" />`)
    .join('\n')

  return html.replace('</head>', `${alternates}\n  </head>`)
}

/** `/` es `index.html`; el resto son carpetas con su propio índice. */
function fileFor(path) {
  const clean = path.replace(/\/+$/, '')
  return clean === '' ? 'index.html' : `${clean.slice(1)}/index.html`
}

const routes = allRoutes()

for (const page of routes) {
  const target = resolve(dist, fileFor(page.path))
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, renderPage(page))
}

// El sitemap se genera de la misma lista para que no pueda desfasarse: la
// versión escrita a mano se había quedado sin ninguna de las cinco páginas en
// inglés.
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...routes.map((page) => [
    '  <url>',
    `    <loc>${escapeText(page.canonical)}</loc>`,
    ...page.alternates
      .filter(({ hreflang }) => hreflang !== 'x-default')
      .map(({ hreflang, href }) => `    <xhtml:link rel="alternate" hreflang="${escapeAttribute(hreflang)}" href="${escapeAttribute(href)}" />`),
    '  </url>',
  ].join('\n')),
  '</urlset>',
  '',
].join('\n')

await writeFile(resolve(dist, 'sitemap.xml'), sitemap)

console.log(`prerender: ${routes.length} páginas y el sitemap para ${SITE_URL}`)
