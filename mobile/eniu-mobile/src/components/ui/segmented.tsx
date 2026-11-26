import { ReactNode } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

export type SegmentOption<T extends string> = {
  key: T;
  label: string;
  /** Ícono al lado del texto, p. ej. un candado si el plan no lo incluye. */
  accessory?: ReactNode;
};

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/**
 * Control segmentado: riel `surfaceAlt` con el segmento activo en `surface` y
 * una sombra mínima en claro. Cada segmento mide 40 de alto y su área táctil
 * llega a 48 con el `hitSlop`.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  const activeShadow = isDark ? null : { ...theme.cardShadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt,
        borderWidth: isDark ? 1 : 0, borderColor: theme.border,
      }}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => { if (!selected) onChange(option.key); }}
            style={({ pressed }) => ({
              flex: 1, height: 40, borderRadius: 11, borderCurve: 'continuous', flexDirection: 'row', gap: 6,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: selected ? (isDark ? theme.hero : theme.surface) : 'transparent',
              opacity: pressed && !selected ? 0.7 : 1,
              ...(selected ? activeShadow : null),
            })}
          >
            <Text style={{ color: selected ? theme.text : theme.muted, fontSize: 15, fontWeight: selected ? '700' : '600' }}>{option.label}</Text>
            {option.accessory}
          </Pressable>
        );
      })}
    </View>
  );
}
