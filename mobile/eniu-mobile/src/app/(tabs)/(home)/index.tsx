import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessSwitcher } from '@/components/business-switcher';
import { CreateBusinessCard } from '@/components/create-business-card';
import { MenuSkeleton } from '@/components/menu-skeleton';
import { MetricCard } from '@/components/metric-card';
import { MilestoneSheet } from '@/components/milestone-sheet';
import { PlusIcon, QrIcon } from '@/components/ui/icons';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { getLastCelebratedMilestone, getMilestoneNotificationsEnabled, nextUncelebratedMilestone, setLastCelebratedMilestone } from '@/features/milestones/milestone-store';
import { api } from '@/lib/api';
import type { Analytics } from '@/types/models';

function dateRange() {
  const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  return `from=${format(from)}&to=${format(to)}&timezone=America%2FMexico_City`;
}

function QuickAction({ title, subtitle, tone, icon, onPress }: { title: string; subtitle: string; tone: 'cream' | 'surface'; icon: React.ReactNode; onPress?: () => void }) {
  const theme = useEniuTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ minHeight: 62, borderRadius: 16, borderCurve: 'continuous', backgroundColor: tone === 'cream' ? theme.cream : theme.surface, borderWidth: tone === 'surface' ? 1 : 0, borderColor: theme.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tone === 'cream' ? theme.background : theme.yellow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</View>
      <View style={{ minWidth: 0, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 11.5 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const theme = useEniuTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedBusiness, isLoading: loadingBusinesses } = useBusiness();
  const catalogues = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const selectedCatalogue = catalogues.data?.catalogues[0];
  const analytics = useQuery({ queryKey: ['analytics', selectedBusiness?.id, selectedCatalogue?.id, 30], queryFn: () => api.get<Analytics>(`businesses/${selectedBusiness!.id}/catalogues/${selectedCatalogue!.id}/analytics?${dateRange()}`), enabled: Boolean(selectedBusiness && selectedCatalogue) });
  const visits = analytics.data?.visits_over_time ?? [];
  const monthlyViews = visits.reduce((total, item) => total + Number(item.views || 0), 0);
  const qrViews = analytics.data?.sources?.find((source) => source.key === 'qr')?.views ?? 0;
  const publishedCount = (catalogues.data?.catalogues ?? []).filter((item) => item.is_published).length;
  const draftCount = (catalogues.data?.catalogues ?? []).filter((item) => !item.is_published).length;
  const showDemoBadge = Boolean(selectedCatalogue) && !analytics.isLoading && monthlyViews === 0;

  const [milestone, setMilestone] = useState<number | null>(null);
  useEffect(() => {
    if (!selectedCatalogue || analytics.isLoading) return;
    let active = true;
    (async () => {
      const enabled = await getMilestoneNotificationsEnabled();
      if (!enabled) return;
      const last = await getLastCelebratedMilestone(selectedCatalogue.id);
      const reached = nextUncelebratedMilestone(monthlyViews, last);
      if (reached && active) setMilestone(reached);
    })();
    return () => { active = false; };
  }, [selectedCatalogue, monthlyViews, analytics.isLoading]);

  async function dismissMilestone() {
    if (selectedCatalogue && milestone) await setLastCelebratedMilestone(selectedCatalogue.id, milestone);
    setMilestone(null);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
        paddingHorizontal: width < 380 ? 16 : 20,
        paddingTop: process.env.EXPO_OS === 'web' ? 28 : process.env.EXPO_OS === 'android' ? insets.top + 18 : 18,
        paddingBottom: 120,
        gap: 22,
      }}
    >
      <View style={{ gap: 5 }}><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>Hola, {user?.name || user?.username}</Text><Text style={{ color: theme.muted, lineHeight: 20 }}>Así se están comportando tus menús hoy.</Text></View>
      {loadingBusinesses ? <LoadingState label="Cargando tus negocios…" /> : !selectedBusiness ? <View style={{ alignItems: 'center', gap: 16, paddingVertical: 30 }}><Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>Crea tu primer negocio</Text><Text style={{ color: theme.muted, textAlign: 'center', lineHeight: 21 }}>Necesitas un negocio para comenzar a crear menús.</Text><CreateBusinessCard /></View> : <>
        <BusinessSwitcher />
        {catalogues.isLoading ? <LoadingState label="Preparando resumen…" /> : catalogues.isError ? <ErrorState message="No pudimos cargar el resumen de tu negocio." onRetry={() => catalogues.refetch()} /> : <>
          {showDemoBadge ? <View style={{ borderRadius: 16, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ minHeight: 24, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 999, backgroundColor: theme.yellow, paddingHorizontal: 9 }}><Text style={{ color: '#111111', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>EJEMPLO</Text></View><Text style={{ flex: 1, color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>Todavía no tienes visitas reales. Esto es cómo se verá tu panel cuando tus clientes empiecen a escanear.</Text></View> : null}

          {selectedCatalogue ? (
            <View style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#111111', padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.yellow, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>Tu menú en vivo</Text>
                  <Text style={{ color: '#FFFDF5', fontSize: 21, fontWeight: '800' }}>{selectedCatalogue.name}</Text>
                </View>
                <View style={{ minHeight: 28, justifyContent: 'center', borderRadius: 999, backgroundColor: selectedCatalogue.is_published ? theme.yellow : 'rgba(255,255,255,0.12)', paddingHorizontal: 11 }}><Text style={{ color: selectedCatalogue.is_published ? '#111111' : '#C7C7C7', fontSize: 11, fontWeight: '800' }}>{selectedCatalogue.is_published ? 'Publicado' : 'Borrador'}</Text></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'stretch' }}>
                <MenuSkeleton width={98} padding={10} />
                <View style={{ flex: 1, minWidth: 0, gap: 10, justifyContent: 'space-between' }}>
                  <Text style={{ color: '#C7C7C7', fontSize: 12.5, lineHeight: 19 }} numberOfLines={2}>{selectedCatalogue.description || 'Agrega una descripción para tus clientes.'}</Text>
                  <Pressable onPress={() => router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/publication', params: { catalogueId: selectedCatalogue.id } })} style={({ pressed }) => ({ height: 44, borderRadius: 13, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}><Text style={{ color: '#111111', fontWeight: '700', fontSize: 14 }}>Ver como cliente</Text></Pressable>
                </View>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            <MetricCard label="Vistas últimos 30 días" value={monthlyViews.toLocaleString('es-MX')} detail={showDemoBadge ? 'Dato de ejemplo' : (selectedCatalogue ? selectedCatalogue.name : 'Sin menú seleccionado')} emphasis={showDemoBadge} />
            <MetricCard label="Escaneos QR" value={qrViews.toLocaleString('es-MX')} detail={showDemoBadge ? 'Dato de ejemplo' : 'Origen atribuido al código QR'} tone="cream" emphasis={showDemoBadge} />
            <MetricCard label="Menús activos" value={publishedCount} detail={`${draftCount} en borrador`} tone="sand" />
            <MetricCard label="Menús totales" value={catalogues.data?.catalogues.length ?? 0} detail="En este negocio" />
          </View>

          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.yellowPressed, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Acciones rápidas</Text>
            <View style={{ gap: 9 }}>
              <QuickAction
                title="Agregar producto"
                subtitle={selectedCatalogue ? `Súbelo a ${selectedCatalogue.name}` : 'Crea un menú primero'}
                tone="cream"
                icon={<PlusIcon color="#111111" size={18} />}
                onPress={() => selectedCatalogue ? router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/products', params: { catalogueId: selectedCatalogue.id } }) : router.push('/(tabs)/(menus)')}
              />
              <QuickAction
                title="Descargar QR"
                subtitle="Para imprimir y pegar en mesa"
                tone="surface"
                icon={<QrIcon color="#111111" size={17} />}
                onPress={() => selectedCatalogue ? router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/publication', params: { catalogueId: selectedCatalogue.id } }) : router.push('/(tabs)/(menus)')}
              />
            </View>
          </View>
        </>}
      </>}
      {selectedCatalogue && milestone ? (
        <MilestoneSheet
          visible
          milestone={milestone}
          catalogueName={selectedCatalogue.name}
          isPublished={selectedCatalogue.is_published}
          hasScans={qrViews > 0}
          onDismiss={dismissMilestone}
        />
      ) : null}
    </ScrollView>
  );
}
