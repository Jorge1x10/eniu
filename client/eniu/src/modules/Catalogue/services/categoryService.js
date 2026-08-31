import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";
import i18n from "../../../i18n";

export function getCategoryErrorMessage(response, fallback) {
  if (response?.status === 403) return i18n.t("No tienes permiso para administrar este menú.");
  if (response?.status === 404) return i18n.t("El menú o la categoría ya no existe.");
  if (response?.status === 409) return i18n.t("Ya existe una categoría con ese nombre en este menú.");
  if (response?.status === 400) return response.data?.message || i18n.t("Revisa la información ingresada.");
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
