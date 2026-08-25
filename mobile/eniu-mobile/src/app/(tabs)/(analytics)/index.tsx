import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessSwitcher } from '@/components/business-switcher';
import { MetricCard } from '@/components/metric-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Analytics } from '@/types/models';

function queryRange() { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29); return `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&timezone=America%2FMexico_City`; }

export default function AnalyticsScreen() {
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const { selectedBusiness } = useBusiness();
  const menus = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const selected = menus.data?.catalogues[0];
  const analytics = useQuery({ queryKey: ['analytics', selectedBusiness?.id, selected?.id, 30], queryFn: () => api.get<Analytics>(`businesses/${selectedBusiness!.id}/catalogues/${selected!.id}/analytics?${queryRange()}`), enabled: Boolean(selectedBusiness && selected) });
  const points = analytics.data?.visits_over_time ?? [];
  const max = Math.max(1, ...points.map((point) => Number(point.views || 0)));
  const total = points.reduce((sum, point) => sum + Number(point.views || 0), 0);
  const qr = analytics.data?.sources?.find((source) => source.key === 'qr')?.views ?? 0;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingTop: insets.top + 20, paddingBottom: 120, gap: 18, backgroundColor: theme.background }}>
      <ScreenHeader eyebrow="Rendimiento del menú" title="Analíticas" subtitle="Estas métricas representan visitas e interés; no son ventas ni pedidos." />
      <BusinessSwitcher />
      {!selectedBusiness ? <EmptyState title="Sin negocio seleccionado" description="Crea un negocio desde Inicio." /> : menus.isLoading || analytics.isLoading ? <LoadingState label="Calculando analíticas…" /> : menus.isError || analytics.isError ? <ErrorState message="No pudimos cargar las analíticas." onRetry={() => { menus.refetch(); analytics.refetch(); }} /> : !selected ? <EmptyState title="Sin datos todavía" description="Crea un menú para comenzar a registrar visitas." /> : <>
        <Text style={{ color: theme.muted }}>Menú: <Text style={{ color: theme.text, fontWeight: '900' }}>{selected.name}</Text></Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><MetricCard label="Vistas" value={total.toLocaleString('es-MX')} detail="Últimos 30 días" /><MetricCard label="Desde QR" value={Number(qr).toLocaleString('es-MX')} detail="Origen aproximado" tone="cream" /></View>
        <View style={{ minHeight: 290, padding: 20, gap: 18, backgroundColor: '#1E1E1E', borderRadius: 22, borderCurve: 'continuous' }}><View><Text style={{ color: '#FFFDF5', fontSize: 18, fontWeight: '900' }}>Vistas por día</Text><Text selectable style={{ color: theme.yellow, fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 8 }}>{total.toLocaleString('es-MX')}</Text></View><View accessibilityLabel={`Gráfica de vistas, total ${total}`} style={{ height: 180, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>{points.slice(-14).map((point) => <View key={point.date} style={{ flex: 1, minHeight: 4, height: `${Math.max(3, Number(point.views || 0) * 100 / max)}%`, borderRadius: 4, backgroundColor: Number(point.views || 0) === max ? theme.yellow : '#555555' }} />)}</View></View>
      </>}
    </ScrollView>
  );
}
