// Estructura y opciones de la demo editable.
//
// Aquí vive sólo lo que no cambia con el idioma: claves, familias
// tipográficas, colores y topes. Los nombres y descripciones que se leen en
// pantalla están en `src/content/*.js`, junto al resto del copy.
//
// Todo esto es un espejo de lo que el dashboard ofrece de verdad
// (`client/eniu/src/modules/Templates`): mismas claves de plantilla y
// tipografía, mismos campos de tema y el mismo tope de productos del plan
// gratuito que aplica el backend. Si allá cambian, hay que cambiarlos aquí:
// la demo promete lo que el visitante encontrará al registrarse.

export const FREE_PRODUCT_LIMIT = 15

// `free: true` marca lo que incluye el plan gratuito; el resto lleva la
// etiqueta de plan de pago en la interfaz.
export const DEMO_TEMPLATES = [
  { key: 'modern', free: true },
  { key: 'minimal' },
  { key: 'elegant' },
  { key: 'bold' },
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

export const COLOR_FIELDS = ['background_color', 'primary_color', 'accent_color', 'text_color']

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

// La categoría y el estilo de foto de cada plato de ejemplo. Van por posición
// junto a `seed.products` del contenido, que aporta nombre, descripción y
// precio en el idioma que toque: el importe cambia con la moneda, y unos
// tacos de 145 tienen sentido en pesos pero no en dólares.
const SEED_PRODUCTS = [
  { category: 0, art: 'guacamole' },
  { category: 0, art: 'sopa' },
  { category: 1, art: 'taco' },
  { category: 1, art: 'plato' },
  { category: 2, art: 'postre', available: false },
  { category: 2, art: 'cafe' },
]

/** Menú de ejemplo con el que arranca la demo, en el idioma en curso. */
export function initialDemo(seed) {
  const categories = seed.categories.map((name, index) => ({
    id: `cat-${index}`,
    name,
  }))

  return {
    business: { name: seed.businessName },
    catalogue: { name: seed.menuName, description: seed.menuDescription },
    categories,
    products: SEED_PRODUCTS.map((product, index) => ({
      id: `prod-${index}`,
      name: seed.products[index].name,
      description: seed.products[index].description,
      price: seed.products[index].price,
      categoryId: categories[product.category].id,
      available: product.available !== false,
      art: product.art,
    })),
    templateKey: 'modern',
    theme: { ...DEMO_THEME },
  }
}
