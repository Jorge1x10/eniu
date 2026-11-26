import { useEffect } from "react";

import { useCatalogueService } from "../services/catalogueService";
import { getLastCatalogue, rememberCatalogue, useLastCatalogue } from "../utils/lastCatalogue";

/**
 * El menú con el que se abren las secciones que cuelgan de uno (productos,
 * diseño, promociones, analíticas): el recordado o, si no hay ninguno —un
 * navegador nuevo, otro dispositivo, recién iniciada la sesión—, el primero
 * del negocio, igual que elige Inicio. Devuelve `null` mientras se consulta y
 * cuando el negocio no tiene menús.
 *
 * Con `skip` no consulta nada: sirve cuando la ruta ya dice qué menú es.
 */
export function useCurrentCatalogueId(businessId, { skip = false } = {}) {
  const remembered = useLastCatalogue(businessId);
  const { list } = useCatalogueService(businessId);
  const needsLookup = Boolean(businessId) && !remembered && !skip;

  useEffect(() => {
    if (!needsLookup) return undefined;
    const controller = new AbortController();
    list({ signal: controller.signal }).then((response) => {
      if (response.aborted || !response.ok) return;
      const first = response.data?.catalogues?.[0];
      // Si mientras tanto se eligió otro menú (Inicio, la ruta), ése manda.
      if (first?.id && !getLastCatalogue(businessId)) rememberCatalogue(businessId, first.id);
    });
    return () => controller.abort();
  }, [businessId, needsLookup, list]);

  return remembered;
}
