// Datos del responsable. Una sola copia: el aviso de privacidad y los términos
// los leen de aquí para que no puedan acabar diciendo cosas distintas.
export const RESPONSABLE = 'Jorge Arturo Alvarado Díaz de León'
// Ver la nota en `site.js`: provisional mientras `hola@eniu.app` no reciba.
// Al migrar, cambiar las dos a la vez —esta es la que sale en los documentos
// legales y la otra la que ve el visitante— para no ofrecer dos contactos.
export const CONTACTO = 'eniumenu@gmail.com'
export const DOMICILIO = 'Paseo del Origen 600, Club de Golf Santa Anita, Tlajomulco de Zuñiga, Jal., C.P. 45645'

/**
 * Representantes en la Unión Europea y en el Reino Unido.
 *
 * El artículo 27 del RGPD obliga a designar por escrito un representante en la
 * Unión a quien no tiene establecimiento allí pero ofrece servicios a personas
 * que sí están. El Reino Unido conserva la misma obligación en su propio UK
 * GDPR, y **es una designación distinta**: un representante en la UE no cubre
 * el Reino Unido ni al revés.
 *
 * Mientras valgan `null`, el aviso de privacidad lo dice abiertamente en vez
 * de callarlo. Callar una mención obligatoria es peor que reconocer que está
 * pendiente: lo segundo es un trámite a medias, lo primero parece un intento
 * de aparentar que se cumple.
 *
 * Al designarlos, cada uno necesita nombre y dirección postal en su territorio
 * —es a donde una autoridad de control dirige sus requerimientos—, y un correo
 * al que escribirles.
 */
export const REPRESENTANTE_UE = null
export const REPRESENTANTE_RU = null

// La fecha del encabezado marca cuándo cambió el texto, no cuándo se movió de
// sitio: mudar los documentos de dominio no los modifica.
export const ACTUALIZADA = '13 de septiembre de 2026'

// La misma fecha, escrita como se escribe en cada idioma. Se mantienen juntas
// para que actualizar el documento no deje una de las dos atrás.
export const ACTUALIZADA_EN = 'September 13, 2026'
