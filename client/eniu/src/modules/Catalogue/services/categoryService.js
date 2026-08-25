import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";

export function getCategoryErrorMessage(response, fallback) {
  if (response?.status === 403) return "No tienes permiso para administrar este menú.";
  if (response?.status === 404) return "El menú o la categoría ya no existe.";
  if (response?.status === 409) return "Ya existe una categoría con ese nombre en este menú.";
  if (response?.status === 400) return response.data?.message || "Revisa la información ingresada.";
  return response?.data?.message || fallback;
}

export function useCategoryService(businessId, catalogueId) {
  const { request } = useApi();
  const collectionPath = `businesses/${businessId}/catalogues/${catalogueId}/categories`;

  const list = useCallback(
    (options = {}) => request({ method: "GET", path: collectionPath, ...options }),
    [collectionPath, request]
  );
  const create = useCallback(
    (data, options = {}) => request({ method: "POST", path: collectionPath, data, ...options }),
    [collectionPath, request]
  );
  const update = useCallback(
    (categoryId, data, options = {}) => request({
      method: "PATCH", path: `${collectionPath}/${categoryId}`, data, ...options,
    }),
    [collectionPath, request]
  );
  const remove = useCallback(
    (categoryId, options = {}) => request({
      method: "DELETE", path: `${collectionPath}/${categoryId}`, ...options,
    }),
    [collectionPath, request]
  );

  return { list, create, update, remove };
}
