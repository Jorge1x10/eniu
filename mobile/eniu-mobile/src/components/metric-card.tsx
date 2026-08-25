import { Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

export function MetricCard({ label, value, detail, tone = 'yellow' }: { label: string; value: string | number; detail: string; tone?: 'yellow' | 'cream' | 'sand' }) {
  const theme = useEniuTheme();
  const accent = tone === 'cream' ? theme.cream : tone === 'sand' ? theme.sand : theme.yellow;
  return <View style={{ flex: 1, minWidth: 145, minHeight: 148, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous', padding: 18, gap: 10 }}><View style={{ width: 36, height: 6, borderRadius: 999, backgroundColor: accent }} /><Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 17 }}>{label}</Text><Text selectable style={{ color: theme.text, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 36 }}>{value}</Text><Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16 }}>{detail}</Text></View>;
}
