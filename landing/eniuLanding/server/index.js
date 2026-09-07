// The build script replaces the token below with the bundled static files.
// eslint-disable-next-line no-undef
const FILES = __ENIU_STATIC_FILES__

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
}

function decode(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/') pathname = '/index.html'

    let encoded = FILES[pathname]

    // Cada página tiene su propio HTML con sus etiquetas de cabecera, escrito
    // por `scripts/prerender.mjs` como `<ruta>/index.html`. Hay que buscarlo
    // antes de caer a la portada: si no, se sirve la cabecera de la raíz en
    // todas las rutas y el prerenderizado no sirve de nada.
    if (!encoded && !pathname.includes('.')) {
      const withIndex = `${pathname.replace(/\/+$/, '')}/index.html`
      if (FILES[withIndex]) {
        pathname = withIndex
        encoded = FILES[pathname]
      }
    }

    // Una ruta desconocida sigue devolviendo la portada, que es lo que deja a
    // la aplicación redirigir en el cliente.
    if (!encoded && !pathname.includes('.')) {
      pathname = '/index.html'
      encoded = FILES[pathname]
    }

    if (!encoded) return new Response('Not found', { status: 404 })

    const extension = pathname.slice(pathname.lastIndexOf('.'))
    const immutable = pathname.startsWith('/assets/')
    return new Response(decode(encoded), {
      headers: {
        'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
        'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  },
}
