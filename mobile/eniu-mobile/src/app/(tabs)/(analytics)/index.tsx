import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';

import { BusinessSwitcher } from '@/components/business-switcher';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useScreenTopPadding } from '@/constants/layout';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Analytics } from '@/types/models';

const SOURCE_LABELS: Record<string, string> = { qr: 'Código QR en mesa', whatsapp: 'Enlace en WhatsApp', direct: 'Directo', social: 'Redes sociales', web: 'Sitio web' };
const SOURCE_COLORS = ['#FFE05A', '#F8E8AE', '#E9DDB7', '#D9D9D9'];

function queryRange() { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29); return `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&timezone=America%2FMexico_City`; }
function shortDate(value: string) { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }); }

export default function AnalyticsScreen() {
  const theme = useEniuTheme();
  const topPadding = useScreenTopPadding();
  const { selectedBusiness } = useBusiness();
  const menus = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const selected = menus.data?.catalogues[0];
  const analytics = useQuery({ queryKey: ['analytics', selectedBusiness?.id, selected?.id, 30], queryFn: () => api.get<Analytics>(`businesses/${selectedBusiness!.id}/catalogues/${selected!.id}/analytics?${queryRange()}`), enabled: Boolean(selectedBusiness && selected) });
  const points = analytics.data?.visits_over_time ?? [];
  const max = Math.max(1, ...points.map((point) => Number(point.views || 0)));
  const total = points.reduce((sum, point) => sum + Number(point.views || 0), 0);
  const busiest = points.reduce((best, point) => Number(point.views || 0) > Number(best?.views || 0) ? point : best, points[0]);
  const sources = (analytics.data?.sources ?? []).filter((source) => Number(source.views) > 0).sort((a, b) => Number(b.views) - Number(a.views));
  const sourcesTotal = Math.max(1, sources.reduce((sum, source) => sum + Number(source.views || 0), 0));

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 18, paddingTop: topPadding, paddingBottom: 120, gap: 18 }}>
      <View style={{ gap: 5 }}>
        <Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>Analíticas</Text>
        <Text style={{ color: theme.muted, lineHeight: 20 }}>Cómo se está viendo tu menú.</Text>
      </View>
      <BusinessSwitcher />
      {!selectedBusiness ? <EmptyState title="Sin negocio seleccionado" description="Crea un negocio desde Inicio." /> : menus.isLoading || analytics.isLoading ? <LoadingState label="Calculando analíticas…" /> : menus.isError || analytics.isError ? <ErrorState message="No pudimos cargar las analíticas." onRetry={() => { menus.refetch(); analytics.refetch(); }} /> : !selected ? <EmptyState title="Sin datos todavía" description="Crea un menú para comenzar a registrar visitas." /> : <>
        <Text style={{ color: theme.muted }}>Menú: <Text style={{ color: theme.text, fontWeight: '900' }}>{selected.name}</Text></Text>

        <View style={{ minHeight: 260, padding: 20, gap: 16, backgroundColor: '#111111', borderRadius: 24, borderCurve: 'continuous' }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#C7C7C7', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>Vistas del menú</Text>
            <Text selectable style={{ color: theme.yellow, fontSize: 38, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 42 }}>{total.toLocaleString('es-MX')}</Text>
          </View>
          <View accessibilityLabel={`Gráfica de vistas, total ${total}`} style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>{points.map((point) => <View key={point.date} style={{ flex: 1, minHeight: 4, height: `${Math.max(3, Number(point.views || 0) * 100 / max)}%`, borderRadius: 3, backgroundColor: Number(point.views || 0) === max && max > 0 ? theme.yellow : '#555555' }} />)}</View>
          {points.length ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#8A8578', fontSize: 10.5, fontWeight: '600' }}>{shortDate(points[0].date)}</Text>
            {busiest && Number(busiest.views) > 0 ? <Text style={{ color: theme.yellow, fontSize: 10.5, fontWeight: '600' }}>{shortDate(busiest.date)} · {Number(busiest.views).toLocaleString('es-MX')} vistas</Text> : null}
            <Text style={{ color: '#8A8578', fontSize: 10.5, fontWeight: '600' }}>{shortDate(points[points.length - 1].date)}</Text>
          </View> : null}
        </View>

        {sources.length ? <View style={{ borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 18, gap: 15 }}>
          <Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>De dónde llegan</Text>
          <View style={{ gap: 12 }}>{sources.map((source, index) => <View key={source.key} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '600' }}>{SOURCE_LABELS[source.key] ?? source.key}</Text>
              <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{Number(source.views).toLocaleString('es-MX')}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 99, backgroundColor: theme.surfaceAlt }}><View style={{ width: `${Math.max(4, Number(source.views) * 100 / sourcesTotal)}%`, height: 8, borderRadius: 99, backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} /></View>
          </View>)}</View>
        </View> : null}
      </>}
    </ScrollView>
  );
}
