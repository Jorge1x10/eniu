import { ActivityIndicator, Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  // Ver la nota en `FullScreenLoader`: no puede ir en la firma.
  const text = label ?? t("Cargando…");

  const theme = useEniuTheme();
  return <View style={{ padding: 40, alignItems: 'center', gap: 12 }}><ActivityIndicator color={theme.yellowPressed} /><Text style={{ color: theme.muted }}>{text}</Text></View>;
}

export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  const theme = useEniuTheme();
  return <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous', padding: 28, gap: 10, alignItems: 'center' }}><Text style={{ color: theme.text, fontSize: 19, fontWeight: '800', textAlign: 'center' }}>{title}</Text><Text style={{ color: theme.muted, lineHeight: 20, textAlign: 'center' }}>{description}</Text>{action ? <Button onPress={onAction} style={{ marginTop: 8 }}>{action}</Button> : null}</View>;
}

export function ErrorState({ message, error, onRetry, action, onAction }: { message: string; error?: unknown; onRetry?: () => void; action?: string; onAction?: () => void }) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  // Cuando la petición no llegó a salir, el motivo real —"sin internet"— es
  // más útil que "no pudimos cargar los productos", que suena a que el
  // problema está en Eniu y no en la red.
  const text = error instanceof ApiError && error.isOffline ? error.message : message;
  return <View style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 20, borderCurve: 'continuous', padding: 24, gap: 14 }}><Text selectable style={{ color: theme.danger, lineHeight: 20, textAlign: 'center' }}>{text}</Text>{onRetry ? <Button variant="secondary" onPress={onRetry}>{t("Reintentar")}</Button> : null}{action ? <Button onPress={onAction}>{action}</Button> : null}</View>;
}
