import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { getStarterMenu } from '@/features/onboarding/starter-menus';
import { api } from '@/lib/api';
import type { Catalogue, Category, Product } from '@/types/models';

export default function OnboardingMenuScreen() {
  const theme = useEniuTheme();
  const { business, businessType, setCatalogue } = useOnboarding();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'starter' | 'blank' | null>(null);

  if (!business || !businessType) return <Redirect href="/(onboarding)/business" />;
  const starter = getStarterMenu(businessType);
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: business.currency || 'MXN' });

  async function createCatalogue() {
    const data = await api.post<{ catalogue: Catalogue }>(`businesses/${business!.id}/catalogues`, { name: 'Menú principal' });
    return data.catalogue;
  }

  async function useStarterMenu() {
    setLoading('starter'); setError('');
    try {
      const catalogue = await createCatalogue();
      const category = await api.post<{ category: Category }>(`businesses/${business!.id}/catalogues/${catalogue.id}/categories`, { name: starter.category });
      for (const product of starter.products) {
        await api.post<{ product: Product }>(`businesses/${business!.id}/catalogues/${catalogue.id}/products`, { name: product.name, description: product.description, price: product.price, category_id: category.category.id, is_available: true });
      }
      const published = await api.post<{ catalogue: Catalogue }>(`businesses/${business!.id}/catalogues/${catalogue.id}/publish`);
      setCatalogue(published.catalogue);
      router.push('/(onboarding)/ready');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear tu menú de arranque.');
    } finally { setLoading(null); }
  }

  async function startBlank() {
    setLoading('blank'); setError('');
    try {
      await createCatalogue();
      router.replace('/(tabs)/(home)');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear tu menú.');
    } finally { setLoading(null); }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 24, flexGrow: 1, backgroundColor: theme.background }}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: theme.yellowPressed, fontWeight: '700', fontSize: 14 }}>Paso 2 de 3</Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.surfaceAlt }} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 36 }}>Este es tu menú de arranque</Text>
        <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 21 }}>Ya tiene una categoría y {starter.products.length} productos de ejemplo. Edítalos cuando quieras.</Text>
      </View>

      <Feedback message={error} />

      <View style={{ borderRadius: 22, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, overflow: 'hidden' }}>
        <View style={{ backgroundColor: '#111111', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Text style={{ color: '#FFFDF5', fontSize: 19, fontWeight: '800' }}>Menú principal</Text>
            <Text style={{ color: theme.yellow, fontSize: 11, fontWeight: '600' }}>Vista previa</Text>
          </View>
          <View style={{ minHeight: 26, justifyContent: 'center', borderRadius: 99, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10 }}><Text style={{ color: theme.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>EJEMPLO</Text></View>
        </View>
        <View style={{ padding: 18, gap: 12 }}>
          <Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{starter.category}</Text>
          {starter.products.map((product, index) => <View key={product.name}>
            {index > 0 ? <View style={{ height: 1, backgroundColor: theme.surfaceAlt, marginBottom: 12 }} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{product.name}</Text><Text style={{ color: theme.muted, fontSize: 12.5 }}>{product.description}</Text></View>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{currency.format(product.price)}</Text>
            </View>
          </View>)}
        </View>
      </View>

      <View style={{ flex: 1, minHeight: 12 }} />
      <View style={{ gap: 10 }}>
        <Button loading={loading === 'starter'} disabled={loading === 'blank'} onPress={useStarterMenu}>Usar este menú</Button>
        <Button variant="secondary" loading={loading === 'blank'} disabled={loading === 'starter'} onPress={startBlank}>Empezar en blanco</Button>
      </View>
    </ScrollView>
  );
}
