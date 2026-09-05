import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MenuSkeleton } from '@/components/menu-skeleton';
import { Divider } from '@/components/ui/divider';
import { ChevronRightIcon, GridIcon, LinkIcon, PaletteIcon, StarIcon, TagIcon, TrashIcon } from '@/components/ui/icons';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, deleteCatalogue, getCatalogue } from '@/features/catalogues/catalogue-api';
import { ApiError, api } from '@/lib/api';
import type { Catalogue, Category, Product } from '@/types/models';
import { useTranslation } from 'react-i18next';

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
  const [deleting, setDeleting] = useState(false);

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
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 16, backgroundColor: theme.background }}>
      {query.isLoading ? <LoadingState /> : notFound ? <ErrorState message={t("Este menú ya no existe o pertenece a otro negocio.")} action={t("Volver a Menús")} onAction={() => router.replace('/(tabs)/(menus)')} /> : query.isError || !catalogue ? <ErrorState message={t("No pudimos cargar este menú.")} error={query.error} onRetry={() => query.refetch()} /> : <>
        <View style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#111111', padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ minHeight: 26, justifyContent: 'center', borderRadius: 999, backgroundColor: catalogue.is_published ? theme.yellow : 'rgba(255,255,255,0.12)', paddingHorizontal: 10 }}><Text style={{ color: catalogue.is_published ? '#111111' : '#C7C7C7', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{catalogue.is_published ? 'PUBLICADO' : 'BORRADOR'}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: '#C7C7C7', fontSize: 12, fontWeight: '600' }}>{t("Visible")}</Text><Switch value={catalogue.is_published} onValueChange={togglePublication} trackColor={{ true: theme.yellow }} /></View>
          </View>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: '#FFFDF5', fontSize: 26, fontWeight: '800' }}>{catalogue.name}</Text>
            <Text style={{ color: '#C7C7C7', fontSize: 13, lineHeight: 20 }}>{catalogue.description || t("Sin descripción")}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'stretch' }}>
            <MenuSkeleton width={86} padding={9} />
            <View style={{ flex: 1, minWidth: 0, gap: 10, justifyContent: 'flex-end' }}>
              {catalogue.public_slug ? <Text numberOfLines={1} style={{ color: '#C7C7C7', fontSize: 12 }}>eniu.mx/m/{catalogue.public_slug}</Text> : null}
              <Link href={{ pathname: '/(tabs)/(menus)/[catalogueId]/publication', params: { catalogueId } }} asChild>
                <Pressable style={({ pressed }) => ({ height: 42, borderRadius: 13, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}><Text style={{ color: '#111111', fontWeight: '700', fontSize: 13.5 }}>{t("Ver como cliente")}</Text></Pressable>
              </Link>
            </View>
          </View>
        </View>

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
              <Pressable style={({ pressed }) => ({ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous', overflow: 'hidden', opacity: pressed ? 0.72 : 1 })}>
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
            style={({ pressed }) => ({ minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, opacity: deleting ? 0.6 : pressed ? 0.75 : 1 })}
          >
            {deleting ? <ActivityIndicator color={theme.danger} /> : <TrashIcon color={theme.danger} size={15} />}
            <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '800' }}>{deleting ? 'Eliminando…' : t("Eliminar menú")}</Text>
          </Pressable>
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16, textAlign: 'center' }}>
            {t("Mantén pulsado para eliminarlo. Se borran también sus productos y categorías.")}
          </Text>
        </View>
      </>}
    </ScrollView>
  );
}
