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
