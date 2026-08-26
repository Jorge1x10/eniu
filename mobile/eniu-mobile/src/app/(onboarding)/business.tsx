import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { businessTypes, type BusinessType } from '@/features/onboarding/starter-menus';
import { api } from '@/lib/api';
import type { Business } from '@/types/models';

export default function OnboardingBusinessScreen() {
  const theme = useEniuTheme();
  const { businesses, addBusiness } = useBusiness();
  const { setBusiness, setBusinessType } = useOnboarding();
  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('taqueria');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadyOnboarded] = useState(() => businesses.length > 0);

  if (alreadyOnboarded) return <Redirect href="/(tabs)/(home)" />;

  async function submit() {
    if (!name.trim()) { setError('Escribe el nombre de tu negocio.'); return; }
    setLoading(true); setError('');
    try {
      const data = await api.post<{ business: Business }>('businesses', { name: name.trim() });
      addBusiness(data.business);
      setBusiness(data.business);
      setBusinessType(type);
      router.push('/(onboarding)/menu');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear el negocio.');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 28, flexGrow: 1 }}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.yellowPressed, fontWeight: '700', fontSize: 14 }}>Paso 1 de 3</Text>
            <Pressable onPress={() => router.replace('/(tabs)/(home)')}><Text style={{ color: theme.muted, fontWeight: '700', fontSize: 14 }}>Saltar</Text></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.yellow }} />
            <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.surfaceAlt }} />
            <View style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: theme.surfaceAlt }} />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 36 }}>¿Cómo se llama tu negocio?</Text>
          <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 21 }}>Así lo verán tus clientes en el menú.</Text>
        </View>

        <Feedback message={error} />
        <FormField label="Nombre" value={name} onChangeText={setName} maxLength={64} placeholder="Taquería Doña Mague" />

        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Tipo de negocio</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{businessTypes.map((option) => {
            const selected = option.key === type;
            return <Pressable key={option.key} onPress={() => setType(option.key)} style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 99, backgroundColor: selected ? theme.yellow : theme.surface, borderWidth: 1, borderColor: selected ? theme.yellowPressed : theme.border, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: selected ? '#111111' : theme.text, fontSize: 13, fontWeight: selected ? '700' : '600' }}>{option.label}</Text></Pressable>;
          })}</View>
        </View>

        <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 6 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Te armamos el menú de arranque</Text>
          <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>Cargamos categorías y productos de ejemplo según tu tipo de negocio. Cambias los nombres y precios y listo.</Text>
        </View>

        <View style={{ flex: 1, minHeight: 12 }} />
        <Button loading={loading} onPress={submit}>Continuar</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
