/**
 * Enlaces públicos del sitio. Viven en `eniu.app`, que es la dirección abierta
 * y estable que pide App Store Connect. La app los abre en el navegador en vez
 * de duplicar el contenido, para que no puedan quedar desincronizados.
 *
 * Estas URLs viajan compiladas dentro del binario: cambiarlas obliga a publicar
 * una versión nueva en las tiendas, así que el dominio se decide antes de
 * enviar la app, no después.
 */
export const TERMS_URL = 'https://eniu.app/terminos';
export const PRIVACY_URL = 'https://eniu.app/privacidad';
export const SUPPORT_URL = 'https://eniu.app/soporte';
