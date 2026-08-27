import { createContext, PropsWithChildren, use, useMemo, useState } from 'react';

import type { BusinessType } from '@/features/onboarding/starter-menus';
import type { Business, Catalogue } from '@/types/models';

/** Qué menú eligió el usuario en el paso 2. */
export type MenuChoice = 'starter' | 'blank';

type OnboardingContextValue = {
  /** Datos capturados en los pasos 1 y 2. Nada de esto existe todavía en el servidor. */
  draft: { businessName: string; businessType: BusinessType; menuChoice: MenuChoice | null };
  /** Resultado del alta, que sólo ocurre al llegar al paso 3. */
  business: Business | null;
  catalogue: Catalogue | null;
  setBusinessDraft: (businessName: string, businessType: BusinessType) => void;
  setMenuChoice: (choice: MenuChoice) => void;
  setProvisioned: (business: Business, catalogue: Catalogue) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * El onboarding no toca la API hasta el último paso: los pasos 1 y 2 sólo
 * capturan datos. Así, si alguien abandona a la mitad o toca "Saltar", no
 * quedan negocios ni menús huérfanos creados a medias.
 */
export function OnboardingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<OnboardingContextValue['draft']>({ businessName: '', businessType: 'taqueria', menuChoice: null });
  const [business, setBusiness] = useState<Business | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);

  const value = useMemo<OnboardingContextValue>(() => ({
    draft,
    business,
    catalogue,
    setBusinessDraft: (businessName, businessType) => setDraft((current) => ({ ...current, businessName, businessType })),
    setMenuChoice: (menuChoice) => setDraft((current) => ({ ...current, menuChoice })),
    setProvisioned: (nextBusiness, nextCatalogue) => { setBusiness(nextBusiness); setCatalogue(nextCatalogue); },
  }), [business, catalogue, draft]);

  return <OnboardingContext value={value}>{children}</OnboardingContext>;
}

export function useOnboarding() {
  const context = use(OnboardingContext);
  if (!context) throw new Error('useOnboarding debe usarse dentro de OnboardingProvider');
  return context;
}
