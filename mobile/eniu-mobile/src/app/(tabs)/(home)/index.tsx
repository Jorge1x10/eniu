import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { BusinessSwitcher } from '@/components/business-switcher';
import { CreateBusinessCard } from '@/components/create-business-card';
import { MetricCard } from '@/components/metric-card';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Analytics } from '@/types/models';

function dateRange() {
  const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  return `from=${format(from)}&to=${format(to)}&timezone=America%2FMexico_City`;
}

export default function HomeScreen() {
  const theme = useEniuTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { selectedBusiness, isLoading: loadingBusinesses } = useBusiness();
  const catalogues = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const selectedCatalogue = catalogues.data?.catalogues[0];
  const analytics = useQuery({ queryKey: ['analytics', selectedBusiness?.id, selectedCatalogue?.id, 30], queryFn: () => api.get<Analytics>(`businesses/${selectedBusiness!.id}/catalogues/${selectedCatalogue!.id}/analytics?${dateRange()}`), enabled: Boolean(selectedBusiness && selectedCatalogue) });
  const visits = analytics.data?.visits_over_time ?? [];
  const monthlyViews = visits.reduce((total, item) => total + Number(item.views || 0), 0);
  const qrViews = analytics.data?.sources?.find((source) => source.key === 'qr')?.views ?? 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
        paddingHorizontal: width < 380 ? 16 : 20,
        paddingTop: process.env.EXPO_OS === 'web' ? 28 : 18,
        paddingBottom: 120,
        gap: 24,
      }}
    >
      <View style={{ gap: 5 }}><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>Hola, {user?.name || user?.username} 👋</Text><Text style={{ color: theme.muted, lineHeight: 20 }}>Así se están comportando tus menús hoy.</Text></View>
      {loadingBusinesses ? <LoadingState label="Cargando tus negocios…" /> : !selectedBusiness ? <View style={{ alignItems: 'center', gap: 16, paddingVertical: 30 }}><Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>Crea tu primer negocio</Text><Text style={{ color: theme.muted, textAlign: 'center', lineHeight: 21 }}>Necesitas un negocio para comenzar a crear menús.</Text><CreateBusinessCard /></View> : <>
        <BusinessSwitcher />
        {catalogues.isLoading ? <LoadingState label="Preparando resumen…" /> : catalogues.isError ? <ErrorState message="No pudimos cargar el resumen de tu negocio." onRetry={() => catalogues.refetch()} /> : <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            <MetricCard label="Vistas últimos 30 días" value={monthlyViews.toLocaleString('es-MX')} detail={selectedCatalogue ? selectedCatalogue.name : 'Sin menú seleccionado'} />
            <MetricCard label="Menús activos" value={(catalogues.data?.catalogues ?? []).filter((item) => item.is_published).length} detail={`${(catalogues.data?.catalogues ?? []).filter((item) => !item.is_published).length} en borrador`} tone="cream" />
            <MetricCard label="Escaneos QR" value={qrViews.toLocaleString('es-MX')} detail="Origen atribuido al código QR" tone="sand" />
            <MetricCard label="Menús totales" value={catalogues.data?.catalogues.length ?? 0} detail="En este negocio" />
          </View>
          <View style={{ backgroundColor: '#1E1E1E', borderRadius: 22, borderCurve: 'continuous', padding: width < 380 ? 18 : 22, gap: 14 }}><Text style={{ color: '#FFFDF5', fontSize: 18, fontWeight: '800' }}>Acciones rápidas</Text><Button onPress={() => router.push('/(tabs)/(menus)')}>Administrar menús</Button>{selectedCatalogue ? <Button variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/(menus)/[catalogueId]', params: { catalogueId: selectedCatalogue.id } })}>Abrir {selectedCatalogue.name}</Button> : null}</View>
        </>}
      </>}
    </ScrollView>
  );
}
