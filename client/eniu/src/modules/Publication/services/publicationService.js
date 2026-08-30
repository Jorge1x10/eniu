import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";
import i18n from "../../../i18n";

export function publicationErrorMessage(response, fallback) {
  if (response?.status === 403) return i18n.t("No tienes permiso para administrar este menú.");
  if (response?.status === 404) return i18n.t("El negocio o menú solicitado no existe.");
  if (response?.status === 409) return i18n.t("No pudimos generar una URL única. Intenta nuevamente.");
  if (response?.status === 400) return response.data?.message || i18n.t("La solicitud no es válida.");
  return response?.data?.message || fallback;
}

export function usePublicationService(businessId, catalogueId) {
  const { request } = useApi();
  const base = `businesses/${businessId}/catalogues/${catalogueId}`;
  const getPublication = useCallback(
    (options = {}) => request({ method: "GET", path: `${base}/publication`, ...options }),
    [base, request]
  );
  const updatePublication = useCallback(
    (isPublished, options = {}) => request({ method: "PATCH", path: `${base}/publication`, data: { is_published: isPublished }, ...options }),
    [base, request]
  );
  const getPreview = useCallback(
    (options = {}) => request({ method: "GET", path: `${base}/preview`, ...options }),
    [base, request]
  );
  return { getPublication, updatePublication, getPreview };
}
