import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroSheet } from '@/components/hero-sheet';
import { EniuSwitch } from '@/components/ui/eniu-switch';
import { GroupedList, ListRow } from '@/components/ui/grouped-list';
import { ChevronLeftIcon, EyeIcon, GridIcon, LinkIcon, PaletteIcon, StarIcon, TagIcon } from '@/components/ui/icons';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, deleteCatalogue, getCatalogue } from '@/features/catalogues/catalogue-api';
import { visitsPath } from '@/lib/analytics-range';
import { ApiError, api } from '@/lib/api';
import type { Analytics, Catalogue, Category, Product } from '@/types/models';
import { useTranslation } from 'react-i18next';

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
  const counts = { products: products.data?.products.length, categories: categories.data?.categories.length };
  const publication = useQuery({ queryKey: ['publication', selectedBusiness?.id, catalogueId] as const, queryFn: () => api.get<{ publication: { is_published: boolean; public_url?: string | null } }>(`${base}/publication`), enabled: Boolean(selectedBusiness && catalogueId) });
  const publicUrl = publication.data?.publication.is_published ? publication.data.publication.public_url : null;
  // El gratuito sólo tiene el resumen de 7 días: pedirle el informe de 30
  // devolvía 403 y la línea decía "0 vistas" aunque el menú sí tuviera visitas.
  const { analyticsScope } = usePlan();
  const visitsScope = analyticsScope === 'full' ? 'full' : 'summary';
  const analytics = useQuery({ queryKey: ['analytics', visitsScope, selectedBusiness?.id, catalogueId, 30, selectedBusiness?.timezone], queryFn: () => api.get<Analytics>(visitsPath(visitsScope, selectedBusiness!.id, catalogueId, 30, selectedBusiness!.timezone)), enabled: Boolean(selectedBusiness && catalogueId) && analyticsScope !== 'none' });
  const [deleting, setDeleting] = useState(false);
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 12);

  const productCount = counts.products ?? 0;
  const categoryCount = counts.categories ?? 0;
  const weekViews = (analytics.data?.visits_over_time ?? []).slice(-7).reduce((total, point) => total + Number(point.views || 0), 0);
  const metaLine = [
    productCount === 1 ? t("1 producto") : t("{{count}} productos", { count: productCount }),
    categoryCount === 1 ? t("1 categoría") : t("{{count}} categorías", { count: categoryCount }),
    analyticsScope === 'none' ? null
      : weekViews === 1 ? t("1 vista esta semana") : t("{{count}} vistas esta semana", { count: weekViews }),
  ].filter(Boolean).join(' · ');

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
    queryClient.invalidateQueries({ queryKey: ['publication', selectedBusiness.id, catalogue.id] });
  }

  // Se confirma antes de borrar: se lleva por delante los productos y las
  // categorías del menú, y no hay vuelta atrás.
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

  function open(route: 'products' | 'categories' | 'template' | 'promotions' | 'publication') {
    router.push({ pathname: `/(tabs)/(menus)/[catalogueId]/${route}`, params: { catalogueId } });
  }

  const pill = ({ pressed }: { pressed: boolean }) => ({
    minHeight: 40, minWidth: 40, paddingHorizontal: 12, borderRadius: 99, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 7, backgroundColor: theme.heroCard, opacity: pressed ? 0.7 : 1,
  });

  if (query.isLoading || notFound || query.isError || !catalogue) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: 20, paddingTop: safeTop + 12 }}>
        {query.isLoading ? <LoadingState />
          : notFound ? <ErrorState message={t("Este menú ya no existe o pertenece a otro negocio.")} action={t("Volver a Menús")} onAction={() => router.replace('/(tabs)/(menus)')} />
          : <ErrorState message={t("No pudimos cargar este menú.")} error={query.error} onRetry={() => query.refetch()} />}
      </View>
    );
  }

  const published = catalogue.is_published;
  return (
    <HeroSheet
      heroMinHeight={250}
      hero={(
        <View style={{ gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Volver a Menús")} onPress={() => router.back()} style={pill}>
              <ChevronLeftIcon color={theme.heroText} size={12} />
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ disabled: !publicUrl }}
              disabled={!publicUrl}
              onPress={() => { if (publicUrl) Linking.openURL(publicUrl); }}
              style={(state) => ({ ...pill(state), opacity: !publicUrl ? 0.45 : state.pressed ? 0.7 : 1 })}
            >
              <EyeIcon color={theme.heroText} size={16} />
              <Text style={{ color: theme.heroText, fontSize: 14, fontWeight: '700' }}>{t("Ver como cliente")}</Text>
            </Pressable>
          </View>
          <View style={{ gap: 6 }}>
            <Text selectable accessibilityRole="header" style={{ color: theme.heroText, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1 }}>{catalogue.name}</Text>
            <Text style={{ color: theme.heroMuted, fontSize: 14, lineHeight: 20 }}>{metaLine}</Text>
          </View>
          <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.heroCard, borderWidth: 1, borderColor: 'rgba(251,247,236,0.1)', paddingLeft: 14, paddingRight: 4, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: published ? '#3DBF6B' : theme.heroMuted }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: theme.heroText, fontSize: 15, fontWeight: '800' }}>{published ? t("Publicado") : t("Oculto")}</Text>
              <Text style={{ color: theme.heroMuted, fontSize: 13 }}>{published ? t("Tus clientes lo ven al escanear el QR") : t("Nadie lo ve hasta que lo actives")}</Text>
            </View>
            <EniuSwitch value={published} onValueChange={togglePublication} accessibilityLabel={t("Menú publicado")} />
          </View>
        </View>
      )}
    >
      <GroupedList>
        <ListRow icon={<TagIcon color={theme.onYellow} size={18} />} title={t("Productos")} value={counts.products === undefined ? '—' : String(counts.products)} onPress={() => open('products')} />
        <ListRow icon={<GridIcon color={theme.onYellow} size={18} />} title={t("Categorías")} value={counts.categories === undefined ? '—' : String(counts.categories)} onPress={() => open('categories')} />
        <ListRow icon={<PaletteIcon color={theme.onYellow} size={18} />} title={t("Diseño y plantilla")} onPress={() => open('template')} />
        <ListRow icon={<StarIcon color={theme.onYellow} size={17} />} title={t("Promociones")} onPress={() => open('promotions')} />
        <ListRow icon={<LinkIcon color={theme.onYellow} size={18} />} title={t("QR y enlace")} onPress={() => open('publication')} />
      </GroupedList>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Eliminar el menú {{name}}", { name: catalogue.name })}
        onPress={confirmDelete}
        disabled={deleting}
        style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, opacity: deleting ? 0.6 : pressed ? 0.6 : 1 })}
      >
        {deleting ? <ActivityIndicator color={theme.danger} /> : null}
        <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '700' }}>{deleting ? t("Eliminando…") : t("Eliminar menú")}</Text>
      </Pressable>
    </HeroSheet>
  );
}
