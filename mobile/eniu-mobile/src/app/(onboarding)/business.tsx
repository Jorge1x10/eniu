import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BrandLine } from '@/components/brand-line';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { ArrowRightIcon, StoreIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { OnboardingHeader } from '@/features/onboarding/onboarding-header';
import { businessTypes, type BusinessType } from '@/features/onboarding/starter-menus';

/** Cómo se nombra cada tipo en "…para tu taquería". Se traduce al pintar. */
const STARTER_FOR: Record<BusinessType, string> = {
  taqueria: 'Cargamos categorías y productos de ejemplo para tu taquería. Cambias nombres y precios, y listo.',
  cafeteria: 'Cargamos categorías y productos de ejemplo para tu cafetería. Cambias nombres y precios, y listo.',
  restaurante: 'Cargamos categorías y productos de ejemplo para tu restaurante. Cambias nombres y precios, y listo.',
  fonda: 'Cargamos categorías y productos de ejemplo para tu fonda. Cambias nombres y precios, y listo.',
  bar: 'Cargamos categorías y productos de ejemplo para tu bar. Cambias nombres y precios, y listo.',
  otro: 'Cargamos categorías y productos de ejemplo para tu negocio. Cambias nombres y precios, y listo.',
};

export default function OnboardingBusinessScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const { businesses } = useBusiness();
  const { draft, setBusinessDraft } = useOnboarding();
  const [name, setName] = useState(draft.businessName);
  const [type, setType] = useState<BusinessType>(draft.businessType);
  const [error, setError] = useState('');
  const [alreadyOnboarded] = useState(() => businesses.length > 0);

  if (alreadyOnboarded) return <Redirect href="/(tabs)/(home)" />;

  // Sólo se guarda en memoria: el negocio se crea de verdad en el paso 3.
  function submit() {
    if (!name.trim()) { setError(t("Escribe el nombre de tu negocio.")); return; }
    setError('');
    setBusinessDraft(name.trim(), type);
    router.push('/(onboarding)/menu');
  }

  // Si el usuario se salta el onboarding no se crea nada; lo capturado queda
  // en memoria por si vuelve.
  function skip() {
    if (name.trim()) setBusinessDraft(name.trim(), type);
    router.replace('/(tabs)/(home)');
  }

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, gap: 24, flexGrow: 1 }}>
        <OnboardingHeader step={1} onSkip={skip} />

        <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 8, marginTop: 12 }}>
          <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1.1 }}>{t("¿Cómo se llama tu negocio?")}</Text>
          <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 22 }}>{t("Así lo verán tus clientes en el menú.")}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(60)}>
          <FormField
            label={t("Nombre del negocio")}
            value={name}
            onChangeText={(value) => { setName(value); setError(''); }}
            maxLength={64}
            placeholder={t("Taquería Doña Mague")}
            icon={<StoreIcon color={theme.muted} size={19} />}
            returnKeyType="next"
            onSubmitEditing={submit}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(120)} style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{t("Tipo de negocio")}</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {businessTypes.map((option) => {
              const selected = option.key === type;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setType(option.key)}
                  style={({ pressed }) => ({
                    width: '31.5%', flexGrow: 1, height: 48, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: selected ? theme.yellow : theme.surface,
                    borderWidth: selected ? 2 : 1, borderColor: selected ? theme.onYellow : theme.border,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={{ color: selected ? theme.onYellow : theme.text, fontSize: 14, fontWeight: selected ? '800' : '600' }}>{t(option.label)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(320).delay(180)} style={{ borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.authHero, padding: 18, gap: 6, overflow: 'hidden' }}>
          <BrandLine color={theme.yellow} width={120} height={112} withTail={false} style={{ position: 'absolute', right: -34, bottom: -46, opacity: 0.5 }} />
          <Text style={{ color: theme.heroText, fontSize: 16, fontWeight: '800', paddingRight: 60 }}>{t("Te armamos el menú de arranque")}</Text>
          <Text style={{ color: theme.heroMuted, fontSize: 13, lineHeight: 19, paddingRight: 60 }}>{t(STARTER_FOR[type])}</Text>
        </Animated.View>

        <Feedback message={error} />
        <View style={{ flex: 1, minHeight: 12 }} />
        <Button size="lg" onPress={submit} trailingIcon={<ArrowRightIcon color={theme.onYellow} size={18} />}>{t("Continuar")}</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
