import { createContext, useContext } from "react";

import { formatCurrency } from "../../../i18n/formats";

/**
 * Moneda del negocio dueño del menú que se está dibujando.
 *
 * Va por contexto y no por prop porque el precio se pinta dentro de los
 * componentes de producto de las trece plantillas, y ninguno recibe el
 * negocio: pasárselo obligaría a atravesar cada layout con una prop que sólo
 * usa la última hoja del árbol.
 *
 * El valor por omisión es el que tienen los negocios que nunca eligieron
 * moneda, no una preferencia: un menú dibujado fuera del proveedor debe salir
 * igual que antes de que existiera este contexto.
 */
export const MenuCurrencyContext = createContext("MXN");

/**
 * Formateador de precios del menú en curso.
 *
 * Se construye en cada render y no una vez al importar: el formato sigue al
 * idioma de la interfaz, y congelarlo lo ataría al idioma de arranque.
 */
export function useMenuCurrency() {
  const currency = useContext(MenuCurrencyContext);
  return { format: (value) => formatCurrency(value, currency) };
}

export function resolveAssetUrl(url) {
  if (!url || url.startsWith("http") || url.startsWith("blob:")) return url;
  try { return `${new URL(import.meta.env.VITE_API_URL).origin}${url}`; } catch { return url; }
}

export function mainProductImage(product) {
  const pictures = Array.isArray(product.pictures) ? product.pictures : [];
  return resolveAssetUrl((pictures.find((picture) => picture.is_default) || pictures[0])?.url);
}

/**
 * Secciones del menú, en orden.
 *
 * "Promociones de hoy" encabeza el menú y repite productos que también salen en
 * su categoría: esa duplicación es el punto, es un escaparate. Sólo aparece si
 * alguna promoción activa hoy pidió encabezar (`promo_featured`), así que un
 * menú sin promociones destacadas queda exactamente igual que antes.
 *
 * Va aquí y no en cada plantilla porque las trece pasan por esta función: la
 * sección se dibuja con el mismo estilo de categoría que ya tiene cada layout,
 * sin tocar ninguno.
 *
 * Los nombres de las dos secciones que no vienen de la base —"Otros" y
 * "Promociones de hoy"— los pasa quien llama, ya traducidos: este módulo no es
 * un componente y no tiene acceso al idioma en curso.
 */
export function buildSections(categories, products, labels) {
  const sections = categories.map((category) => ({
    id: category.id,
    name: category.name,
    tracking_key: category.tracking_key,
    products: products.filter((product) => product.category_id === category.id),
  }));
  const uncategorized = products.filter((product) => product.category_id === null);
  if (uncategorized.length) sections.push({ id: "other", name: labels.other, products: uncategorized });

  const featured = products.filter((product) => product.promo_featured);
  if (featured.length) {
    sections.unshift({
      id: "promotions-today",
      name: labels.promotionsToday,
      // Ids propios: el mismo producto sale dos veces en la página y React
      // necesita distinguir las dos tarjetas. El resto del objeto se conserva,
      // incluida la foto, que ya viene resuelta.
      products: featured.map((product) => ({ ...product, id: `promo-${product.id}` })),
    });
  }
  return sections;
}
