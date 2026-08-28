import { useMemo } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import type { PlanLimits } from '@/types/models';

/**
 * Espejo del plan gratuito del backend. Sólo aplica mientras la sesión carga o
 * si la respuesta llegara sin plan: ante la duda conviene mostrar la interfaz
 * más restringida, porque desbloquear de más promete algo que el backend
 * rechazaría al guardar.
 */
const FREE_LIMITS: PlanLimits = {
  max_businesses: 1,
  max_catalogues_per_business: 1,
  max_products_per_catalogue: 15,
  template_keys: ['modern'],
  font_keys: ['inter'],
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
    const plan = user?.plan ?? null;
    const limits = plan?.limits ?? FREE_LIMITS;

    return {
      plan,
      limits,
      // `has_access` es falso tanto en gratuito como con un cobro pendiente:
      // en ambos casos la app debe verse igual de restringida.
      isFree: !plan?.has_access,
      allowsTemplate: (key: string) => !limits.template_keys || limits.template_keys.includes(key),
      allowsFont: (key: string) => !limits.font_keys || limits.font_keys.includes(key),
      isWithin: (count: number, limit: number | null) => limit === null || count < limit,
    };
  }, [user]);
}
