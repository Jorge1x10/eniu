import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys } from '@/features/catalogues/catalogue-api';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { getStarterMenu } from '@/features/onboarding/starter-menus';
import { api } from '@/lib/api';
import type { Business, Catalogue, Category, Product } from '@/types/models';

type Publication = { is_published: boolean; public_url?: string | null };

const STEP_LABELS = ['Creando tu negocio…', 'Armando tu menú…', 'Publicándolo…'];

export default function OnboardingReadyScreen() {
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { addBusiness } = useBusiness();
  const { draft, business, catalogue, setProvisioned } = useOnboarding();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  // Evita que StrictMode o un re-render dispare el alta dos veces.
  const startedRef = useRef(false);

  const provision = useCallback(async () => {
    setError('');
    try {
      setStep(0);
      const businessResponse = await api.post<{ business: Business }>('businesses', { name: draft.businessName });
      const createdBusiness = businessResponse.business;
      addBusiness(createdBusiness);

      setStep(1);
      const catalogueResponse = await api.post<{ catalogue: Catalogue }>(`businesses/${createdBusiness.id}/catalogues`, { name: 'Menú principal' });
      const createdCatalogue = catalogueResponse.catalogue;

      if (draft.menuChoice === 'starter') {
        const starter = getStarterMenu(draft.businessType);
        const categoryResponse = await api.post<{ category: Category }>(`businesses/${createdBusiness.id}/catalogues/${createdCatalogue.id}/categories`, { name: starter.category });
        for (const product of starter.products) {
          await api.post<{ product: Product }>(`businesses/${createdBusiness.id}/catalogues/${createdCatalogue.id}/products`, {
            name: product.name, description: product.description, price: product.price, category_id: categoryResponse.category.id,
          });
        }
      }

      setStep(2);
      const published = await api.post<{ catalogue: Catalogue }>(`businesses/${createdBusiness.id}/catalogues/${createdCatalogue.id}/publish`);
      queryClient.setQueryData<{ catalogues: Catalogue[] }>(catalogueKeys.all(createdBusiness.id), { catalogues: [published.catalogue] });
      setProvisioned(createdBusiness, published.catalogue);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible terminar la configuración.');
    }
  }, [addBusiness, draft.businessName, draft.businessType, draft.menuChoice, queryClient, setProvisioned]);

  useEffect(() => {
    if (startedRef.current || business) return;
    startedRef.current = true;
    provision();
  }, [business, provision]);

  const query = useQuery({
    queryKey: ['onboarding-publication', business?.id, catalogue?.id],
    queryFn: () => api.get<{ publication: Publication }>(`businesses/${business!.id}/catalogues/${catalogue!.id}/publication`),
    enabled: Boolean(business && catalogue),
  });
  const publicUrl = query.data?.publication.public_url;

  if (!draft.businessName || !draft.menuChoice) return <Redirect href="/(onboarding)/business" />;

  function retry() {
    startedRef.current = true;
    provision();
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, gap: 24, flexGrow: 1, backgroundColor: '#111111' }}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: theme.yellow, fontWeight: '700', fontSize: 14 }}>Paso 3 de 3</Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 8 }}>
        <Text style={{ color: '#FFFDF5', fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 36 }}>{publicUrl ? 'Tu menú ya está en línea' : 'Dejando todo listo'}</Text>
        <Text style={{ color: '#C7C7C7', fontSize: 14, lineHeight: 21 }}>{publicUrl ? 'Imprime este código, pégalo en la mesa y tus clientes lo abren desde su teléfono.' : 'Estamos creando tu negocio y tu primer menú. Tarda unos segundos.'}</Text>
      </Animated.View>

      {error ? (
        <Animated.View entering={FadeIn.duration(240)} style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#242424', borderWidth: 1, borderColor: '#555555', padding: 18, gap: 14 }}>
          <Text style={{ color: '#FFFDF5', fontSize: 14, lineHeight: 21 }}>{error}</Text>
          <Button onPress={retry}>Reintentar</Button>
        </Animated.View>
      ) : !publicUrl ? (
        <Animated.View entering={FadeIn.duration(240)} style={{ gap: 16, paddingVertical: 28, alignItems: 'center' }}>
          <ActivityIndicator color={theme.yellow} size="large" />
          <Text style={{ color: '#C7C7C7', fontSize: 13.5, fontWeight: '600' }}>{STEP_LABELS[step]}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>{STEP_LABELS.map((label, index) => (
            <View key={label} style={{ width: index === step ? 22 : 7, height: 7, borderRadius: 99, backgroundColor: index <= step ? theme.yellow : '#555555' }} />
          ))}</View>
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(380)} style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#FFFDF5', padding: 22, alignItems: 'center', gap: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderCurve: 'continuous', padding: 16 }}><QRCode value={`${publicUrl}?source=qr`} size={196} color="#111111" backgroundColor="#FFFFFF" /></View>
            <Text selectable numberOfLines={1} style={{ color: '#5C5646', fontSize: 12.5, fontWeight: '600' }}>{publicUrl.replace(/^https?:\/\//, '')}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(380).delay(120)} style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#242424', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ color: theme.onYellow, fontWeight: '800', fontSize: 15 }}>1</Text></View>
            <Text style={{ flex: 1, color: '#E4DFCB', fontSize: 12.5, lineHeight: 19 }}>Primer logro desbloqueado: <Text style={{ color: theme.yellow, fontWeight: '700' }}>menú publicado</Text></Text>
          </Animated.View>
        </>
      )}

      <View style={{ flex: 1, minHeight: 12 }} />
      <View style={{ gap: 10 }}>
        <Pressable disabled={!publicUrl} onPress={() => publicUrl ? Linking.openURL(publicUrl) : undefined} style={({ pressed }) => ({ height: 52, borderRadius: 15, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', opacity: !publicUrl ? 0.5 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}><Text style={{ color: theme.onYellow, fontWeight: '700', fontSize: 15 }}>Ver mi menú como cliente</Text></Pressable>
        <Button variant="secondary" onPress={() => router.replace('/(tabs)/(home)')}>Ir a mi panel</Button>
      </View>
    </ScrollView>
  );
}
