import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MenuSkeleton } from '@/components/menu-skeleton';
import { ChevronRightIcon, GridIcon, LinkIcon, PaletteIcon, TagIcon } from '@/components/ui/icons';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, getCatalogue } from '@/features/catalogues/catalogue-api';
import { ApiError, api } from '@/lib/api';
import type { Catalogue, Category, Product } from '@/types/models';

// Cada acción se identifica por su icono; el conteo va en la tercera línea,
// donde un producto muestra su disponibilidad, para que las dos listas del menú
// se lean igual.
const actions = [
  { route: 'products', title: 'Productos', description: 'Precios, disponibilidad e imágenes', Icon: TagIcon, unit: ['producto', 'productos'] },
  { route: 'categories', title: 'Categorías', description: 'Organiza el contenido del menú', Icon: GridIcon, unit: ['categoría', 'categorías'] },
  { route: 'template', title: 'Diseño y plantilla', description: 'Estilo, colores y visibilidad', Icon: PaletteIcon },
  { route: 'publication', title: 'Publicar y compartir', description: 'Enlace público y código QR', Icon: LinkIcon },
] as const;

export default function CatalogueDetailScreen() {
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

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 16, backgroundColor: theme.background }}>
      {query.isLoading ? <LoadingState /> : notFound ? <ErrorState message="Este menú ya no existe o pertenece a otro negocio." action="Volver a Menús" onAction={() => router.replace('/(tabs)/(menus)')} /> : query.isError || !catalogue ? <ErrorState message="No pudimos cargar este menú." onRetry={() => query.refetch()} /> : <>
        <View style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#111111', padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ minHeight: 26, justifyContent: 'center', borderRadius: 999, backgroundColor: catalogue.is_published ? theme.yellow : 'rgba(255,255,255,0.12)', paddingHorizontal: 10 }}><Text style={{ color: catalogue.is_published ? '#111111' : '#C7C7C7', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{catalogue.is_published ? 'PUBLICADO' : 'BORRADOR'}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: '#C7C7C7', fontSize: 12, fontWeight: '600' }}>Visible</Text><Switch value={catalogue.is_published} onValueChange={togglePublication} trackColor={{ true: theme.yellow }} /></View>
          </View>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: '#FFFDF5', fontSize: 26, fontWeight: '800' }}>{catalogue.name}</Text>
            <Text style={{ color: '#C7C7C7', fontSize: 13, lineHeight: 20 }}>{catalogue.description || 'Sin descripción'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'stretch' }}>
            <MenuSkeleton width={86} padding={9} />
            <View style={{ flex: 1, minWidth: 0, gap: 10, justifyContent: 'flex-end' }}>
              {catalogue.public_slug ? <Text numberOfLines={1} style={{ color: '#C7C7C7', fontSize: 12 }}>eniu.mx/m/{catalogue.public_slug}</Text> : null}
              <Link href={{ pathname: '/(tabs)/(menus)/[catalogueId]/publication', params: { catalogueId } }} asChild>
                <Pressable style={({ pressed }) => ({ height: 42, borderRadius: 13, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}><Text style={{ color: '#111111', fontWeight: '700', fontSize: 13.5 }}>Ver como cliente</Text></Pressable>
              </Link>
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>{actions.map((action, index) => {
          const count = counts[action.route];
          const unit = 'unit' in action ? action.unit : null;
          // Misma estructura que una fila de producto: cuadro a la izquierda,
          // dos líneas de texto y, en lugar del precio, la flecha de avanzar.
          return (
            <Animated.View key={action.route} entering={FadeInDown.duration(300).delay(index * 70)}>
            <Link href={{ pathname: `/(tabs)/(menus)/[catalogueId]/${action.route}`, params: { catalogueId } }} asChild>
              <Pressable style={({ pressed }) => ({ borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: pressed ? 0.72 : 1 })}>
                <View style={{ width: 58, height: 58, borderRadius: 13, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><action.Icon color={theme.yellowPressed} size={25} /></View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{action.title}</Text>
                  <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{action.description}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 }}>
                    {unit ? (
                      <>
                        <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: count ? theme.success : theme.muted }} />
                        <Text style={{ color: count ? theme.success : theme.muted, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{count == null ? '—' : `${count} ${count === 1 ? unit[0] : unit[1]}`}</Text>
                      </>
                    ) : (
                      <>
                        <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: action.route === 'publication' && catalogue.is_published ? theme.success : theme.muted }} />
                        <Text style={{ color: action.route === 'publication' && catalogue.is_published ? theme.success : theme.muted, fontSize: 11, fontWeight: '600' }}>{action.route === 'publication' ? (catalogue.is_published ? 'Publicado' : 'Sin publicar') : 'Portada, colores y tipografía'}</Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ChevronRightIcon color="#111111" size={13} /></View>
              </Pressable>
            </Link>
            </Animated.View>
          );
        })}</View>
      </>}
    </ScrollView>
  );
}
