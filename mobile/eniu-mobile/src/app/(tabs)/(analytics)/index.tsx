import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaChart } from '@/components/area-chart';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { HeroHeader } from '@/components/hero-header';
import { HeroScreen } from '@/components/hero-screen';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Analytics } from '@/types/models';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n/formats';

/** Respaldo por si un backend viejo manda `key` sin `label` ya traducido. */
const SOURCE_LABELS: Record<string, string> = { qr: 'Código QR en mesa', whatsapp: 'Enlace en WhatsApp', direct: 'Directo', social: 'Redes sociales', web: 'Sitio web' };
const SOURCE_COLORS = ['#FFE05A', '#F1DE9B', '#E0D4B4', '#D9D9D9'];

function queryRange() { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29); return `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&timezone=America%2FMexico_City`; }
function shortDate(value: string) { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }); }

function SectionLabel({ children }: { children: string }) {
  const theme = useEniuTheme();
  return <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' }}>{children}</Text>;
}

export default function AnalyticsScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 12);
  const { selectedBusiness } = useBusiness();
  const { limits } = usePlan();
  const menus = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const selected = menus.data?.catalogues[0];
  const analytics = useQuery({ queryKey: ['analytics', selectedBusiness?.id, selected?.id, 30], queryFn: () => api.get<Analytics>(`businesses/${selectedBusiness!.id}/catalogues/${selected!.id}/analytics?${queryRange()}`), enabled: Boolean(selectedBusiness && selected) && limits.allow_analytics });
  const points = analytics.data?.visits_over_time ?? [];
  const total = points.reduce((sum, point) => sum + Number(point.views || 0), 0);
  const busiest = points.reduce((best, point) => Number(point.views || 0) > Number(best?.views || 0) ? point : best, points[0]);
  const sources = (analytics.data?.sources ?? []).filter((source) => Number(source.views) > 0).sort((a, b) => Number(b.views) - Number(a.views));
  const sourcesTotal = Math.max(1, sources.reduce((sum, source) => sum + Number(source.views || 0), 0));
  const topProducts = (analytics.data?.top_products ?? []).filter((product) => Number(product.interactions) > 0).slice(0, 5);
  // El backend ya compara contra los 30 días anteriores; `null` significa que no
  // había periodo previo con el que comparar, y entonces no se enseña nada.
  const change = analytics.data?.summary?.menu_views?.percentage_change;
  const deltaLabel = typeof change === 'number' ? `${change > 0 ? '+' : ''}${Math.round(change)}%` : null;

  const padded = { paddingHorizontal: 18, paddingTop: safeTop + 12, gap: 18 };

  if (!selectedBusiness) return <ScrollView contentInsetAdjustmentBehavior="never" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={padded}><EmptyState title={t("Sin negocio seleccionado")} description={t("Crea un negocio desde Inicio.")} /></ScrollView>;
  if (!limits.allow_analytics) return <ScrollView contentInsetAdjustmentBehavior="never" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={padded}><EmptyState title={t("Tu plan actual no incluye analíticas")} description={t("Las visitas de tu menú se siguen registrando mientras tanto, así que al activarlas no empiezas de cero.")} /></ScrollView>;
  if (menus.isLoading || analytics.isLoading) return <ScrollView contentInsetAdjustmentBehavior="never" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={padded}><LoadingState label={t("Calculando analíticas…")} /></ScrollView>;
  if (menus.isError || analytics.isError) return <ScrollView contentInsetAdjustmentBehavior="never" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={padded}><ErrorState message={t("No pudimos cargar las analíticas.")} error={menus.error ?? analytics.error} onRetry={() => { menus.refetch(); analytics.refetch(); }} /></ScrollView>;
  if (!selected) return <ScrollView contentInsetAdjustmentBehavior="never" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={padded}><EmptyState title={t("Sin datos todavía")} description={t("Crea un menú para comenzar a registrar visitas.")} /></ScrollView>;

  return (
    <HeroScreen contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Cabecera a sangre, con el número protagonista en amarillo sobre negro. */}
      <HeroHeader paddingHorizontal={20} paddingBottom={26} gap={20}>
        <View style={{ gap: 3 }}>
          <Text numberOfLines={1} style={{ color: theme.heroMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' }}>{selectedBusiness.name} · {t("30 días")}</Text>
          <Text style={{ color: '#FFFDF5', fontSize: 24, fontWeight: '900' }}>{t("Analíticas")}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
          <Text selectable style={{ color: theme.yellow, fontSize: 56, lineHeight: 58, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2 }}>{total.toLocaleString(currentLocale())}</Text>
          {deltaLabel ? (
            <View style={{ alignItems: 'flex-end', gap: 3, paddingBottom: 6 }}>
              <Text style={{ color: theme.yellow, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{deltaLabel}</Text>
              <Text style={{ color: theme.heroMuted, fontSize: 10.5, fontWeight: '500' }}>{t("vs. mes anterior")}</Text>
            </View>
          ) : null}
        </View>

        <AreaChart series={points.map((point) => Number(point.views || 0))} height={130} color={theme.yellow} dotStroke={theme.hero} />

        {points.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#6E685D', fontSize: 10.5, fontWeight: '600' }}>{shortDate(points[0].date)}</Text>
            {busiest && Number(busiest.views) > 0 ? <Text style={{ color: theme.yellow, fontSize: 10.5, fontWeight: '700' }}>{t("pico {{views}} · {{date}}", { views: Number(busiest.views), date: shortDate(busiest.date) })}</Text> : null}
            <Text style={{ color: '#6E685D', fontSize: 10.5, fontWeight: '600' }}>{t("hoy")}</Text>
          </View>
        ) : null}
      </HeroHeader>

      <View style={{ paddingHorizontal: 18, paddingTop: 20, gap: 22 }}>
        {sources.length ? (
          <View style={{ gap: 11 }}>
            <SectionLabel>{t("De dónde llegan")}</SectionLabel>
            <View style={{ ...cardStyle(theme), padding: 18, gap: 15 }}>
              {sources.map((source, index) => (
                <View key={source.key} style={{ gap: 7 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 13, fontWeight: '600' }}>{source.label || SOURCE_LABELS[source.key] || source.key}</Text>
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{Number(source.views).toLocaleString(currentLocale())}</Text>
                  </View>
                  <View style={{ height: 9, borderRadius: 99, backgroundColor: theme.surfaceAlt }}>
                    <View style={{ width: `${Math.max(4, Number(source.views) * 100 / sourcesTotal)}%`, height: 9, borderRadius: 99, backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {topProducts.length ? (
          <View style={{ gap: 11 }}>
            <SectionLabel>{t("Lo más visto")}</SectionLabel>
            <View style={{ ...cardStyle(theme), overflow: 'hidden' }}>
              {topProducts.map((product, index) => (
                <View key={`${product.name}-${index}`} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: index === topProducts.length - 1 ? 0 : 1, borderBottomColor: theme.border }}>
                  <Text style={{ width: 20, color: '#D8CDAE', fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{index + 1}</Text>
                  <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 14.5, fontWeight: '700' }}>{product.name}</Text>
                  <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{t("{{count}} vistas", { count: Number(product.interactions) })}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </HeroScreen>
  );
}
