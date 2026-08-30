import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/ui/button';
import { CheckIcon, EyeIcon, QrIcon } from '@/components/ui/icons';
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
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16, backgroundColor: theme.background }}>
      {query.isLoading ? <LoadingState /> : query.isError || !publication ? <ErrorState message="No pudimos cargar la publicación." onRetry={() => query.refetch()} /> : <>
        <View style={{ borderRadius: 22, borderCurve: 'continuous', backgroundColor: publication.is_published ? theme.surfaceAlt : theme.surface, borderWidth: 1, borderColor: theme.border, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 99, backgroundColor: publication.is_published ? theme.yellow : theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{publication.is_published ? <CheckIcon color="#111111" size={18} /> : null}</View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{publication.is_published ? 'Menú publicado' : 'Menú no publicado'}</Text>
            <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>{publication.is_published ? 'Tus clientes ya pueden abrir este enlace.' : 'Publica el menú cuando esté listo para tus clientes.'}</Text>
          </View>
        </View>

        {!publication.is_published ? <Button onPress={toggle}>Publicar menú</Button> : null}

        {/* El slug se reserva al primer publicado y se conserva aunque luego se
            despublique, para que un QR ya impreso siga siendo válido. Pero
            mientras no esté publicado ese enlace responde 404, así que aquí sólo
            se ofrece cuando de verdad lleva a algún lado. */}
        {publication.is_published && publication.public_url ? <>
          <View style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 22, alignItems: 'center', gap: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderCurve: 'continuous', padding: 16 }}><QRCode value={`${publication.public_url}?source=qr`} size={196} color="#111111" backgroundColor="#FFFFFF" /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 38, paddingHorizontal: 14, borderRadius: 99, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border }}>
              <Text selectable numberOfLines={1} style={{ color: theme.muted, fontSize: 12.5, fontWeight: '600', maxWidth: 220 }}>{publication.public_url.replace(/^https?:\/\//, '')}</Text>
              <QrIcon color={theme.yellowPressed} size={13} />
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Pressable onPress={() => Linking.openURL(publication.public_url!)} style={({ pressed }) => ({ height: 52, borderRadius: 15, backgroundColor: theme.yellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: pressed ? 0.8 : 1 })}>
              <EyeIcon color="#111111" size={17} /><Text style={{ color: '#111111', fontWeight: '700', fontSize: 15 }}>Ver como cliente</Text>
            </Pressable>
            <Button variant="secondary" onPress={share}>Compartir enlace</Button>
          </View>
        </> : publication.public_url ? (
          <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 6 }}>
            <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '700' }}>Su dirección ya está apartada</Text>
            <Text selectable style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>{publication.public_url.replace(/^https?:\/\//, '')}</Text>
            <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>No cambiará al publicar y despublicar, así que un código QR impreso sigue sirviendo. El QR aparece aquí en cuanto publiques.</Text>
          </View>
        ) : <Text style={{ color: theme.muted, textAlign: 'center' }}>La URL se generará al publicar el menú.</Text>}

        {publication.is_published ? <Pressable onPress={toggle} style={({ pressed }) => ({ minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}><Text style={{ color: theme.danger, fontWeight: '700', fontSize: 14 }}>Despublicar menú</Text></Pressable> : null}
      </>}
    </ScrollView>
  );
}
