import { Text, View } from 'react-native';

import { LockIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';

/**
 * Aviso de una función que el plan actual no incluye.
 *
 * A diferencia del dashboard web, aquí no hay enlace ni invitación a
 * contratar: las reglas de Apple prohíben ofrecer una compra dentro de la app
 * cuando no pasa por su sistema, así que el aviso sólo informa.
 */
export function PlanNotice({ message }: { message: string }) {
  const theme = useEniuTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt, paddingVertical: 10, paddingHorizontal: 12 }}>
      <LockIcon color={theme.muted} size={14} />
      <Text style={{ flex: 1, color: theme.muted, fontSize: 12.5, lineHeight: 17 }}>{message}</Text>
    </View>
  );
}
