import { Redirect, router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useOnboarding, type MenuChoice } from '@/features/onboarding/onboarding-context';
import { getStarterMenu } from '@/features/onboarding/starter-menus';

export default function OnboardingMenuScreen() {
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const { draft, setMenuChoice } = useOnboarding();

  if (!draft.businessName) return <Redirect href="/(onboarding)/business" />;
  const starter = getStarterMenu(draft.businessType);
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  // Igual que el paso 1: sólo se registra la elección, el alta ocurre en el paso 3.
  function choose(choice: MenuChoice) {
    setMenuChoice(choice);
    router.push('/(onboarding)/ready');
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, gap: 24, flexGrow: 1, backgroundColor: theme.background }}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: theme.yellowPressed, fontWeight: '700', fontSize: 14 }}>Paso 2 de 3</Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
          <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.surfaceAlt }} />
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 36 }}>Este es tu menú de arranque</Text>
        <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 21 }}>Ya tiene una categoría y {starter.products.length} productos de ejemplo. Edítalos cuando quieras.</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(360).delay(80)} style={{ borderRadius: 22, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, overflow: 'hidden' }}>
        <View style={{ backgroundColor: '#111111', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Text style={{ color: '#FFFDF5', fontSize: 19, fontWeight: '800' }}>Menú principal</Text>
            <Text style={{ color: theme.yellow, fontSize: 11, fontWeight: '600' }}>Vista previa</Text>
          </View>
          <View style={{ minHeight: 26, justifyContent: 'center', borderRadius: 99, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10 }}><Text style={{ color: theme.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>EJEMPLO</Text></View>
        </View>
        <View style={{ padding: 18, gap: 12 }}>
          <Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{starter.category}</Text>
          {starter.products.map((product, index) => <Animated.View key={product.name} entering={FadeInDown.duration(280).delay(140 + index * 60)}>
            {index > 0 ? <View style={{ height: 1, backgroundColor: theme.surfaceAlt, marginBottom: 12 }} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{product.name}</Text><Text style={{ color: theme.muted, fontSize: 12.5 }}>{product.description}</Text></View>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{currency.format(product.price)}</Text>
            </View>
          </Animated.View>)}
        </View>
      </Animated.View>

      <View style={{ flex: 1, minHeight: 12 }} />
      <View style={{ gap: 10 }}>
        <Button onPress={() => choose('starter')}>Usar este menú</Button>
        <Button variant="secondary" onPress={() => choose('blank')}>Empezar en blanco</Button>
      </View>
    </ScrollView>
  );
}
