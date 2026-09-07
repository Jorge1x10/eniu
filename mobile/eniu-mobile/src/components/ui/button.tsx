import * as Haptics from 'expo-haptics';
import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, Text, ViewStyle } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

type Props = PropsWithChildren<{ onPress?: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; style?: ViewStyle }>;

export function Button({ children, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const theme = useEniuTheme();
  const backgroundColor = variant === 'primary' ? theme.yellow : variant === 'danger' ? theme.danger : theme.surface;
  const color = variant === 'primary' ? theme.onYellow : variant === 'danger' ? '#FFFFFF' : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => ({
        minHeight: 48, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 14, backgroundColor, borderWidth: variant === 'secondary' ? 1 : 0, borderColor: theme.border,
        opacity: disabled || loading ? 0.55 : pressed ? 0.78 : 1, ...style,
      })}
    >
      {loading ? <ActivityIndicator color={color} /> : (
        // `flexShrink` y `textAlign`: en una fila de dos botones, una etiqueta
        // larga como "Guardar menú" llegaba a empujar el botón más allá de su
        // mitad y quedaba descuadrado contra el de al lado. Ahora el texto cede
        // y se centra en el espacio que le toca.
        <Text style={{ color, fontSize: 15, fontWeight: '800', flexShrink: 1, textAlign: 'center' }}>{children}</Text>
      )}
    </Pressable>
  );
}
