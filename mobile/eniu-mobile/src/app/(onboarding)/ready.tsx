import { useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { api } from '@/lib/api';

type Publication = { is_published: boolean; public_url?: string | null };

export default function OnboardingReadyScreen() {
  const theme = useEniuTheme();
  const { business, catalogue } = useOnboarding();
  const query = useQuery({
    queryKey: ['onboarding-publication', business?.id, catalogue?.id],
    queryFn: () => api.get<{ publication: Publication }>(`businesses/${business!.id}/catalogues/${catalogue!.id}/publication`),
    enabled: Boolean(business && catalogue),
  });
  const publicUrl = query.data?.publication.public_url;

  if (!business || !catalogue) return <Redirect href="/(onboarding)/business" />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 24, flexGrow: 1, backgroundColor: '#111111' }}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: theme.yellow, fontWeight: '700', fontSize: 14 }}>Paso 3 de 3</Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: '#FFFDF5', fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 36 }}>Tu menú ya está en línea</Text>
        <Text style={{ color: '#C7C7C7', fontSize: 14, lineHeight: 21 }}>Imprime este código, pégalo en la mesa y tus clientes lo abren desde su teléfono.</Text>
      </View>

      {query.isLoading ? <LoadingState label="Generando tu código…" /> : publicUrl ? <>
        <View style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#FFFDF5', padding: 22, alignItems: 'center', gap: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderCurve: 'continuous', padding: 16 }}><QRCode value={`${publicUrl}?source=qr`} size={196} color="#111111" backgroundColor="#FFFFFF" /></View>
          <Text selectable numberOfLines={1} style={{ color: '#5C5646', fontSize: 12.5, fontWeight: '600' }}>{publicUrl.replace(/^https?:\/\//, '')}</Text>
        </View>

        <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#242424', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ color: '#111111', fontWeight: '800', fontSize: 15 }}>1</Text></View>
          <Text style={{ flex: 1, color: '#E4DFCB', fontSize: 12.5, lineHeight: 19 }}>Primer logro desbloqueado: <Text style={{ color: theme.yellow, fontWeight: '700' }}>menú publicado</Text></Text>
        </View>
      </> : null}

      <View style={{ flex: 1, minHeight: 12 }} />
      <View style={{ gap: 10 }}>
        <Pressable disabled={!publicUrl} onPress={() => publicUrl ? Linking.openURL(publicUrl) : undefined} style={({ pressed }) => ({ height: 52, borderRadius: 15, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', opacity: !publicUrl ? 0.5 : pressed ? 0.8 : 1 })}><Text style={{ color: '#111111', fontWeight: '700', fontSize: 15 }}>Ver mi menú como cliente</Text></Pressable>
        <Button variant="secondary" onPress={() => router.replace('/(tabs)/(home)')}>Ir a mi panel</Button>
      </View>
    </ScrollView>
  );
}
