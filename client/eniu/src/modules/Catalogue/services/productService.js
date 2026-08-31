import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";
import i18n from "../../../i18n";

export function getProductErrorMessage(response, fallback) {
  if (response?.status === 403) return i18n.t("No tienes permiso para administrar este menú.");
  if (response?.status === 404) return i18n.t("El menú o el producto ya no existe.");
  if (response?.status === 400) {
    // Se comprueba el código y no el texto: el mensaje del backend cambia con
    // el idioma del usuario, el código no.
    if (response.data?.code === "category_not_in_catalogue") {
      return i18n.t("La categoría seleccionada no pertenece a este menú.");
    }
    return response.data?.message || i18n.t("Revisa la información ingresada.");
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
