import { api } from '@/lib/api';
import type { Catalogue } from '@/types/models';

export const catalogueKeys = {
  all: (businessId?: string) => ['catalogues', businessId] as const,
  detail: (businessId?: string, catalogueId?: string) => ['catalogue', businessId, catalogueId] as const,
};

export function listCatalogues(businessId: string) {
  return api.get<{ catalogues: Catalogue[] }>(`businesses/${businessId}/catalogues`);
}

export function getCatalogue(businessId: string, catalogueId: string) {
  return api.get<{ catalogue: Catalogue }>(`businesses/${businessId}/catalogues/${catalogueId}`);
}
