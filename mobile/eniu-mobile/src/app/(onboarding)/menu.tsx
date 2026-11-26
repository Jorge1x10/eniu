import { Redirect, router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from '@/components/ui/icons';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useOnboarding, type MenuChoice } from '@/features/onboarding/onboarding-context';
import { OnboardingHeader } from '@/features/onboarding/onboarding-header';
import { getStarterMenu } from '@/features/onboarding/starter-menus';
import { currentLocale } from '@/i18n/formats';
import { deviceCurrency } from '@/lib/regions';

export default function OnboardingMenuScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const { draft, setMenuChoice } = useOnboarding();

  if (!draft.businessName) return <Redirect href="/(onboarding)/business" />;
  const starter = getStarterMenu(draft.businessType);
  // La misma moneda con la que se dará de alta el negocio en el paso 3: la
  // vista previa no debe prometer pesos a quien va a cobrar en euros.
  const currency = new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: deviceCurrency() });

  // Igual que el paso 1: sólo se registra la elección, el alta ocurre en el paso 3.
  function choose(choice: MenuChoice) {
    setMenuChoice(choice);
    router.push('/(onboarding)/ready');
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, gap: 24, flexGrow: 1, backgroundColor: theme.background }}>
      <OnboardingHeader step={2} onBack={() => router.back()} />

      <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 8, marginTop: 12 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1.1 }}>{t("Tu menú ya tiene por dónde empezar")}</Text>
        <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 22 }}>
          {t("Una categoría y {{count}} productos de ejemplo. Los editas cuando quieras.", { count: starter.products.length })}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(360).delay(80)} style={{ ...cardStyle(theme, 22), overflow: 'hidden' }}>
        <View style={{ backgroundColor: theme.authHero, padding: 18, gap: 4 }}>
          <Text style={{ color: theme.yellow, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t("Vista previa · ejemplo")}</Text>
          <Text numberOfLines={1} style={{ color: theme.heroText, fontSize: 20, fontWeight: '900' }}>{draft.businessName}</Text>
          <Text style={{ color: theme.heroMuted, fontSize: 13 }}>{t("Menú principal")}</Text>
        </View>
        <View style={{ padding: 18, gap: 12 }}>
          <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{starter.category}</Text>
          {starter.products.map((product, index) => (
            <Animated.View key={product.name} entering={FadeInDown.duration(280).delay(140 + index * 60)}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border, marginBottom: 12 }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{product.name}</Text>
                  <Text style={{ color: theme.muted, fontSize: 13 }}>{product.description}</Text>
                </View>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{currency.format(product.price)}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      <View style={{ flex: 1, minHeight: 12 }} />
      <View style={{ gap: 10 }}>
        <Button size="lg" onPress={() => choose('starter')} trailingIcon={<ArrowRightIcon color={theme.onYellow} size={18} />}>{t("Usar este menú")}</Button>
        <Button variant="secondary" onPress={() => choose('blank')}>{t("Empezar en blanco")}</Button>
      </View>
    </ScrollView>
  );
}
