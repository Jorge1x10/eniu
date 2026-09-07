import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Divider } from '@/components/ui/divider';
import { ChevronLeftIcon, ChevronRightIcon, GridIcon, LinkIcon, PaletteIcon, StarIcon, TagIcon, TrashIcon } from '@/components/ui/icons';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { HeroHeader } from '@/components/hero-header';
import { HeroScreen } from '@/components/hero-screen';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, deleteCatalogue, getCatalogue } from '@/features/catalogues/catalogue-api';
import { ApiError, api } from '@/lib/api';
import type { Analytics, Catalogue, Category, Product } from '@/types/models';
import { useTranslation } from 'react-i18next';

function monthRange() {
  const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  return `from=${format(from)}&to=${format(to)}&timezone=America%2FMexico_City`;
}

// Mismas tarjetas que el panel web: bloque de identidad arriba y la acción bajo
// una línea divisoria, a todo el ancho de la pantalla.
const actions = [
  { route: 'products', title: 'Productos', description: 'Crea productos con o sin categoría.', action: 'Administrar productos', Icon: TagIcon, unit: ['producto', 'productos'] },
  { route: 'categories', title: 'Categorías', description: 'Organiza los productos de este menú.', action: 'Administrar categorías', Icon: GridIcon, unit: ['categoría', 'categorías'] },
  { route: 'template', title: 'Diseño y plantilla', description: 'Elige el diseño y personaliza la identidad del menú.', action: 'Personalizar plantilla', Icon: PaletteIcon },
  { route: 'promotions', title: 'Promociones', description: 'Resalta productos en días específicos.', action: 'Administrar promociones', Icon: StarIcon },
  { route: 'publication', title: 'Publicar y compartir', description: 'Publica y comparte este menú con tus clientes.', action: 'Administrar publicación', Icon: LinkIcon },
] as const;

