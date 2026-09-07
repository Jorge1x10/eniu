import { resolveMediaUrl } from '@/lib/api';
import type { Product } from '@/types/models';

export function defaultPicture(product: Product) {
  const pictures = product.pictures ?? [];
  return pictures.find((picture) => picture.is_default) ?? pictures[0] ?? null;
}

export function defaultPictureUrl(product: Product) {
  return resolveMediaUrl(defaultPicture(product)?.url);
}
