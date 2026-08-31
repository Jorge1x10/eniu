// Datos del sitio que no cambian con el idioma. El copy —titulares, planes,
// pasos, preguntas— vive en `src/content/es.js` y `src/content/en.js`.

export const appUrl = import.meta.env.VITE_APP_URL || '#empieza'

// Provisional hasta que `hola@eniu.app` reciba correo: el dominio todavía no
// tiene registros MX, así que esa dirección rebotaría. Publicar una que no
// existe es peor que publicar una de Gmail, porque los términos y el aviso de
// privacidad prometen este canal de contacto.
export const contactEmail = 'eniumenu@gmail.com'

// Placeholders: en cuanto existan los perfiles, sustituye `url` por el enlace
// real y el chip de "Pronto" desaparece solo. El nombre de la red es el mismo
// en los dos idiomas; el rótulo de "Pronto" sale del contenido.
export const socialLinks = [
  { key: 'instagram', name: 'Instagram', handle: '@eniu.app', url: '' },
  { key: 'facebook', name: 'Facebook', handle: 'Eniu', url: '' },
  { key: 'tiktok', name: 'TikTok', handle: '@eniu.app', url: '' },
  { key: 'whatsapp', name: 'WhatsApp', handle: '', url: '' },
]
