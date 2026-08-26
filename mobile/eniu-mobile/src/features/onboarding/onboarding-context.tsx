import { createContext, PropsWithChildren, use, useMemo, useState } from 'react';

import type { BusinessType } from '@/features/onboarding/starter-menus';
import type { Business, Catalogue } from '@/types/models';

type OnboardingContextValue = {
  businessType: BusinessType | null;
  business: Business | null;
  catalogue: Catalogue | null;
  setBusinessType: (type: BusinessType) => void;
  setBusiness: (business: Business) => void;
  setCatalogue: (catalogue: Catalogue) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const value = useMemo(() => ({ businessType, business, catalogue, setBusinessType, setBusiness, setCatalogue }), [businessType, business, catalogue]);
  return <OnboardingContext value={value}>{children}</OnboardingContext>;
}

export function useOnboarding() {
  const context = use(OnboardingContext);
  if (!context) throw new Error('useOnboarding debe usarse dentro de OnboardingProvider');
  return context;
}
