import { Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

export function Feedback({ message, tone = 'error' }: { message?: string; tone?: 'error' | 'success' }) {
  const theme = useEniuTheme();
  if (!message) return null;
  const color = tone === 'error' ? theme.danger : theme.success;
  return <View style={{ borderRadius: 12, borderCurve: 'continuous', borderWidth: 1, borderColor: color, padding: 12 }}><Text selectable style={{ color, fontSize: 13, lineHeight: 18 }}>{message}</Text></View>;
}
