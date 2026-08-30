import { ActivityIndicator, Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';
import { useTranslation } from 'react-i18next';

export function FullScreenLoader({ label }: { label?: string }) {
  const { t } = useTranslation();
  // El valor por omisión se resuelve aquí: un parámetro por defecto se evalúa
  // antes de que exista `t`.
  const text = label ?? t("Cargando…");

  const theme = useEniuTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.yellowPressed} />
      <Text selectable style={{ color: theme.muted, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
