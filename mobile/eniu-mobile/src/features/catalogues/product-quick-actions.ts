import { useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { api } from '@/lib/api';
import type { Product } from '@/types/models';

/**
 * Cambios de precio y disponibilidad desde la lista, sin abrir el formulario
 * completo. Actualiza la caché al toque (para que el +/- se sienta
 * inmediato) y revierte si el PATCH falla.
 */
export function useProductQuickActions(businessId: string | undefined, catalogueId: string | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const key = ['products', businessId, catalogueId] as const;
  const base = `businesses/${businessId}/catalogues/${catalogueId}/products`;

  function patchProduct(id: string, fields: Partial<Pick<Product, 'price' | 'is_available'>>) {
    const previous = queryClient.getQueryData<{ products: Product[] }>(key);
    queryClient.setQueryData<{ products: Product[] }>(key, (current) => current ? { products: current.products.map((item) => item.id === id ? { ...item, ...fields } : item) } : current);
    api.patch<{ product: Product }>(`${base}/${id}`, fields)
      .then((data) => queryClient.setQueryData<{ products: Product[] }>(key, (current) => current ? { products: current.products.map((item) => item.id === id ? data.product : item) } : current))
      .catch((requestError) => {
        if (previous) queryClient.setQueryData(key, previous);
        Alert.alert(t("No se pudo guardar"), requestError instanceof Error ? requestError.message : t("Intenta nuevamente."));
      });
  }

  return {
    bumpPrice(product: Product, delta: number) {
      const next = Math.max(0, Number(product.price ?? 0) + delta);
      patchProduct(product.id, { price: next });
    },
    toggleAvailable(product: Product) {
      patchProduct(product.id, { is_available: !product.is_available });
    },
  };
}
