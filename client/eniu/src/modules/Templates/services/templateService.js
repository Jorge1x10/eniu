import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";
import i18n from "../../../i18n";

export function getTemplateErrorMessage(response, fallback) {
  if (response?.status === 403) return i18n.t("No tienes permiso para personalizar este menú.");
  if (response?.status === 404) return i18n.t("El negocio o menú solicitado no existe.");
  if (response?.status === 413) return i18n.t("La portada es demasiado grande.");
  if (response?.status === 415) return i18n.t("El formato de la imagen no es compatible.");
  if (response?.status === 400) return response.data?.message || i18n.t("Revisa la configuración ingresada.");
  return response?.data?.message || fallback;
}

export function useTemplateService(businessId, catalogueId) {
  const { request } = useApi();
  const path = `businesses/${businessId}/catalogues/${catalogueId}/template`;
  const get = useCallback(
    (options = {}) => request({ method: "GET", path, ...options }),
    [path, request]
  );
  const update = useCallback(
    (data, options = {}) => request({
      method: "PATCH", path,
      ...(data instanceof FormData ? { formData: data } : { data }),
      ...options,
    }),
    [path, request]
  );
  return { get, update };
}
