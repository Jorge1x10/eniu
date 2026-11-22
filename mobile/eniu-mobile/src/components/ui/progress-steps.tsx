import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';

/**
 * "Paso X de Y" y una barra por paso: los hechos en `text`, el actual en
 * amarillo y los que faltan en `border`. Que se vea cuánto falta ayuda a
 * terminar (gradiente de la meta).
 */
export function ProgressSteps({ current, total, label }: { current: number; total: number; label?: string }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const text = label ?? t("Paso {{current}} de {{total}}", { current, total });
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={text}
      accessibilityValue={{ min: 1, max: total, now: current }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{text}</Text>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          const backgroundColor = position < current ? theme.text : position === current ? theme.yellow : theme.border;
          return <View key={position} style={{ width: 22, height: 5, borderRadius: 99, backgroundColor }} />;
        })}
      </View>
    </View>
  );
}
