import { Alert, Platform } from 'react-native';

import i18n from '@/i18n';

/**
 * Confirmación de una acción que no se deshace. En web `Alert` no muestra
 * botones, así que allí se usa el diálogo del navegador.
 */
export function confirmAction({ title, message, confirmLabel, onConfirm }: { title: string; message?: string; confirmLabel: string; onConfirm: () => void }) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.([title, message].filter(Boolean).join('\n\n'))) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: i18n.t("Cancelar"), style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
