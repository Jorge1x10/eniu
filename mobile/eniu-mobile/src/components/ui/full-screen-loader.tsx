import { ActivityIndicator, Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

export function FullScreenLoader({ label = 'Cargando…' }: { label?: string }) {
  const theme = useEniuTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.yellowPressed} />
      <Text selectable style={{ color: theme.muted, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
