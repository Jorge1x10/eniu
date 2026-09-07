import { useCallback } from "react";

import { useApi } from "../../auth/services/useApi";

/**
 * Catálogo de layouts/paletas/tokens (`GET /api/templates`).
 *
 * No requiere sesión y cambia sólo cuando se despliega código nuevo, así que
 * el backend ya lo sirve con un `Cache-Control` largo — aquí sólo se evita
 * pedirlo dos veces en la misma carga de página.
 */
let cachedCatalog = null;
let pendingRequest = null;

export function useTemplateCatalogService() {
  const { request } = useApi();
  const get = useCallback(async (options = {}) => {
    if (cachedCatalog) return { ok: true, status: 200, data: cachedCatalog };
    if (!pendingRequest) {
      pendingRequest = request({ method: "GET", path: "templates", ...options }).finally(() => {
        pendingRequest = null;
      });
    }
    const response = await pendingRequest;
    if (response.ok) cachedCatalog = response.data;
    return response;
  }, [request]);
  return { get };
}
