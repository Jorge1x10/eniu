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
  max_products_per_catalogue: 40,
  layout_keys: ['minimal', 'modern', 'natural'],
  template_keys: ['minimal', 'modern', 'natural'],
  font_keys: ['inter', 'lora', 'montserrat', 'playfair', 'poppins'],
  allow_cover: false,
  allow_background: false,
  allow_product_images: true,
  allow_analytics: false,
  analytics_summary: true,
  allow_splash: false,
  show_eniu_badge: true,
};

/**
 * Qué parte de las analíticas puede pedir la app: el informe completo del plan
 * de pago, el resumen de 7 días del gratuito o nada. Pedir el informe sin
 * tenerlo devuelve 403, e Inicio lo mostraba como si no hubiera visitas.
 */
export type AnalyticsScope = 'full' | 'summary' | 'none';

export function usePlan() {
  const { user } = useAuth();

  return useMemo(() => {
    const plan = user?.plan ?? null;
    const limits = plan?.limits ?? FREE_LIMITS;
    const analyticsScope: AnalyticsScope = limits.allow_analytics ? 'full' : limits.analytics_summary ? 'summary' : 'none';

    return {
      plan,
      limits,
      analyticsScope,
      // `has_access` es falso tanto en gratuito como con un cobro pendiente:
      // en ambos casos la app debe verse igual de restringida.
      isFree: !plan?.has_access,
      // `layout_keys` es el nombre nuevo; `template_keys` el alias que el
      // backend mantiene para las versiones de la app que aún no lo leen.
      allowsTemplate: (key: string) => {
        const allowed = limits.layout_keys ?? limits.template_keys;
        return !allowed || allowed.includes(key);
      },
      allowsFont: (key: string) => !limits.font_keys || limits.font_keys.includes(key),
      isWithin: (count: number, limit: number | null) => limit === null || count < limit,
    };
  }, [user]);
}
