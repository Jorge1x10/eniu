import * as Haptics from 'expo-haptics';
import { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, useColorScheme, View, ViewStyle } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

type Props = PropsWithChildren<{
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  /** `lg` es el CTA principal de las pantallas de acceso: 54 de alto, radio 16. */
  size?: 'md' | 'lg';
  /** Ícono después de la etiqueta, p. ej. una flecha de avanzar. */
  trailingIcon?: ReactNode;
  style?: ViewStyle;
}>;

export function Button({ children, onPress, loading, disabled, variant = 'primary', size = 'md', trailingIcon, style }: Props) {
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  const large = size === 'lg';
  const backgroundColor = variant === 'primary' ? theme.yellow : variant === 'danger' ? theme.danger : theme.surface;
  const color = variant === 'primary' ? theme.onYellow : variant === 'danger' ? '#FFFFFF' : theme.text;
  // El resplandor amarillo sólo se nota sobre la crema; en oscuro no aporta.
  const glow = large && variant === 'primary' && !isDark
    ? { shadowColor: theme.yellowPressed, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } }
    : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => ({
        minHeight: large ? 54 : 48, borderRadius: large ? 16 : 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 14, backgroundColor, borderWidth: variant === 'secondary' ? 1 : 0, borderColor: theme.border,
        opacity: disabled || loading ? 0.55 : pressed ? 0.78 : 1, ...glow, ...style,
      })}
    >
      {loading ? <ActivityIndicator color={color} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 1 }}>
          {/* `flexShrink` y `textAlign`: en una fila de dos botones, una etiqueta
              larga como "Guardar menú" llegaba a empujar el botón más allá de su
              mitad y quedaba descuadrado contra el de al lado. Ahora el texto cede
              y se centra en el espacio que le toca. */}
          <Text style={{ color, fontSize: large ? 17 : 15, fontWeight: '800', flexShrink: 1, textAlign: 'center' }}>{children}</Text>
          {trailingIcon}
        </View>
      )}
    </Pressable>
  );
}
