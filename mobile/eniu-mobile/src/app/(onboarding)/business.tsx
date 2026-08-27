import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { businessTypes, type BusinessType } from '@/features/onboarding/starter-menus';

export default function OnboardingBusinessScreen() {
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
    if (!name.trim()) { setError('Escribe el nombre de tu negocio.'); return; }
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
      <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, gap: 28, flexGrow: 1 }}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.yellowPressed, fontWeight: '700', fontSize: 14 }}>Paso 1 de 3</Text>
            <Pressable onPress={skip}><Text style={{ color: theme.muted, fontWeight: '700', fontSize: 14 }}>Saltar</Text></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
            <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.surfaceAlt }} />
            <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.surfaceAlt }} />
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 36 }}>¿Cómo se llama tu negocio?</Text>
          <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 21 }}>Así lo verán tus clientes en el menú.</Text>
        </Animated.View>

        <Feedback message={error} />
        <Animated.View entering={FadeInDown.duration(320).delay(60)}>
          <FormField label="Nombre" value={name} onChangeText={setName} maxLength={64} placeholder="Taquería Doña Mague" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(120)} style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Tipo de negocio</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{businessTypes.map((option) => {
            const selected = option.key === type;
            return <Animated.View key={option.key} layout={LinearTransition.duration(180)}><Pressable onPress={() => setType(option.key)} style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 99, backgroundColor: selected ? theme.yellow : theme.surface, borderWidth: 1, borderColor: selected ? theme.yellowPressed : theme.border, opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}><Text style={{ color: selected ? theme.onYellow : theme.text, fontSize: 13, fontWeight: selected ? '700' : '600' }}>{option.label}</Text></Pressable></Animated.View>;
          })}</View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(320).delay(180)} style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 6 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Te armamos el menú de arranque</Text>
          <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>Cargamos categorías y productos de ejemplo según tu tipo de negocio. Cambias los nombres y precios y listo.</Text>
        </Animated.View>

        <View style={{ flex: 1, minHeight: 12 }} />
        <Button onPress={submit}>Continuar</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
