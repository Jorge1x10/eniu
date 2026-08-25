import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";

export function getCatalogueErrorMessage(response, fallback) {
  if (response?.status === 403) {
    return "No tienes permiso para administrar este negocio.";
  }
  if (response?.status === 404) {
    return "El negocio o menú solicitado no existe.";
  }
  if (response?.status === 409) {
    return "Ya existe un menú con ese nombre en este negocio.";
  }
  if (response?.status === 400) {
    return response.data?.message || "Revisa la información ingresada.";
  }
  return response?.data?.message || fallback;
}

export function useCatalogueService(businessId, catalogueId) {
  const { request, loading, error } = useApi();
  const collectionPath = `businesses/${businessId}/catalogues`;
  const detailPath = catalogueId
    ? `${collectionPath}/${catalogueId}`
    : null;

  const list = useCallback(
    (options = {}) => request({ method: "GET", path: collectionPath, ...options }),
    [collectionPath, request]
  );
  const create = useCallback(
    (data, options = {}) => request({ method: "POST", path: collectionPath, data, ...options }),
    [collectionPath, request]
  );
  const getOne = useCallback(
    (options = {}) => request({ method: "GET", path: detailPath, ...options }),
    [detailPath, request]
  );
  const update = useCallback(
    (data, options = {}) => request({ method: "PATCH", path: detailPath, data, ...options }),
    [detailPath, request]
  );
  const remove = useCallback(
    (targetCatalogueId = catalogueId, options = {}) => request({
      method: "DELETE",
      path: `${collectionPath}/${targetCatalogueId}`,
      ...options,
    }),
    [catalogueId, collectionPath, request]
  );
  const publish = useCallback(
    (targetCatalogueId = catalogueId, options = {}) => request({
      method: "POST",
      path: `${collectionPath}/${targetCatalogueId}/publish`,
      ...options,
    }),
    [catalogueId, collectionPath, request]
  );
  const unpublish = useCallback(
    (targetCatalogueId = catalogueId, options = {}) => request({
      method: "POST",
      path: `${collectionPath}/${targetCatalogueId}/unpublish`,
      ...options,
    }),
    [catalogueId, collectionPath, request]
  );

  return {
    list,
    create,
    getOne,
    update,
    remove,
    publish,
    unpublish,
    loading,
    error,
  };
}
