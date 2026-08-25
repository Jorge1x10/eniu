import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api } from '@/lib/api';

type Publication = { is_published: boolean; public_url?: string | null; public_slug?: string | null };

export default function PublicationScreen() {
  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const key = ['publication', selectedBusiness?.id, catalogueId] as const;
  const base = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/publication`;
  const query = useQuery({ queryKey: key, queryFn: () => api.get<{ publication: Publication }>(base), enabled: Boolean(selectedBusiness && catalogueId) });
  const publication = query.data?.publication;

  async function toggle() {
    if (!publication) return;
    const data = await api.patch<{ publication: Publication }>(base, { is_published: !publication.is_published });
    queryClient.setQueryData(key, data);
    queryClient.invalidateQueries({ queryKey: ['catalogues', selectedBusiness?.id] });
  }
  async function share() {
    if (publication?.public_url) await Share.share({ title: 'Mi menú digital', message: publication.public_url, url: publication.public_url });
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 18, backgroundColor: theme.background }}>
      {query.isLoading ? <LoadingState /> : query.isError || !publication ? <ErrorState message="No pudimos cargar la publicación." onRetry={() => query.refetch()} /> : <>
        <View style={{ padding: 20, gap: 12, borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{publication.is_published ? 'Menú publicado' : 'Menú no publicado'}</Text><Text style={{ color: theme.muted, lineHeight: 21 }}>{publication.is_published ? 'Tus clientes ya pueden abrir este enlace.' : 'Publica el menú cuando esté listo para tus clientes.'}</Text><Button variant={publication.is_published ? 'danger' : 'primary'} onPress={toggle}>{publication.is_published ? 'Despublicar' : 'Publicar menú'}</Button></View>
        {publication.public_url ? <View style={{ padding: 20, gap: 16, alignItems: 'center', borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}><Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Código QR</Text><View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderCurve: 'continuous', padding: 16 }}><QRCode value={`${publication.public_url}?source=qr`} size={210} color="#111111" backgroundColor="#FFFFFF" /></View><Text selectable style={{ color: theme.muted, textAlign: 'center', lineHeight: 19 }}>{publication.public_url}</Text><View style={{ width: '100%', gap: 10 }}><Button onPress={share}>Compartir enlace</Button>{publication.is_published ? <Button variant="secondary" onPress={() => Linking.openURL(publication.public_url!)}>Abrir menú</Button> : null}</View></View> : <Text style={{ color: theme.muted, textAlign: 'center' }}>La URL se generará al publicar el menú.</Text>}
      </>}
    </ScrollView>
  );
}
