import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';

/**
 * "MESA 4" en un cuadro. Siempre del mismo color, sin importar el estado: el
 * estado lo dice el chip, y un color más aquí competiría con él. Con
 * `takeaway`, "PARA LLEVAR" en lugar del número.
 */
export function MesaBadge({ number, takeaway = false, delivery = false, size = 46, onDark = false }: { number: number | null; takeaway?: boolean; delivery?: boolean; size?: number; onDark?: boolean }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  if (delivery) {
    return (
      <View
        accessible
        accessibilityLabel={t("A domicilio")}
        style={{ width: size, height: size, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: onDark ? '#3A3631' : theme.surfaceAlt }}
      >
        <Text style={{ color: onDark ? theme.heroMuted : theme.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 }}>{t("A DOM.")}</Text>
        <Text style={{ color: onDark ? theme.heroText : theme.text, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>{t("ENVÍO")}</Text>
      </View>
    );
  }
  if (takeaway) {
    return (
      <View
        accessible
        accessibilityLabel={t("Para llevar")}
        style={{ width: size, height: size, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: onDark ? '#3A3631' : theme.surfaceAlt }}
      >
        <Text style={{ color: onDark ? theme.heroMuted : theme.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 }}>{t("PARA")}</Text>
        <Text style={{ color: onDark ? theme.heroText : theme.text, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>{t("LLEVAR")}</Text>
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={t("Mesa {{number}}", { number })}
      style={{ width: size, height: size, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: onDark ? '#3A3631' : theme.surfaceAlt }}
    >
      <Text style={{ color: onDark ? theme.heroMuted : theme.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 }}>{t("MESA")}</Text>
      <Text style={{ color: onDark ? theme.heroText : theme.text, fontSize: size >= 50 ? 22 : 19, lineHeight: size >= 50 ? 24 : 21, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{number}</Text>
    </View>
  );
}
