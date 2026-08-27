import { Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useEniuTheme } from '@/constants/eniu-theme';

// Todas las tarjetas del resumen se ven iguales: el mismo acento amarillo. Los
// tonos crema y arena hacían parecer que unas métricas valían menos que otras,
// y el arena casi no contrastaba contra el fondo.
export function MetricCard({ label, value, detail, emphasis, index = 0 }: { label: string; value: string | number; detail: string; emphasis?: boolean; index?: number }) {
  const theme = useEniuTheme();
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 60)} style={{ flex: 1, minWidth: 145, minHeight: 148, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous', padding: 18, gap: 10 }}>
      <Animated.View style={{ width: 36, height: 6, borderRadius: 999, backgroundColor: theme.yellow }} />
      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 17 }}>{label}</Text>
      <Text selectable style={{ color: theme.text, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 36 }}>{value}</Text>
      <Text style={{ color: emphasis ? theme.yellowPressed : theme.muted, fontSize: 11, lineHeight: 16, fontWeight: emphasis ? '700' : '400' }}>{detail}</Text>
    </Animated.View>
  );
}
