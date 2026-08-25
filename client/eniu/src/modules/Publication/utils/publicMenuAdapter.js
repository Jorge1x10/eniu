import { normalizeConfiguration } from "../../Templates/utils/themeDefaults";

export function adaptPublicMenu(menu) {
  const categories = (menu?.categories || []).map((category, categoryIndex) => ({
    id: `category-${categoryIndex}`,
    tracking_key: category.tracking_key,
    name: category.name,
    description: category.description,
  }));
  const categorizedProducts = (menu?.categories || []).flatMap((category, categoryIndex) =>
    (category.products || []).map((product, productIndex) => ({
      ...product,
      id: `category-${categoryIndex}-product-${productIndex}`,
      category_id: `category-${categoryIndex}`,
      pictures: product.image_url ? [{ id: "main", url: product.image_url, is_default: true }] : [],
    }))
  );
  const uncategorizedProducts = (menu?.uncategorized_products || []).map((product, index) => ({
    ...product,
    id: `other-product-${index}`,
    category_id: null,
    pictures: product.image_url ? [{ id: "main", url: product.image_url, is_default: true }] : [],
  }));
  const configuration = normalizeConfiguration({
    template_key: menu?.template?.key,
    theme: menu?.template?.theme,
  });
  return {
    business: menu?.business || { name: "", description: null },
    catalogue: menu?.catalogue || { name: "", description: null },
    categories,
    products: [...categorizedProducts, ...uncategorizedProducts],
    templateKey: configuration.template_key,
    theme: configuration.theme,
    coverUrl: configuration.theme.cover_image_url,
    backgroundUrl: configuration.theme.background_image_url,
  };
}
