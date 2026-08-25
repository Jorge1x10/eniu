import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, getCatalogue } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Catalogue } from '@/types/models';

const actions = [
  { route: 'products', title: 'Productos', description: 'Precios, disponibilidad e imágenes' },
  { route: 'categories', title: 'Categorías', description: 'Organiza el contenido del menú' },
  { route: 'template', title: 'Diseño y plantilla', description: 'Estilo, colores y visibilidad' },
  { route: 'publication', title: 'Publicar y compartir', description: 'Enlace público y código QR' },
] as const;

export default function CatalogueDetailScreen() {
  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const query = useQuery({ queryKey: catalogueKeys.detail(selectedBusiness?.id, catalogueId), queryFn: () => getCatalogue(selectedBusiness!.id, catalogueId), enabled: Boolean(selectedBusiness && catalogueId) });
  const catalogue = query.data?.catalogue;

  async function togglePublication() {
    if (!selectedBusiness || !catalogue) return;
    const path = `businesses/${selectedBusiness.id}/catalogues/${catalogue.id}/${catalogue.is_published ? 'unpublish' : 'publish'}`;
    const data = await api.post<{ catalogue: Catalogue }>(path);
    queryClient.setQueryData(catalogueKeys.detail(selectedBusiness.id, catalogue.id), data);
    queryClient.invalidateQueries({ queryKey: catalogueKeys.all(selectedBusiness.id) });
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 18, backgroundColor: theme.background }}>
      {query.isLoading ? <LoadingState /> : query.isError || !catalogue ? <ErrorState message="No pudimos cargar este menú." onRetry={() => query.refetch()} /> : <>
        <View style={{ gap: 10, padding: 20, borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}><View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: catalogue.is_published ? theme.yellow : theme.surfaceAlt, paddingHorizontal: 11, paddingVertical: 6 }}><Text style={{ color: catalogue.is_published ? '#111111' : theme.muted, fontWeight: '800', fontSize: 12 }}>{catalogue.is_published ? 'Publicado' : 'Borrador'}</Text></View><Text selectable style={{ color: theme.text, fontSize: 26, fontWeight: '900' }}>{catalogue.name}</Text><Text style={{ color: theme.muted, lineHeight: 21 }}>{catalogue.description || 'Sin descripción'}</Text><Button variant="secondary" onPress={togglePublication}>{catalogue.is_published ? 'Despublicar menú' : 'Publicar menú'}</Button></View>
        <View style={{ gap: 12 }}>{actions.map((action) => <Link key={action.route} href={{ pathname: `/(tabs)/(menus)/[catalogueId]/${action.route}`, params: { catalogueId } }} asChild><Pressable style={({ pressed }) => ({ backgroundColor: theme.surface, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, padding: 18, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>{action.title}</Text><Text style={{ color: theme.muted, marginTop: 5 }}>{action.description}</Text></Pressable></Link>)}</View>
      </>}
    </ScrollView>
  );
}
