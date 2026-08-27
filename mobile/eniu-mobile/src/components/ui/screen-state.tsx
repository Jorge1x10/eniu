import { ActivityIndicator, Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';
import { Button } from '@/components/ui/button';

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  const theme = useEniuTheme();
  return <View style={{ padding: 40, alignItems: 'center', gap: 12 }}><ActivityIndicator color={theme.yellowPressed} /><Text style={{ color: theme.muted }}>{label}</Text></View>;
}

export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  const theme = useEniuTheme();
  return <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous', padding: 28, gap: 10, alignItems: 'center' }}><Text style={{ color: theme.text, fontSize: 19, fontWeight: '800', textAlign: 'center' }}>{title}</Text><Text style={{ color: theme.muted, lineHeight: 20, textAlign: 'center' }}>{description}</Text>{action ? <Button onPress={onAction} style={{ marginTop: 8 }}>{action}</Button> : null}</View>;
}

export function ErrorState({ message, onRetry, action, onAction }: { message: string; onRetry?: () => void; action?: string; onAction?: () => void }) {
  const theme = useEniuTheme();
  return <View style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 20, borderCurve: 'continuous', padding: 24, gap: 14 }}><Text selectable style={{ color: theme.danger, lineHeight: 20, textAlign: 'center' }}>{message}</Text>{onRetry ? <Button variant="secondary" onPress={onRetry}>Reintentar</Button> : null}{action ? <Button onPress={onAction}>{action}</Button> : null}</View>;
}
