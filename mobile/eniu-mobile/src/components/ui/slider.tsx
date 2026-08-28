import { useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

type Props = { label: string; value: number; onChange: (value: number) => void; step?: number; disabled?: boolean };

/**
 * Control deslizante mínimo para la opacidad del fondo.
 *
 * React Native no trae uno y el proyecto no depende de
 * `@react-native-community/slider`; con el sistema de responders de la propia
 * `View` basta, y evita añadir un módulo nativo sólo por esta barra.
 */
export function Slider({ label, value, onChange, step = 0.05, disabled = false }: Props) {
  const theme = useEniuTheme();
  const [width, setWidth] = useState(0);
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);

  function clamp(next: number) {
    // Dos decimales: es lo que guarda la API y evita mandarle 0.30000000000000004.
    return Number(Math.min(1, Math.max(0, next)).toFixed(2));
  }

  function slideTo(event: GestureResponderEvent) {
    if (!width || disabled) return;
    const ratio = event.nativeEvent.locationX / width;
    onChange(clamp(Math.round(ratio / step) * step));
  }

  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{percent}%</Text>
      </View>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityState={{ disabled }}
        onAccessibilityAction={(event) => { if (!disabled) onChange(clamp(value + (event.nativeEvent.actionName === 'increment' ? step : -step))); }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        // Tomamos el responder al tocar para que el ScrollView de la pantalla no
        // se quede con el gesto en cuanto el dedo se mueve.
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={slideTo}
        onResponderMove={slideTo}
        // El área táctil real es de 44 px aunque la barra se vea de 8.
        style={{ height: 44, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
      >
        <View style={{ height: 8, borderRadius: 99, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
          <View style={{ width: `${percent}%`, height: '100%', backgroundColor: theme.yellow }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: `${percent}%`, marginLeft: -12, width: 24, height: 24, borderRadius: 99, backgroundColor: theme.yellow, borderWidth: 2, borderColor: theme.surface }} />
      </View>
    </View>
  );
}
