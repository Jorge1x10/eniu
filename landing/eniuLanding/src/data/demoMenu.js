// Datos y opciones de la demo editable.
//
// Todo lo de aquí es un espejo de lo que el dashboard ofrece de verdad
// (`client/eniu/src/modules/Templates`): mismos nombres de plantilla y
// tipografía, mismos campos de tema y el mismo tope de productos del plan
// gratuito que aplica el backend. Si allá cambian, hay que cambiarlos aquí:
// la demo promete lo que el visitante encontrará al registrarse.

export const FREE_PRODUCT_LIMIT = 15

export const DEMO_TEMPLATES = [
  { key: 'modern', name: 'Moderna', description: 'Tarjetas visuales y navegación redondeada.', free: true },
  { key: 'minimal', name: 'Minimalista', description: 'Lectura rápida, filas limpias y pocas sombras.' },
  { key: 'elegant', name: 'Elegante', description: 'Composición editorial y más espacio.' },
  { key: 'bold', name: 'Impactante', description: 'Bloques fuertes y bordes marcados.' },
]

export const DEMO_FONTS = [
  { key: 'inter', label: 'Inter', family: 'Inter, system-ui, sans-serif', free: true },
  { key: 'poppins', label: 'Poppins', family: 'Poppins, system-ui, sans-serif' },
  { key: 'playfair', label: 'Playfair Display', family: '"Playfair Display", Georgia, serif' },
  { key: 'lora', label: 'Lora', family: 'Lora, Georgia, serif' },
]

// Se carga sólo cuando alguien abre la pestaña de diseño, para no retrasar la
// primera pintura del sitio con tipografías que quizá nadie use.
export const DEMO_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Poppins:wght@400;600;800&family=Playfair+Display:wght@500;700&family=Lora:wght@400;600&display=swap'

export const COLOR_CONTROLS = [
  ['background_color', 'Color de fondo'],
  ['primary_color', 'Color principal'],
  ['accent_color', 'Color de acento'],
  ['text_color', 'Color del texto'],
]

export const PHOTO_STYLES = ['taco', 'sopa', 'guacamole', 'plato', 'postre', 'cafe']

export const DEMO_THEME = {
  background_color: '#FFFDF5',
  primary_color: '#FFE05A',
  accent_color: '#E8C93D',
  text_color: '#111111',
  font_key: 'inter',
  show_cover: true,
  show_product_images: true,
}

export function initialDemo() {
  return {
    business: { name: 'Casa Nopal' },
    catalogue: { name: 'Menú de la casa', description: 'Cocina de barrio con ingredientes de temporada.' },
    categories: [
      { id: 'cat-entradas', name: 'Entradas' },
      { id: 'cat-fuertes', name: 'Platos fuertes' },
      { id: 'cat-postres', name: 'Postres' },
    ],
    products: [
      { id: 'prod-1', name: 'Guacamole con totopos', description: 'Aguacate, cilantro, serrano y limón.', price: '95', categoryId: 'cat-entradas', available: true, art: 'guacamole' },
      { id: 'prod-2', name: 'Sopa de tortilla', description: 'Caldo de jitomate, pasilla y queso fresco.', price: '110', categoryId: 'cat-entradas', available: true, art: 'sopa' },
      { id: 'prod-3', name: 'Tacos de birria', description: 'Cebolla, cilantro y consomé de la casa.', price: '145', categoryId: 'cat-fuertes', available: true, art: 'taco' },
      { id: 'prod-4', name: 'Enchiladas verdes', description: 'Pollo, crema y queso rallado.', price: '135', categoryId: 'cat-fuertes', available: true, art: 'plato' },
      { id: 'prod-5', name: 'Flan de vainilla', description: 'La receta de la abuela, con caramelo.', price: '75', categoryId: 'cat-postres', available: false, art: 'postre' },
      { id: 'prod-6', name: 'Café de olla', description: 'Canela y piloncillo.', price: '45', categoryId: 'cat-postres', available: true, art: 'cafe' },
    ],
    templateKey: 'modern',
    theme: { ...DEMO_THEME },
  }
}
