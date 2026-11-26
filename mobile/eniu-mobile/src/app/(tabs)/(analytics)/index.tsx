import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BusinessSwitcher } from '@/components/business-switcher';
import { Button } from '@/components/ui/button';
import { LockIcon, ShareIcon } from '@/components/ui/icons';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { SegmentedControl } from '@/components/ui/segmented';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useScreenTopPadding } from '@/constants/layout';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { currentLocale } from '@/i18n/formats';
import { visitsPath } from '@/lib/analytics-range';
import { api } from '@/lib/api';
import type { Analytics } from '@/types/models';

type Range = '7' | '30';

/** Respaldo por si un backend viejo manda `key` sin `label` ya traducido. */
const SOURCE_LABELS: Record<string, string> = { qr: 'Código QR en mesa', whatsapp: 'Enlace en WhatsApp', direct: 'Directo', social: 'Redes sociales', web: 'Sitio web' };

function SectionLabel({ children }: { children: string }) {
  const theme = useEniuTheme();
  return <Text accessibilityRole="header" style={{ color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 4 }}>{children}</Text>;
}

/** Barras por día. Sin visitas, barras mínimas: nunca una gráfica plana que parezca rota. */
function DailyBars({ values, color, emptyColor }: { values: number[]; color: string; emptyColor: string }) {
  const max = Math.max(1, ...values);
  return (
    <View accessible={false} style={{ height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: values.length > 10 ? 2 : 6 }}>
      {values.map((value, index) => {
        const today = index === values.length - 1;
        return (
          <View
            key={index}
            style={{ flex: 1, height: Math.max(4, (value / max) * 96), borderRadius: values.length > 10 ? 2 : 5, backgroundColor: value > 0 ? color : emptyColor, opacity: value > 0 && !today ? 0.55 : 1 }}
          />
        );
      })}
    </View>
  );
}

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  const topPadding = useScreenTopPadding();
  const { selectedBusiness } = useBusiness();
  const { analyticsScope } = usePlan();
  const [range, setRange] = useState<Range>('7');
  // El gratuito ve el resumen de 7 días; el informe de 30 lleva candado.
  const isSummary = analyticsScope === 'summary';
  const visitsScope = isSummary ? 'summary' : 'full';
  const menus = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const selected = menus.data?.catalogues[0];
  const analytics = useQuery({ queryKey: ['analytics', visitsScope, selectedBusiness?.id, selected?.id, 30, selectedBusiness?.timezone], queryFn: () => api.get<Analytics>(visitsPath(visitsScope, selectedBusiness!.id, selected!.id, 30, selectedBusiness!.timezone)), enabled: Boolean(selectedBusiness && selected) && analyticsScope !== 'none' });
  const publication = useQuery({ queryKey: ['publication', selectedBusiness?.id, selected?.id] as const, queryFn: () => api.get<{ publication: { is_published: boolean; public_url?: string | null } }>(`businesses/${selectedBusiness?.id}/catalogues/${selected?.id}/publication`), enabled: Boolean(selectedBusiness && selected) });
  const publicUrl = publication.data?.publication.is_published ? publication.data.publication.public_url : null;

  const all = (analytics.data?.visits_over_time ?? []).map((point) => Number(point.views || 0));
  const days = range === '7' ? all.slice(-7) : all;
  const total = days.reduce((sum, value) => sum + value, 0);
  // Con 30 días de datos, la semana anterior sale de la misma serie; el resto
  // de los casos usa la comparación que ya calcula el backend.
  let change: number | null = null;
  if (range === '7' && !isSummary && all.length >= 14) {
    const previous = all.slice(-14, -7).reduce((sum, value) => sum + value, 0);
    change = previous > 0 ? Math.round(((total - previous) / previous) * 100) : null;
  } else {
    const fromBackend = analytics.data?.summary?.menu_views?.percentage_change;
    change = typeof fromBackend === 'number' ? Math.round(fromBackend) : null;
  }
  const changeText = change === null ? null
    : change === 0 ? (range === '7' ? t("Igual que la semana anterior") : t("Igual que el mes anterior"))
    : `${change > 0 ? '+' : ''}${change}% ${range === '7' ? t("vs. la semana anterior") : t("vs. el mes anterior")}`;

  const sources = (analytics.data?.sources ?? []).filter((source) => Number(source.views) > 0).sort((a, b) => Number(b.views) - Number(a.views));
  const sourcesTotal = Math.max(1, sources.reduce((sum, source) => sum + Number(source.views || 0), 0));
  const topProducts = (analytics.data?.top_products ?? []).filter((product) => Number(product.interactions) > 0).slice(0, 5);

  function chooseRange(next: Range) {
    if (next === '30' && isSummary) { router.push('/paywall'); return; }
    setRange(next);
  }
  function share() {
    if (publicUrl && selected) Share.share({ title: selected.name, message: publicUrl, url: publicUrl });
    else if (selected) router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/publication', params: { catalogueId: selected.id } });
  }

  const kpiDark = !isDark;
  const kpiText = kpiDark ? theme.heroText : theme.text;
  const kpiMuted = kpiDark ? theme.heroMuted : theme.muted;

  const header = (
    <View style={{ gap: 2 }}>
      <BusinessSwitcher variant="inline" />
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 }}>{t("Analíticas")}</Text>
    </View>
  );

  let body;
  if (!selectedBusiness) body = <EmptyState title={t("Sin negocio seleccionado")} description={t("Crea un negocio desde Inicio.")} />;
  else if (analyticsScope === 'none') body = <EmptyState title={t("Tu plan actual no incluye analíticas")} description={t("Tus visitas se siguen registrando: al activarlo no empiezas de cero.")} />;
  else if (menus.isLoading || analytics.isLoading) body = <LoadingState label={t("Calculando analíticas…")} />;
  else if (menus.isError || analytics.isError) body = <ErrorState message={t("No pudimos cargar las analíticas.")} error={menus.error ?? analytics.error} onRetry={() => { menus.refetch(); analytics.refetch(); }} />;
  else if (!selected) body = <EmptyState title={t("Sin datos todavía")} description={t("Crea un menú para comenzar a registrar visitas.")} />;
  else body = (
    <>
      <SegmentedControl<Range>
        accessibilityLabel={t("Periodo")}
        value={range}
        onChange={chooseRange}
        options={[
          { key: '7', label: t("7 días") },
          { key: '30', label: t("30 días"), accessory: isSummary ? <LockIcon color={theme.muted} size={12} /> : undefined },
        ]}
      />

      <View style={kpiDark ? { borderRadius: 24, borderCurve: 'continuous', backgroundColor: theme.authHero, padding: 20, gap: 14 } : { ...cardStyle(theme, 24), padding: 20, gap: 14 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: kpiMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{range === '7' ? t("Vistas · 7 días") : t("Vistas · 30 días")}</Text>
          <Text selectable accessibilityLabel={t("{{count}} vistas", { count: total })} style={{ color: theme.yellow, fontSize: 60, lineHeight: 64, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{total.toLocaleString(currentLocale())}</Text>
          {changeText ? <Text style={{ color: kpiMuted, fontSize: 14, fontWeight: '600' }}>{changeText}</Text> : null}
        </View>
        <DailyBars values={days.length ? days : Array(range === '7' ? 7 : 30).fill(0)} color={theme.yellow} emptyColor={kpiDark ? 'rgba(251,247,236,0.14)' : theme.surfaceAlt} />
        {total === 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: kpiText, fontSize: 15, lineHeight: 21 }}>{t("Aún sin visitas. Comparte tu QR para empezar a medir.")}</Text>
            <Button onPress={share} trailingIcon={<ShareIcon color={theme.onYellow} size={16} />}>{t("Compartir")}</Button>
          </View>
        ) : null}
      </View>

      {isSummary ? (
        <View style={{ ...cardStyle(theme, 22), padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><LockIcon color={theme.text} size={15} /></View>
            <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>{t("Informe completo")}</Text>
          </View>
          {[t("Lo más visto"), t("Las horas con más visitas"), t("De dónde llegan tus clientes")].map((item) => (
            <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: theme.yellowPressed }} />
              <Text style={{ color: theme.text, fontSize: 15 }}>{item}</Text>
            </View>
          ))}
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{t("Tus visitas se siguen registrando: al activarlo no empiezas de cero.")}</Text>
          <Button variant="secondary" onPress={() => router.push('/paywall')}>{t("Ver planes")}</Button>
        </View>
      ) : (
        <>
          {sources.length ? (
            <View style={{ gap: 8 }}>
              <SectionLabel>{t("De dónde llegan")}</SectionLabel>
              <View style={{ ...cardStyle(theme, 20), padding: 18, gap: 15 }}>
                {sources.map((source) => (
                  <View key={source.key} style={{ gap: 7 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' }}>{source.label || t(SOURCE_LABELS[source.key] ?? source.key)}</Text>
                      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{Number(source.views).toLocaleString(currentLocale())}</Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 99, backgroundColor: theme.surfaceAlt }}>
                      <View style={{ width: `${Math.max(4, Number(source.views) * 100 / sourcesTotal)}%`, height: 8, borderRadius: 99, backgroundColor: theme.yellow }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {topProducts.length ? (
            <View style={{ gap: 8 }}>
              <SectionLabel>{t("Lo más visto")}</SectionLabel>
              <View style={{ ...cardStyle(theme, 20), overflow: 'hidden' }}>
                {topProducts.map((product, index) => (
                  <View key={`${product.name}-${index}`} style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: index ? 1 : 0, borderTopColor: theme.border }}>
                    <Text style={{ width: 20, color: theme.muted, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{index + 1}</Text>
                    <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '700' }}>{product.name}</Text>
                    <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{t("{{count}} vistas", { count: Number(product.interactions) })}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: topPadding, paddingBottom: 24, gap: 16 }}>
      {header}
      {body}
    </ScrollView>
  );
}
