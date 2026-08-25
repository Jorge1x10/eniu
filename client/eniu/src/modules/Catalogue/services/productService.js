import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";

export function getProductErrorMessage(response, fallback) {
  if (response?.status === 403) return "No tienes permiso para administrar este menú.";
  if (response?.status === 404) return "El menú o el producto ya no existe.";
  if (response?.status === 400) {
    if (response.data?.message?.includes("no pertenece")) {
      return "La categoría seleccionada no pertenece a este menú.";
    }
    return response.data?.message || "Revisa la información ingresada.";
  }
  return response?.data?.message || fallback;
}

export function useProductService(businessId, catalogueId) {
  const { request } = useApi();
  const collectionPath = `businesses/${businessId}/catalogues/${catalogueId}/products`;

  const list = useCallback(
    (options = {}) => request({ method: "GET", path: collectionPath, ...options }),
    [collectionPath, request]
  );
  const create = useCallback(
    (data, options = {}) => request({
      method: "POST",
      path: collectionPath,
      ...(data instanceof FormData ? { formData: data } : { data }),
      ...options,
    }),
    [collectionPath, request]
  );
  const update = useCallback(
    (productId, data, options = {}) => request({
      method: "PATCH",
      path: `${collectionPath}/${productId}`,
      ...(data instanceof FormData ? { formData: data } : { data }),
      ...options,
    }),
    [collectionPath, request]
  );
  const remove = useCallback(
    (productId, options = {}) => request({
      method: "DELETE", path: `${collectionPath}/${productId}`, ...options,
    }),
    [collectionPath, request]
  );

  return { list, create, update, remove };
}
