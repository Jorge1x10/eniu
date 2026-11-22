import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Mientras guarda no se puede cerrar: se perdería lo que va en camino. */
  busy?: boolean;
}>;

/**
 * Hoja inferior para crear y editar: asa, "Cancelar" y el título. En iOS es
 * la hoja nativa (`formSheet`); en Android y web, un modal a pantalla
 * completa con la misma cabecera.
 */
export function SheetModal({ visible, title, onClose, busy = false, children }: Props) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const ios = Platform.OS === 'ios';
  return (
    <Modal visible={visible} animationType="slide" presentationStyle={ios ? 'formSheet' : undefined} onRequestClose={() => { if (!busy) onClose(); }}>
      <KeyboardAvoidingView behavior={ios ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ paddingTop: ios ? 8 : insets.top + 8, paddingHorizontal: 20, gap: 8 }}>
          <View style={{ width: 40, height: 5, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
            <Pressable accessibilityRole="button" onPress={onClose} disabled={busy} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', opacity: busy ? 0.4 : 1 }}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{t("Cancelar")}</Text>
            </Pressable>
            <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: theme.text, fontSize: 17, fontWeight: '800', marginRight: 64 }}>{title}</Text>
          </View>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
