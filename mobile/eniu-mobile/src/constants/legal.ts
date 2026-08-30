/**
 * Los documentos legales viven en el sitio público, que es la URL abierta y
 * estable que pide App Store Connect. La app los abre en el navegador en vez
 * de duplicar el texto, para que no puedan quedar desincronizados.
 *
 * Estas dos URLs viajan compiladas dentro del binario: cambiarlas obliga a
 * publicar una versión nueva en las tiendas, así que el dominio se decide
 * antes de enviar la app, no después.
 */
export const TERMS_URL = 'https://eniu.app/terminos';
export const PRIVACY_URL = 'https://eniu.app/privacidad';
