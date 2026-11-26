import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, Text, useColorScheme, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { BusinessSwitcher } from '@/components/business-switcher';
import { MesaBadge } from '@/components/orders/mesa-badge';
import { CreateBusinessCard } from '@/components/create-business-card';
import { HeroSheet } from '@/components/hero-sheet';
import { MilestoneSheet } from '@/components/milestone-sheet';
import { EniuSwitch } from '@/components/ui/eniu-switch';
import { ChevronRightIcon, EyeIcon, ImageIcon, ShareIcon, TrendDownIcon, TrendUpIcon } from '@/components/ui/icons';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { useProductQuickActions } from '@/features/catalogues/product-quick-actions';
import { useOrders } from '@/features/orders/orders-context';
import { getLastCelebratedMilestone, getMilestoneNotificationsEnabled, nextUncelebratedMilestone, setLastCelebratedMilestone } from '@/features/milestones/milestone-store';
import { currentLocale } from '@/i18n/formats';
import { visitsPath } from '@/lib/analytics-range';
import { api } from '@/lib/api';
import { defaultPictureUrl } from '@/lib/product-image';
import type { Analytics, Catalogue, DiningTable, Product, TableAccount } from '@/types/models';

/** Con cuántos productos un menú deja de verse a medias. */
const ENOUGH_PRODUCTS = 5;

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const theme = useEniuTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
      <Text accessibilityRole="header" style={{ color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Fila de "Cambio rápido": la disponibilidad se cambia con un toque. */
function QuickProductRow({ product, currency, businessId, catalogueId, divider }: { product: Product; currency: Intl.NumberFormat; businessId: string; catalogueId: string; divider: boolean }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const { toggleAvailable } = useProductQuickActions(businessId, catalogueId);
  const uri = defaultPictureUrl(product);
  return (
    <View style={{ minHeight: 64, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: divider ? 1 : 0, borderTopColor: theme.border }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.surfaceAlt }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><ImageIcon color={theme.muted} size={17} /></View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2, opacity: product.is_available ? 1 : 0.55 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{product.name}</Text>
        <Text style={{ color: product.is_available ? theme.muted : theme.danger, fontSize: 13, fontWeight: '600' }}>
          {product.price == null ? t("Sin precio") : currency.format(Number(product.price))} · {product.is_available ? t("Disponible") : t("Agotado")}
        </Text>
      </View>
      <EniuSwitch value={product.is_available} onValueChange={() => toggleAvailable(product)} accessibilityLabel={t("{{name}} disponible", { name: product.name })} />
    </View>
  );
}

/** Anillo de progreso "2/4". */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const theme = useEniuTheme();
  const size = 56, stroke = 6, radius = (size - stroke) / 2, length = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.yellow} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(done / total) * length} ${length}`} />
      </Svg>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{done}/{total}</Text>
    </View>
  );
}

/** Bloque "N pedidos por aceptar" con el primero listo para aceptar. */
function PendingCard({ accounts, onAccept }: { accounts: TableAccount[]; onAccept: (orderId: string) => Promise<void> }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const [busy, setBusy] = useState(false);
  const pending = accounts.flatMap((account) => account.orders.filter((order) => order.status === 'pending').map((order) => ({ order, account })))
    .sort((a, b) => a.order.created_at.localeCompare(b.order.created_at));
  if (!pending.length) {
    return (
      <View style={{ ...cardStyle(theme, 22), padding: 18, gap: 4 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{t("Todo al día.")}</Text>
        {/* TODO(diseño): el diseño dice "Te avisamos con un sonido"; la app vibra. */}
        <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>{t("Te avisamos cuando llegue otro pedido.")}</Text>
      </View>
    );
  }
  const { order, account } = pending[0];
  const summary = order.items.filter((item) => !item.is_cancelled).map((item) => `${item.quantity}× ${item.name}`).join(', ');
  async function accept() {
    setBusy(true);
    try { await onAccept(order.id); } finally { setBusy(false); }
  }
  return (
    <View style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: theme.yellow, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.onYellow, fontSize: 20, fontWeight: '900' }}>{pending.length === 1 ? t("1 pedido por aceptar") : t("{{count}} pedidos por aceptar", { count: pending.length })}</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push('/(tabs)/(orders)')} hitSlop={12}>
          <Text style={{ color: theme.onYellow, fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' }}>{t("Ver todos")}</Text>
        </Pressable>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.55)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MesaBadge number={account.table.number} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: theme.onYellow, fontSize: 16, fontWeight: '800' }}>{order.diner_name}</Text>
          <Text numberOfLines={2} style={{ color: 'rgba(17,17,17,0.7)', fontSize: 13 }}>{summary}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Aceptar el pedido de {{name}}", { name: order.diner_name })} disabled={busy} onPress={accept} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#111111', justifyContent: 'center', opacity: busy ? 0.6 : pressed ? 0.85 : 1 })}>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{t("Aceptar")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** "Mesas ahora": por aceptar en amarillo, con cuenta abierta en negro, libres en crema. */
function TablesNow({ tables, accounts }: { tables: DiningTable[]; accounts: TableAccount[] }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  // "Cuenta abierta" es negro en claro; en oscuro se invierte a crema, o se
  // perdería contra la tarjeta.
  const isDark = useColorScheme() === 'dark';
  const openBg = isDark ? theme.text : '#111111';
  const openText = isDark ? theme.background : '#FBF7EC';
  const byTable = new Map(accounts.map((account) => [account.table.id, account]));
  const legend = [
    { color: theme.yellow, label: t("Por aceptar") },
    { color: openBg, label: t("Cuenta abierta") },
    { color: theme.surfaceAlt, label: t("Libre") },
  ];
  return (
    <View style={{ gap: 10 }}>
      <SectionTitle title={t("Mesas ahora")} />
      <View style={{ ...cardStyle(theme, 20), padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {tables.filter((table) => table.is_active).map((table) => {
            const account = byTable.get(table.id);
            const state = account?.pending_orders ? 'pending' : account ? 'open' : 'free';
            const background = state === 'pending' ? theme.yellow : state === 'open' ? openBg : theme.surfaceAlt;
            const color = state === 'pending' ? theme.onYellow : state === 'open' ? openText : theme.text;
            const label = state === 'pending' ? t("por aceptar") : state === 'open' ? t("cuenta abierta") : t("libre");
            return (
              <View key={table.id} accessible accessibilityLabel={`${t("Mesa {{number}}", { number: table.number })}, ${label}`} style={{ width: '14.5%', aspectRatio: 1, minWidth: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: background }}>
                <Text style={{ color, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{table.number}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {legend.map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: item.color, borderWidth: 1, borderColor: theme.border }} />
              <Text style={{ color: theme.muted, fontSize: 13 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { analyticsScope } = usePlan();
  const { selectedBusiness, isLoading: loadingBusinesses } = useBusiness();
  const orders = useOrders();
  const tablesQuery = useQuery({ queryKey: ['tables', selectedBusiness?.id] as const, queryFn: () => api.get<{ tables: DiningTable[] }>(`businesses/${selectedBusiness?.id}/tables`), enabled: Boolean(selectedBusiness) && orders.available });
  // "Con pedidos": el negocio los tiene activos o tiene mesas atendiéndose.
  const withOrders = orders.available && orders.loaded && (Boolean(orders.ordering?.enabled) || orders.accounts.length > 0);
  const catalogues = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const selectedCatalogue: Catalogue | undefined = catalogues.data?.catalogues[0];
  // El gratuito lee el resumen de 7 días; el de pago, el informe de 30.
  const isSummary = analyticsScope !== 'full';
  const visitsScope = isSummary ? 'summary' : 'full';
  const analytics = useQuery({ queryKey: ['analytics', visitsScope, selectedBusiness?.id, selectedCatalogue?.id, 30, selectedBusiness?.timezone], queryFn: () => api.get<Analytics>(visitsPath(visitsScope, selectedBusiness!.id, selectedCatalogue!.id, 30, selectedBusiness!.timezone)), enabled: Boolean(selectedBusiness && selectedCatalogue) && analyticsScope !== 'none' });
  const products = useQuery({ queryKey: ['products', selectedBusiness?.id, selectedCatalogue?.id] as const, queryFn: () => api.get<{ products: Product[] }>(`businesses/${selectedBusiness?.id}/catalogues/${selectedCatalogue?.id}/products`), enabled: Boolean(selectedBusiness && selectedCatalogue) });
  const publication = useQuery({ queryKey: ['publication', selectedBusiness?.id, selectedCatalogue?.id] as const, queryFn: () => api.get<{ publication: { is_published: boolean; public_url?: string | null } }>(`businesses/${selectedBusiness?.id}/catalogues/${selectedCatalogue?.id}/publication`), enabled: Boolean(selectedBusiness && selectedCatalogue) });

  const series = (analytics.data?.visits_over_time ?? []).map((point) => Number(point.views || 0));
  const viewsToday = series.length ? series[series.length - 1] : 0;
  const viewsYesterday = series.length > 1 ? series[series.length - 2] : 0;
  const delta = viewsYesterday > 0 ? Math.round(((viewsToday - viewsYesterday) / viewsYesterday) * 100) : null;
  const weekViews = series.slice(-7).reduce((total, value) => total + value, 0);
  const periodViews = series.reduce((total, value) => total + value, 0);
  const qrViews = analytics.data?.sources?.find((source) => source.key === 'qr')?.views ?? 0;
  const productList = products.data?.products ?? [];
  const currency = new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });
  const publicUrl = publication.data?.publication.is_published ? publication.data.publication.public_url : null;
  const number = (value: number) => value.toLocaleString(currentLocale());

  // "Siguiente paso": cuatro hitos que se calculan con lo que la app ya sabe.
  const steps = [
    { done: Boolean(publicUrl), label: t("Publica tu menú"), action: t("Publicar"), go: goToPublication },
    { done: productList.length >= ENOUGH_PRODUCTS, label: t("Agrega al menos {{count}} productos", { count: ENOUGH_PRODUCTS }), action: t("Agregar"), go: goToProducts },
    { done: productList.some((product) => Boolean(defaultPictureUrl(product))), label: t("Ponle foto a un producto"), action: t("Agregar foto"), go: goToProducts },
    { done: periodViews > 0, label: t("Recibe tus primeras visitas"), action: t("Compartir"), go: share },
  ];
  const doneSteps = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done);

  const [milestone, setMilestone] = useState<number | null>(null);
  useEffect(() => {
    if (!selectedCatalogue || analytics.isLoading) return;
    let active = true;
    (async () => {
      const enabled = await getMilestoneNotificationsEnabled();
      if (!enabled) return;
      const last = await getLastCelebratedMilestone(selectedCatalogue.id);
      const reached = nextUncelebratedMilestone(periodViews, last);
      if (reached && active) setMilestone(reached);
    })();
    return () => { active = false; };
  }, [selectedCatalogue, periodViews, analytics.isLoading]);

  async function dismissMilestone() {
    if (selectedCatalogue && milestone) await setLastCelebratedMilestone(selectedCatalogue.id, milestone);
    setMilestone(null);
  }

  function goToPublication() {
    if (selectedCatalogue) router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/publication', params: { catalogueId: selectedCatalogue.id } });
    else router.push('/(tabs)/(menus)');
  }
  function goToProducts() {
    if (selectedCatalogue) router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/products', params: { catalogueId: selectedCatalogue.id } });
  }
  function share() {
    if (publicUrl && selectedCatalogue) Share.share({ title: selectedCatalogue.name, message: publicUrl, url: publicUrl });
    else goToPublication();
  }

  const safeTop = Math.max(insets.top, 12);
  if (loadingBusinesses || !selectedBusiness || catalogues.isLoading || catalogues.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, paddingHorizontal: 20, paddingTop: safeTop + 16, gap: 16 }}>
        {loadingBusinesses ? <LoadingState label={t("Cargando tus negocios…")} />
          : !selectedBusiness ? (
            <>
              <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 }}>{t("Hola,")} {user?.name || user?.username}</Text>
              <View style={{ alignItems: 'center', gap: 16, paddingVertical: 24 }}>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>{t("Crea tu primer negocio")}</Text>
                <Text style={{ color: theme.muted, textAlign: 'center', lineHeight: 21 }}>{t("Necesitas un negocio para comenzar a crear menús.")}</Text>
                <CreateBusinessCard />
              </View>
            </>
          ) : catalogues.isLoading ? <LoadingState label={t("Preparando resumen…")} />
          : <ErrorState message={t("No pudimos cargar el resumen de tu negocio.")} error={catalogues.error} onRetry={() => catalogues.refetch()} />}
      </View>
    );
  }

  return (
    <>
      <HeroSheet
        heroMinHeight={208}
        hero={withOrders ? (
          <View style={{ gap: 22 }}>
            <BusinessSwitcher variant="dark" />
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                {/* TODO(diseño): el diseño pide "Pedidos hoy", pero el backend sólo
                    entrega las cuentas abiertas; se muestran los pedidos en curso. */}
                <Text style={{ color: theme.heroMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t("Pedidos en curso")}</Text>
                <Text style={{ color: theme.heroText, fontSize: 44, lineHeight: 48, fontWeight: '900', letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}>{orders.accounts.reduce((sum, account) => sum + account.orders.filter((order) => order.status !== 'cancelled').length, 0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.heroMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t("Cuentas abiertas")}</Text>
                <Text style={{ color: theme.heroText, fontSize: 44, lineHeight: 48, fontWeight: '900', letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}>{orders.accounts.length}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ gap: 22 }}>
            <BusinessSwitcher variant="dark" />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
              <View>
                <Text style={{ color: theme.heroMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t("Vistas hoy")}</Text>
                <Text accessibilityLabel={t("{{count}} vistas hoy", { count: viewsToday })} style={{ color: theme.heroText, fontSize: 64, lineHeight: 68, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{number(viewsToday)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6, paddingBottom: 10 }}>
                {delta !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, minHeight: 24, borderRadius: 99, backgroundColor: 'rgba(255,224,90,0.16)' }}>
                    {delta >= 0 ? <TrendUpIcon color={theme.yellow} size={10} /> : <TrendDownIcon color={theme.yellow} size={10} />}
                    <Text style={{ color: theme.yellow, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{delta >= 0 ? '+' : ''}{delta}% {t("vs. ayer")}</Text>
                  </View>
                ) : null}
                <Text style={{ color: theme.heroMuted, fontSize: 13, fontWeight: '600' }}>{t("Últimos 7 días")}</Text>
                <Text style={{ color: theme.heroText, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{number(weekViews)}</Text>
              </View>
            </View>
            {periodViews === 0 && !analytics.isLoading ? (
              <Text style={{ color: theme.heroMuted, fontSize: 14, lineHeight: 20, marginTop: -10 }}>{t("Aún sin visitas. Comparte tu QR para recibir las primeras.")}</Text>
            ) : null}
          </View>
        )}
      >
        {withOrders ? (
          <>
            <PendingCard accounts={orders.accounts} onAccept={(orderId) => orders.setStatus(orderId, 'received')} />
            {tablesQuery.data?.tables.length ? <TablesNow tables={tablesQuery.data.tables} accounts={orders.accounts} /> : null}
            {selectedCatalogue ? (
              <Pressable accessibilityRole="button" onPress={goToPublication} style={({ pressed }) => ({ ...cardStyle(theme, 20), padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.8 : 1 })}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' }}>
                  {publicUrl ? <QRCode value={`${publicUrl}?src=qr`} size={36} color="#FFE05A" backgroundColor="#111111" /> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{t("Menú {{name}}", { name: selectedCatalogue.name })} · {publicUrl ? t("en vivo") : t("sin publicar")}</Text>
                  <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13 }}>{publicUrl ? publicUrl.replace(/^https?:\/\//, '') : t("Ver el QR y el enlace")}</Text>
                </View>
                <ChevronRightIcon color={theme.muted} size={12} />
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
        {selectedCatalogue ? (
          <View style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: theme.yellow, padding: 18, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={{ color: 'rgba(17,17,17,0.66)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t("Tu menú en vivo")}</Text>
                <Text numberOfLines={1} style={{ color: theme.onYellow, fontSize: 22, fontWeight: '900' }}>{selectedCatalogue.name}</Text>
                <Text numberOfLines={1} style={{ color: 'rgba(17,17,17,0.7)', fontSize: 13, fontWeight: '600' }}>{publicUrl ? publicUrl.replace(/^https?:\/\//, '') : t("Sin publicar todavía")}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Ver el QR y el enlace")} onPress={goToPublication} style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: '#111111', padding: 7, alignItems: 'center', justifyContent: 'center' }}>
                {publicUrl ? <QRCode value={`${publicUrl}?src=qr`} size={50} color="#FFE05A" backgroundColor="#111111" /> : <Text style={{ color: theme.heroMuted, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{t("Borrador")}</Text>}
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable accessibilityRole="button" onPress={share} style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: 14, borderCurve: 'continuous', backgroundColor: '#111111', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
                <ShareIcon color={theme.yellow} size={16} />
                <Text style={{ color: theme.yellow, fontWeight: '800', fontSize: 15 }}>{publicUrl ? t("Compartir menú") : t("Publicar menú")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Ver como cliente")} onPress={goToPublication} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 14, borderCurve: 'continuous', backgroundColor: 'rgba(17,17,17,0.1)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                <EyeIcon color="#111111" size={19} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/(menus)')} style={({ pressed }) => ({ ...cardStyle(theme), padding: 20, alignItems: 'center', gap: 8, opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{t("Crea tu primer menú")}</Text>
            <Text style={{ color: theme.muted, fontSize: 14, textAlign: 'center' }}>{t("Necesitas un menú para empezar a compartirlo con tus clientes.")}</Text>
          </Pressable>
        )}

        {selectedCatalogue && nextStep && !products.isLoading ? (
          <View style={{ gap: 10 }}>
            <SectionTitle title={t("Siguiente paso")} />
            <Pressable accessibilityRole="button" accessibilityLabel={`${nextStep.label}. ${t("{{done}} de {{total}} pasos", { done: doneSteps, total: steps.length })}`} onPress={nextStep.go} style={({ pressed }) => ({ ...cardStyle(theme, 20), padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.8 : 1 })}>
              <ProgressRing done={doneSteps} total={steps.length} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{nextStep.label}</Text>
                <Text style={{ color: theme.muted, fontSize: 13 }}>{t("{{done}} de {{total}} pasos para dejar tu menú listo", { done: doneSteps, total: steps.length })}</Text>
              </View>
              <ChevronRightIcon color={theme.muted} size={12} />
            </Pressable>
          </View>
        ) : null}

        {selectedCatalogue && productList.length ? (
          <View style={{ gap: 10 }}>
            <SectionTitle title={t("Cambio rápido")} action={productList.length > 3 ? t("Ver los {{count}}", { count: productList.length }) : undefined} onAction={goToProducts} />
            <View style={{ ...cardStyle(theme, 20), overflow: 'hidden' }}>
              {productList.slice(0, 3).map((product, index) => (
                <QuickProductRow key={product.id} product={product} currency={currency} businessId={selectedBusiness.id} catalogueId={selectedCatalogue.id} divider={index > 0} />
              ))}
            </View>
          </View>
        ) : null}
          </>
        )}
      </HeroSheet>
      {selectedCatalogue && milestone ? (
        <MilestoneSheet
          visible
          milestone={milestone}
          catalogueName={selectedCatalogue.name}
          isPublished={selectedCatalogue.is_published}
          // El resumen del gratuito no dice de dónde llegan las visitas.
          hasScans={isSummary ? null : qrViews > 0}
          onDismiss={dismissMilestone}
        />
      ) : null}
    </>
  );
}
