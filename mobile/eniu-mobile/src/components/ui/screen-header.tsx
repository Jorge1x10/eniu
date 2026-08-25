import { Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

export function ScreenHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const theme = useEniuTheme();
  return (
    <View style={{ gap: 4 }}>
      {eyebrow ? <Text style={{ color: theme.eyebrow, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>{eyebrow}</Text> : null}
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>{title}</Text>
      {subtitle ? <Text style={{ color: theme.muted, lineHeight: 20, marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
  );
}
