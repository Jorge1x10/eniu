import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, use, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import type { Business } from '@/types/models';

type BusinessContextValue = {
  businesses: Business[];
  selectedBusiness: Business | null;
  isLoading: boolean;
  selectBusiness: (id: string) => void;
  addBusiness: (business: Business) => void;
  updateBusiness: (business: Business) => void;
  reload: () => Promise<unknown>;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['businesses', user?.id],
    queryFn: () => api.get<{ businesses: Business[] }>('businesses'),
    enabled: Boolean(user),
  });
  const businesses = useMemo(() => query.data?.businesses ?? [], [query.data?.businesses]);
  const effectiveSelectedId = businesses.some((item) => item.id === selectedId) ? selectedId : businesses[0]?.id ?? null;

  const value = useMemo<BusinessContextValue>(() => ({
    businesses,
    selectedBusiness: businesses.find((item) => item.id === effectiveSelectedId) ?? null,
    isLoading: query.isLoading,
    selectBusiness: setSelectedId,
    addBusiness: (business) => {
      queryClient.setQueryData<{ businesses: Business[] }>(['businesses', user?.id], (current) => ({ businesses: [...(current?.businesses ?? []), business] }));
      setSelectedId(business.id);
    },
    updateBusiness: (business) => queryClient.setQueryData<{ businesses: Business[] }>(['businesses', user?.id], (current) => ({ businesses: (current?.businesses ?? []).map((item) => item.id === business.id ? business : item) })),
    reload: query.refetch,
  }), [businesses, effectiveSelectedId, query.isLoading, query.refetch, queryClient, user?.id]);

  return <BusinessContext value={value}>{children}</BusinessContext>;
}

export function useBusiness() {
  const context = use(BusinessContext);
  if (!context) throw new Error('useBusiness debe usarse dentro de BusinessProvider');
  return context;
}
