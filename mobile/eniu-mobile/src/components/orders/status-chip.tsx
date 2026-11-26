import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';
import type { OrderStatus } from '@/types/models';

const LABELS: Record<OrderStatus, string> = {
  pending: 'Por aceptar',
  received: 'Recibido',
  preparing: 'Preparando',
  ready: 'Listo',
  on_the_way: 'En camino',
  cancelled: 'Rechazado',
};

/** Un color, un significado: amarillo falta atender, verde listo, rojo rechazado. */
export function StatusChip({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const style = {
    pending: { backgroundColor: theme.yellow, color: theme.onYellow },
    received: { backgroundColor: theme.surfaceAlt, color: theme.text },
    preparing: { backgroundColor: theme.surfaceAlt, color: theme.text },
    ready: { backgroundColor: 'rgba(22,128,58,0.12)', color: theme.success },
    on_the_way: { backgroundColor: 'rgba(22,128,58,0.12)', color: theme.success },
    cancelled: { backgroundColor: 'rgba(198,40,40,0.12)', color: theme.danger },
  }[status];
  return (
    <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: style.backgroundColor }}>
      <Text style={{ color: style.color, fontSize: 12, fontWeight: '800' }}>{t(LABELS[status])}</Text>
    </View>
  );
}
