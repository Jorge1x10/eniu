import { formatCurrency } from "../../../i18n/formats";
// Función y no constante: construirla al importar la ataba al idioma de
// arranque, y el formato debe seguir al idioma en curso.
export const menuCurrency = {
  format: (value) => formatCurrency(value),
};

export function resolveAssetUrl(url) {
  if (!url || url.startsWith("http") || url.startsWith("blob:")) return url;
  try { return `${new URL(import.meta.env.VITE_API_URL).origin}${url}`; } catch { return url; }
}

export function mainProductImage(product) {
  const pictures = Array.isArray(product.pictures) ? product.pictures : [];
  return resolveAssetUrl((pictures.find((picture) => picture.is_default) || pictures[0])?.url);
}

export function buildSections(categories, products) {
  const sections = categories.map((category) => ({
    id: category.id,
    name: category.name,
    tracking_key: category.tracking_key,
    products: products.filter((product) => product.category_id === category.id),
  }));
  const uncategorized = products.filter((product) => product.category_id === null);
  if (uncategorized.length) sections.push({ id: "other", name: "Otros", products: uncategorized });
  return sections;
}
