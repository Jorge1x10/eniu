import { readFile } from 'node:fs/promises'

// Comprueba que todo lo público que la app da por hecho responde de verdad.
//
// Las URLs legales viajan compiladas dentro del binario de iOS: cambiarlas
// obliga a publicar una versión nueva en la tienda. Si alguna da 404 el día
// que el revisor de Apple la toca --y la toca, porque App Store Connect exige
// una URL de privacidad válida-- es rechazo. Por eso la comprobación se
// ejecuta antes de enviar y no se confía en la memoria.
//
//   node scripts/check-public-urls.mjs
//
// Sale con código 1 si algo falla, para poder encadenarlo a un release.

const TIMEOUT_MS = 15000

// Se leen del propio `legal.ts` en vez de copiarlas aquí: duplicar la lista es
// justo la forma de que un día se compruebe una URL distinta de la que la app
// abre de verdad.
const legalSource = new URL('../../../mobile/eniu-mobile/src/constants/legal.ts', import.meta.url)

async function urlsFromMobileApp() {
  const source = await readFile(legalSource, 'utf8')
  const found = [...source.matchAll(/^export const (\w+)\s*=\s*'([^']+)'/gm)]
  if (!found.length) throw new Error(`No se encontró ninguna URL en ${legalSource.pathname}`)
  return found.map(([, name, url]) => ({ url, label: `app · ${name}` }))
}

const OTHER = [
  { url: 'https://eniu.app/', label: 'sitio · portada' },
  { url: 'https://eniu.app/primeros-pasos', label: 'sitio · primeros pasos' },
  { url: 'https://eniu.app/sitemap.xml', label: 'sitio · sitemap' },
  { url: 'https://eniu.app/robots.txt', label: 'sitio · robots' },
  { url: 'https://eniu.app/og-image.png', label: 'sitio · imagen al compartir' },
  // El panel: aquí aterrizan los enlaces de recuperación de contraseña, que se
  // construyen como `${FRONTEND_URL}/reset-password?token=...`.
  { url: 'https://app.eniu.app/', label: 'panel · raíz' },
  // De aquí cuelgan los menús publicados que apuntan los códigos QR impresos.
  { url: 'https://menu.eniu.app/', label: 'menús · raíz' },
  { url: 'https://eniu-backend.onrender.com/api/health', label: 'api · health' },
]

async function check({ url, label }) {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'eniu-url-check' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const ms = Date.now() - started
    const redirected = response.redirected && response.url !== url
    return {
      label,
      url,
      ok: response.ok,
      detail: `${response.status}${redirected ? ` → ${response.url}` : ''} · ${ms} ms`,
      slow: ms > 5000,
    }
  } catch (error) {
    return { label, url, ok: false, detail: error.name === 'TimeoutError' ? `sin respuesta en ${TIMEOUT_MS / 1000} s` : error.message }
  }
}

const targets = [...(await urlsFromMobileApp()), ...OTHER]
const results = await Promise.all(targets.map(check))

const width = Math.max(...results.map((result) => result.label.length))
for (const result of results) {
  const mark = result.ok ? (result.slow ? '~' : '✓') : '✗'
  console.log(`${mark} ${result.label.padEnd(width)}  ${result.url}\n  ${' '.repeat(width)}${result.detail}`)
}

const failed = results.filter((result) => !result.ok)
const slow = results.filter((result) => result.ok && result.slow)

console.log()
if (slow.length) {
  console.log(`Atención: ${slow.length} respondieron por encima de 5 s. Un backend que tarda tanto en despertar`)
  console.log('deja al revisor mirando una pantalla vacía, que se reporta como app que no funciona.')
}
if (failed.length) {
  console.log(`FALLAN ${failed.length} de ${results.length}: ${failed.map((result) => result.label).join(', ')}`)
  process.exit(1)
}
console.log(`Las ${results.length} responden.`)

// Nota sobre el alcance: el sitio es una SPA y el servidor devuelve el mismo
// index.html para cualquier ruta, así que un 200 aquí prueba que el dominio
// resuelve y sirve la aplicación, no que esa página concreta pinte su
// contenido. Lo segundo se comprueba abriéndola una vez en el navegador.
