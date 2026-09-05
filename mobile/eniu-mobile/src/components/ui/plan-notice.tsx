import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LockIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { purchasesAvailable } from '@/features/billing/purchases';

/**
 * Aviso de una función que el plan actual no incluye.
 *
 * Antes sólo informaba: ofrecer la compra habría incumplido las reglas de
 * Apple, porque el cobro no pasaba por su sistema. Ahora que la compra va por
 * la tienda (RevenueCat), el aviso sí invita a mejorar el plan — pero sólo
 * cuando esa compra es realmente posible, para no llevar a nadie a un callejón
 * sin salida.
 */
export function PlanNotice({ message }: { message: string }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const canUpgrade = purchasesAvailable();

  return (
    <View style={{ gap: 9, borderRadius: 12, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt, paddingVertical: 10, paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <LockIcon color={theme.muted} size={14} />
        <Text style={{ flex: 1, color: theme.muted, fontSize: 12.5, lineHeight: 17 }}>{message}</Text>
      </View>
      {canUpgrade ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/paywall')}
          hitSlop={6}
          style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ color: theme.yellowPressed, fontSize: 12.5, fontWeight: '800' }}>{t("Ver planes")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
