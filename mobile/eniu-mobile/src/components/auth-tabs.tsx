import { router } from 'expo-router';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';

type Tab = 'login' | 'register';

const TABS: { key: Tab; label: string; href: '/(auth)/login' | '/(auth)/register' }[] = [
  { key: 'login', label: 'Iniciar sesión', href: '/(auth)/login' },
  { key: 'register', label: 'Crear cuenta', href: '/(auth)/register' },
];

/** Control segmentado entre iniciar sesión y crear cuenta. La transición es el fade de `(auth)/_layout`. */
export function AuthTabs({ active }: { active: Tab }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  // Sombra mínima: la pestaña sólo tiene que despegarse un poco del riel.
  const activeShadow = isDark ? null : { ...theme.cardShadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 };

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt,
        borderWidth: isDark ? 1 : 0, borderColor: theme.border,
      }}
    >
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            // 40 de alto + 4 arriba y abajo: el área táctil llega a 48.
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => { if (!selected) router.replace(tab.href); }}
            style={({ pressed }) => ({
              flex: 1, height: 40, borderRadius: 11, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
              backgroundColor: selected ? (isDark ? theme.hero : theme.surface) : 'transparent',
              opacity: pressed && !selected ? 0.7 : 1,
              ...(selected ? activeShadow : null),
            })}
          >
            <Text style={{ color: selected ? theme.text : theme.muted, fontSize: 15, fontWeight: selected ? '700' : '600' }}>{t(tab.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
