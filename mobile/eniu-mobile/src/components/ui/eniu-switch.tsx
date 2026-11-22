import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useEniuTheme } from '@/constants/eniu-theme';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/**
 * Interruptor propio: riel de 46×28, verde encendido y gris apagado. El área
 * táctil es de 52×44 aunque el riel sea más chico. El switch del sistema no
 * deja fijar estos colores igual en iOS y Android.
 */
export function EniuSwitch({ value, onValueChange, accessibilityLabel, disabled = false }: Props) {
  const theme = useEniuTheme();
  const position = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    position.value = withTiming(value ? 1 : 0, { duration: 160 });
  }, [position, value]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * 18 }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => { Haptics.selectionAsync(); onValueChange(!value); }}
      style={({ pressed }) => ({ width: 52, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          width: 46, height: 28, borderRadius: 99, padding: 3, justifyContent: 'center',
          backgroundColor: value ? theme.success : theme.surfaceAlt,
          borderWidth: value ? 0 : 1, borderColor: theme.border,
        }}
      >
        <Animated.View style={[{ width: 22, height: 22, borderRadius: 99, backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }, knobStyle]} />
      </View>
    </Pressable>
  );
}