export default function CatalogueDetailScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const query = useQuery({ queryKey: catalogueKeys.detail(selectedBusiness?.id, catalogueId), queryFn: () => getCatalogue(selectedBusiness!.id, catalogueId), enabled: Boolean(selectedBusiness && catalogueId) });
  const catalogue = query.data?.catalogue;
  const base = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}`;
  const products = useQuery({ queryKey: ['products', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ products: Product[] }>(`${base}/products`), enabled: Boolean(selectedBusiness && catalogueId) });
  const categories = useQuery({ queryKey: ['categories', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ categories: Category[] }>(`${base}/categories`), enabled: Boolean(selectedBusiness && catalogueId) });
  const counts: Record<string, number | undefined> = { products: products.data?.products.length, categories: categories.data?.categories.length };
  const analytics = useQuery({ queryKey: ['analytics', selectedBusiness?.id, catalogueId, 30], queryFn: () => api.get<Analytics>(`${base}/analytics?${monthRange()}`), enabled: Boolean(selectedBusiness && catalogueId) });
  const [deleting, setDeleting] = useState(false);
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 12);

  const productCount = counts.products ?? 0;
  const categoryCount = counts.categories ?? 0;
  const monthlyViews = (analytics.data?.visits_over_time ?? []).reduce((total, point) => total + Number(point.views || 0), 0);
  const metaLine = [
    productCount === 1 ? t("1 producto") : t("{{count}} productos", { count: productCount }),
    categoryCount === 1 ? t("1 categoría") : t("{{count}} categorías", { count: categoryCount }),
    t("{{count}} vistas en 30 días", { count: monthlyViews }),
  ].join(' · ');

  // Esta pantalla queda montada en el stack de Menús. Si el usuario cambia de
  // negocio desde otra pestaña, el menú abierto ya no pertenece al negocio
  // activo y la API responde 404; regresar a la lista evita ese callejón.
  const lastBusinessId = useRef(selectedBusiness?.id);
  useEffect(() => {
    const current = selectedBusiness?.id;
    if (lastBusinessId.current && current && lastBusinessId.current !== current) router.replace('/(tabs)/(menus)');
    lastBusinessId.current = current;
  }, [selectedBusiness?.id]);

  const notFound = query.isError && query.error instanceof ApiError && query.error.status === 404;

  async function togglePublication() {
    if (!selectedBusiness || !catalogue) return;
    const path = `businesses/${selectedBusiness.id}/catalogues/${catalogue.id}/${catalogue.is_published ? 'unpublish' : 'publish'}`;
    const data = await api.post<{ catalogue: Catalogue }>(path);
    queryClient.setQueryData(catalogueKeys.detail(selectedBusiness.id, catalogue.id), data);
    queryClient.invalidateQueries({ queryKey: catalogueKeys.all(selectedBusiness.id) });
  }

  // El borrado va por pulsación larga y confirmación: se lleva por delante
  // los productos y las categorías del menú, y no hay vuelta atrás.
  function confirmDelete() {
    if (!selectedBusiness || !catalogue || deleting) return;
    Alert.alert(
      t("Eliminar «{{name}}»", { name: catalogue.name }),
      t("También se eliminan sus productos y categorías. Esta acción no se puede deshacer."),
      [
        { text: t("Cancelar"), style: 'cancel' },
        { text: t("Eliminar"), style: 'destructive', onPress: remove },
      ],
    );
  }

  async function remove() {
    if (!selectedBusiness || !catalogue) return;
    setDeleting(true);
    try {
      await deleteCatalogue(selectedBusiness.id, catalogue.id);
      queryClient.removeQueries({ queryKey: catalogueKeys.detail(selectedBusiness.id, catalogue.id) });
      queryClient.invalidateQueries({ queryKey: catalogueKeys.all(selectedBusiness.id) });
      router.replace('/(tabs)/(menus)');
    } catch (requestError) {
      setDeleting(false);
      Alert.alert(t("No se pudo eliminar"), requestError instanceof Error ? requestError.message : t("Inténtalo de nuevo."));
    }
  }

  return (
    <HeroScreen contentContainerStyle={{ paddingBottom: 120 }}>
      {query.isLoading ? <View style={{ padding: 18, paddingTop: safeTop + 12 }}><LoadingState /></View> : notFound ? <View style={{ padding: 18, paddingTop: safeTop + 12 }}><ErrorState message={t("Este menú ya no existe o pertenece a otro negocio.")} action={t("Volver a Menús")} onAction={() => router.replace('/(tabs)/(menus)')} /></View> : query.isError || !catalogue ? <View style={{ padding: 18, paddingTop: safeTop + 12 }}><ErrorState message={t("No pudimos cargar este menú.")} error={query.error} onRetry={() => query.refetch()} /></View> : <>
        {/* Cabecera a sangre: ocupa todo el ancho y sube hasta el borde, con las
            esquinas redondeadas sólo abajo. El contenido arranca bajo el notch. */}
        <HeroHeader paddingHorizontal={20} paddingBottom={24} gap={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Volver a Menús")}
              onPress={() => router.back()}
              style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 12, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
            >
              <ChevronLeftIcon color="#FFFDF5" size={12} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Text style={{ color: '#C7C1B4', fontSize: 11.5, fontWeight: '700' }}>{t("Visible")}</Text>
              <Switch value={catalogue.is_published} onValueChange={togglePublication} trackColor={{ true: theme.yellow }} />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <View style={{ minHeight: 24, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 999, backgroundColor: catalogue.is_published ? theme.yellow : 'rgba(255,255,255,0.12)', paddingHorizontal: 10 }}><Text style={{ color: catalogue.is_published ? theme.onYellow : '#C7C1B4', fontSize: 9.5, fontWeight: '800', letterSpacing: 1 }}>{catalogue.is_published ? 'PUBLICADO' : 'BORRADOR'}</Text></View>
            <Text selectable style={{ color: '#FFFDF5', fontSize: 30, lineHeight: 33, fontWeight: '900' }}>{catalogue.name}</Text>
            <Text style={{ color: theme.heroMuted, fontSize: 12.5, lineHeight: 19 }}>{metaLine}</Text>
          </View>
        </HeroHeader>

        <View style={{ paddingHorizontal: 18, paddingTop: 20, gap: 16 }}>
        <View style={{ gap: 12 }}>{actions.map((action, index) => {
          const count = counts[action.route];
          const unit = 'unit' in action ? action.unit : null;
          const published = action.route === 'publication' ? catalogue.is_published : null;
          const status = unit
            ? { label: count == null ? '—' : `${count} ${count === 1 ? unit[0] : unit[1]}`, on: Boolean(count) }
            : published == null ? null : { label: published ? 'Publicado' : t("Sin publicar"), on: published };
          return (
            <Animated.View key={action.route} entering={FadeInDown.duration(300).delay(index * 70)}>
            <Link href={{ pathname: `/(tabs)/(menus)/[catalogueId]/${action.route}`, params: { catalogueId } }} asChild>
              <Pressable style={({ pressed }) => ({ ...cardStyle(theme), overflow: 'hidden', opacity: pressed ? 0.72 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, borderCurve: 'continuous', backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><action.Icon color={theme.onYellow} size={22} /></View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>{action.title}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 18 }}>{action.description}</Text>
                  </View>
                </View>
                <Divider />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ color: theme.yellowPressed, fontSize: 13, fontWeight: '800' }}>{action.action}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {status ? <>
                      <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: status.on ? theme.success : theme.muted }} />
                      <Text style={{ color: status.on ? theme.success : theme.muted, fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{status.label}</Text>
                    </> : null}
                    <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' }}><ChevronRightIcon color="#111111" size={12} /></View>
                  </View>
                </View>
              </Pressable>
            </Link>
            </Animated.View>
          );
        })}</View>

        <View style={{ gap: 8, marginTop: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Eliminar el menú {{name}}", { name: catalogue.name })}
            accessibilityHint="Mantén pulsado para eliminar este menú"
            onLongPress={confirmDelete}
            delayLongPress={600}
            disabled={deleting}
            style={({ pressed }) => ({ ...cardStyle(theme, 16), minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: deleting ? 0.6 : pressed ? 0.75 : 1 })}
          >
            {deleting ? <ActivityIndicator color={theme.danger} /> : <TrashIcon color={theme.danger} size={15} />}
            <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '800' }}>{deleting ? 'Eliminando…' : t("Eliminar menú")}</Text>
          </Pressable>
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16, textAlign: 'center' }}>
            {t("Mantén pulsado para eliminarlo. Se borran también sus productos y categorías.")}
          </Text>
        </View>
        </View>
      </>}
    </HeroScreen>
  );
}
