import { useMemo } from "react";

import { useAuth } from "./useAuth";

// Espejo del plan gratuito del backend. Sólo se usa mientras el usuario carga
// o si la respuesta viniera sin plan: ante la duda conviene mostrar la interfaz
// más restringida, porque desbloquear de más promete algo que el backend
// rechazaría al guardar.
const FREE_LIMITS = {
  max_businesses: 1,
  max_catalogues_per_business: 1,
  max_products_per_catalogue: 15,
  template_keys: ["modern"],
  font_keys: ["inter"],
  allow_cover: false,
  allow_background: false,
  allow_product_images: true,
  allow_analytics: false,
  allow_splash: false,
  show_eniu_badge: true,
};

export function usePlan() {
  const { user } = useAuth();

  return useMemo(() => {
    const plan = user?.plan || null;
    const limits = plan?.limits || FREE_LIMITS;

    return {
      plan,
      limits,
      // `has_access` es falso tanto en gratuito como con un cobro pendiente:
      // en ambos casos la interfaz debe verse igual de restringida.
      isFree: !plan?.has_access,
      allowsTemplate: (key) => !limits.template_keys || limits.template_keys.includes(key),
      allowsFont: (key) => !limits.font_keys || limits.font_keys.includes(key),
      isWithin: (count, limit) => limit === null || limit === undefined || count < limit,
    };
  }, [user]);
}
