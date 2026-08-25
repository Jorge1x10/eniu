import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";

export function publicationErrorMessage(response, fallback) {
  if (response?.status === 403) return "No tienes permiso para administrar este menú.";
  if (response?.status === 404) return "El negocio o menú solicitado no existe.";
  if (response?.status === 409) return "No pudimos generar una URL única. Intenta nuevamente.";
  if (response?.status === 400) return response.data?.message || "La solicitud no es válida.";
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
