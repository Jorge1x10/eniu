import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaChart } from '@/components/area-chart';
import { BusinessSwitcher } from '@/components/business-switcher';
import { CreateBusinessCard } from '@/components/create-business-card';
import { MilestoneSheet } from '@/components/milestone-sheet';
import { MinusIcon, PlusIcon, ShareIcon, TrendDownIcon, TrendUpIcon } from '@/components/ui/icons';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { HeroHeader } from '@/components/hero-header';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { useBusinessesTodayViews } from '@/features/business/business-views';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { useProductQuickActions } from '@/features/catalogues/product-quick-actions';
import { getLastCelebratedMilestone, getMilestoneNotificationsEnabled, nextUncelebratedMilestone, setLastCelebratedMilestone } from '@/features/milestones/milestone-store';
import { api } from '@/lib/api';
import { defaultPictureUrl } from '@/lib/product-image';
import type { Analytics, Product } from '@/types/models';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n/formats';

function dateRange() {
  const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  return `from=${format(from)}&to=${format(to)}&timezone=America%2FMexico_City`;
}

function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ flex: 1, padding: 13, borderRadius: 16, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.06)', gap: 3 }}>
      <Text style={{ color: '#FFFDF5', fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text numberOfLines={2} style={{ color: '#8C8578', fontSize: 10.5, lineHeight: 14, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

function QuickProductRow({ product, currency, businessId, catalogueId }: { product: Product; currency: Intl.NumberFormat; businessId?: string; catalogueId?: string }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const { bumpPrice, toggleAvailable } = useProductQuickActions(businessId, catalogueId);
  const uri = defaultPictureUrl(product);
  return (
    <View style={{ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: theme.background }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlusIcon color={theme.border} size={16} /></View>
      )}
      <Pressable onPress={() => toggleAvailable(product)} style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14.5, fontWeight: '700' }}>{product.name}</Text>
        <Text style={{ color: product.is_available ? theme.success : theme.danger, fontSize: 11, fontWeight: '600' }}>{product.is_available ? t("Disponible") : t("Agotado")}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Pressable onPress={() => bumpPrice(product, -1)} style={({ pressed }) => ({ width: 30, height: 30, borderRadius: 10, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}><MinusIcon color={theme.text} size={12} /></Pressable>
        <Text style={{ minWidth: 52, textAlign: 'center', color: theme.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{product.price == null ? 'S/P' : currency.format(Number(product.price))}</Text>
        <Pressable onPress={() => bumpPrice(product, 1)} style={({ pressed }) => ({ width: 30, height: 30, borderRadius: 10, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}><PlusIcon color={theme.onYellow} size={12} /></Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { limits } = usePlan();
  const { businesses, selectedBusiness, selectBusiness, isLoading: loadingBusinesses } = useBusiness();
  const businessSummaries = useBusinessesTodayViews(businesses, limits.allow_analytics);
  const catalogues = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const selectedCatalogue = catalogues.data?.catalogues[0];
  const analytics = useQuery({ queryKey: ['analytics', selectedBusiness?.id, selectedCatalogue?.id, 30], queryFn: () => api.get<Analytics>(`businesses/${selectedBusiness!.id}/catalogues/${selectedCatalogue!.id}/analytics?${dateRange()}`), enabled: Boolean(selectedBusiness && selectedCatalogue) });
  const productsKey = ['products', selectedBusiness?.id, selectedCatalogue?.id] as const;
  const products = useQuery({ queryKey: productsKey, queryFn: () => api.get<{ products: Product[] }>(`businesses/${selectedBusiness?.id}/catalogues/${selectedCatalogue?.id}/products`), enabled: Boolean(selectedBusiness && selectedCatalogue) });
  const publicationKey = ['publication', selectedBusiness?.id, selectedCatalogue?.id] as const;
  const publication = useQuery({ queryKey: publicationKey, queryFn: () => api.get<{ publication: { is_published: boolean; public_url?: string | null } }>(`businesses/${selectedBusiness?.id}/catalogues/${selectedCatalogue?.id}/publication`), enabled: Boolean(selectedBusiness && selectedCatalogue) });

  const visits = analytics.data?.visits_over_time ?? [];
  const series = visits.map((point) => Number(point.views || 0));
  const viewsToday = series.length ? series[series.length - 1] : 0;
  const viewsYesterday = series.length > 1 ? series[series.length - 2] : 0;
  const delta = viewsYesterday > 0 ? Math.round(((viewsToday - viewsYesterday) / viewsYesterday) * 100) : viewsToday > 0 ? 100 : 0;
  const monthlyViews = series.reduce((total, value) => total + value, 0);
  const qrViews = analytics.data?.sources?.find((source) => source.key === 'qr')?.views ?? 0;
  const publishedCount = (catalogues.data?.catalogues ?? []).filter((item) => item.is_published).length;
  const showDemoBadge = Boolean(selectedCatalogue) && !analytics.isLoading && monthlyViews === 0;
  const currency = new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });
  const publicUrl = publication.data?.publication.is_published ? publication.data.publication.public_url : null;

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

  function goToPublication() {
    if (selectedCatalogue) router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/publication', params: { catalogueId: selectedCatalogue.id } });
    else router.push('/(tabs)/(menus)');
  }

  const inset = width < 380 ? 16 : 20;
  // La cabecera oscura sube hasta el borde de la pantalla y se mete bajo la
  // barra de estado, así que el ScrollView no debe insertar nada por su cuenta:
  // el área segura la respeta el contenido de la cabecera, no el contenedor.
  const safeTop = Math.max(insets.top, 12);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center' }}>
        {loadingBusinesses ? (
          <View style={{ paddingHorizontal: inset, paddingTop: safeTop + 12, gap: 5 }}><LoadingState label={t("Cargando tus negocios…")} /></View>
        ) : !selectedBusiness ? (
          <View style={{ paddingHorizontal: inset, paddingTop: safeTop + 12, gap: 16 }}>
            <View style={{ gap: 5 }}><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>{t("Hola,")} {user?.name || user?.username}</Text><Text style={{ color: theme.muted, lineHeight: 20 }}>{t("Así se están comportando tus menús hoy.")}</Text></View>
            <View style={{ alignItems: 'center', gap: 16, paddingVertical: 30 }}>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>{t("Crea tu primer negocio")}</Text>
              <Text style={{ color: theme.muted, textAlign: 'center', lineHeight: 21 }}>{t("Necesitas un negocio para comenzar a crear menús.")}</Text>
              <CreateBusinessCard />
            </View>
          </View>
        ) : catalogues.isLoading ? (
          <View style={{ paddingHorizontal: inset, paddingTop: safeTop + 12 }}><LoadingState label={t("Preparando resumen…")} /></View>
        ) : catalogues.isError ? (
          <View style={{ paddingHorizontal: inset, paddingTop: safeTop + 12 }}><ErrorState message={t("No pudimos cargar el resumen de tu negocio.")} error={catalogues.error} onRetry={() => catalogues.refetch()} /></View>
        ) : <>
          <HeroHeader paddingHorizontal={inset} paddingBottom={26} gap={4} elevated>
            <BusinessSwitcher variant="dark" />

            <View style={{ height: 22 }} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
              <View style={{ gap: 2 }}>
                <Text style={{ color: theme.heroMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' }}>{t("Vistas hoy")}</Text>
                <Text style={{ color: '#FFFDF5', fontSize: 56, lineHeight: 58, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2 }}>{viewsToday.toLocaleString(currentLocale())}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6, paddingBottom: 5 }}>
                <View style={{ minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 999, backgroundColor: 'rgba(255,224,90,0.16)' }}>
                  {delta >= 0 ? <TrendUpIcon color={theme.yellow} size={10} /> : <TrendDownIcon color={theme.yellow} size={10} />}
                  <Text style={{ color: theme.yellow, fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{delta >= 0 ? '+' : ''}{delta}%</Text>
                </View>
                <Text style={{ color: theme.heroMuted, fontSize: 10.5, fontWeight: '500' }}>{t("vs. ayer")}</Text>
              </View>
            </View>

            <View style={{ height: 14 }} />
            <AreaChart series={series} height={70} color={theme.yellow} dotStroke={theme.hero} />

            <View style={{ height: 18 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <HeroStat value={monthlyViews.toLocaleString(currentLocale())} label={t("vistas · 30 días")} />
              <HeroStat value={qrViews.toLocaleString(currentLocale())} label={t("escaneos de QR")} />
              <HeroStat value={publishedCount} label={t("menús publicados")} />
            </View>
          </HeroHeader>

          <View style={{ paddingHorizontal: inset, paddingTop: 22, gap: 22 }}>
            {showDemoBadge ? <View style={{ borderRadius: 16, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ minHeight: 24, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 999, backgroundColor: theme.yellow, paddingHorizontal: 9 }}><Text style={{ color: '#111111', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>EJEMPLO</Text></View><Text style={{ flex: 1, color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>{t("Todavía no tienes visitas reales. Esto es cómo se verá tu panel cuando tus clientes empiecen a escanear.")}</Text></View> : null}

            {selectedCatalogue && products.data?.products.length ? (
              <View style={{ gap: 11 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' }}>{t("Cambio rápido")}</Text>
                  <Pressable onPress={() => router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/products', params: { catalogueId: selectedCatalogue.id } })}><Text style={{ color: theme.yellowPressed, fontSize: 11.5, fontWeight: '800' }}>{t("Ver los {{count}}", { count: products.data.products.length })}</Text></Pressable>
                </View>
                <View style={{ ...cardStyle(theme), overflow: 'hidden' }}>
                  {products.data.products.slice(0, 3).map((product) => <QuickProductRow key={product.id} product={product} currency={currency} businessId={selectedBusiness.id} catalogueId={selectedCatalogue.id} />)}
                  <Pressable onPress={() => router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/products', params: { catalogueId: selectedCatalogue.id } })} style={({ pressed }) => ({ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, opacity: pressed ? 0.75 : 1 })}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlusIcon color={theme.onYellow} size={18} /></View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '800' }}>{t("Agregar producto")}</Text>
                      <Text style={{ color: theme.muted, fontSize: 11.5 }}>{t("A {{name}}", { name: selectedCatalogue.name })}</Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {selectedCatalogue ? (
              <View style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: theme.yellow, padding: 20, gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
                    <Text style={{ color: 'rgba(17,17,17,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' }}>{t("Tu menú en vivo")}</Text>
                    <Text numberOfLines={1} style={{ color: '#111111', fontSize: 22, fontWeight: '900' }}>{selectedCatalogue.name}</Text>
                    <Text numberOfLines={1} style={{ color: 'rgba(17,17,17,0.65)', fontSize: 12, fontWeight: '500' }}>{publicUrl ? publicUrl.replace(/^https?:\/\//, '') : t("Sin publicar todavía")}</Text>
                  </View>
                  <View style={{ width: 62, height: 62, borderRadius: 14, backgroundColor: '#111111', padding: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {publicUrl ? <QRCode value={`${publicUrl}?src=qr`} size={48} color="#FFE05A" backgroundColor="#111111" /> : <Text style={{ color: '#8C8578', fontSize: 9, fontWeight: '700', textAlign: 'center' }}>{t("Borrador")}</Text>}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 9 }}>
                  <Pressable onPress={goToPublication} style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}><Text style={{ color: theme.yellow, fontWeight: '800', fontSize: 14 }}>{t("Ver como cliente")}</Text></Pressable>
                  <Pressable
                    disabled={!publicUrl}
                    onPress={() => { if (publicUrl) Share.share({ title: selectedCatalogue.name, message: publicUrl, url: publicUrl }); }}
                    style={({ pressed }) => ({ width: 52, minHeight: 46, borderRadius: 14, backgroundColor: 'rgba(17,17,17,0.1)', alignItems: 'center', justifyContent: 'center', opacity: !publicUrl ? 0.4 : pressed ? 0.7 : 1 })}
                  >
                    <ShareIcon color="#111111" size={18} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => router.push('/(tabs)/(menus)')} style={({ pressed }) => ({ ...cardStyle(theme), padding: 20, alignItems: 'center', gap: 8, opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{t("Crea tu primer menú")}</Text>
                <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'center' }}>{t("Necesitas un menú para empezar a compartirlo con tus clientes.")}</Text>
              </Pressable>
            )}

            {businesses.length > 1 ? (
              <View style={{ gap: 11 }}>
                <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' }}>{t("Tus sucursales")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 11, paddingBottom: 2 }}>
                  {businesses.map((business) => {
                    const selected = business.id === selectedBusiness.id;
                    const summary = businessSummaries.get(business.id);
                    return (
                      <Pressable key={business.id} onPress={() => selectBusiness(business.id)} style={({ pressed }) => ({ width: 150, padding: 14, borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1.5, borderColor: selected ? theme.yellowPressed : theme.border, gap: 10, opacity: pressed ? 0.8 : 1, ...(selected ? {} : theme.cardShadow) })}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: selected ? theme.yellow : theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.onYellow, fontSize: 14, fontWeight: '900' }}>{business.name.trim().charAt(0).toUpperCase()}</Text></View>
                        </View>
                        <Text numberOfLines={2} style={{ color: theme.text, fontSize: 13.5, lineHeight: 17, fontWeight: '800' }}>{business.name}</Text>
                        {limits.allow_analytics ? (
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                            <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{summary?.isLoading ? '—' : (summary?.views ?? 0)}</Text>
                            <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '500' }}>{t("vistas hoy")}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </>}
      </View>
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
