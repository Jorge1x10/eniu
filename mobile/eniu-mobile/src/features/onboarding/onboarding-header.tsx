import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChevronLeftIcon } from '@/components/ui/icons';
import { ProgressSteps } from '@/components/ui/progress-steps';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';

/** "Configura tu menú · 1 de 3", con Volver a la izquierda o Saltar a la derecha. */
export function OnboardingHeader({ step, onBack, onSkip }: { step: number; onBack?: () => void; onSkip?: () => void }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Volver")}
          onPress={onBack}
          style={({ pressed }) => ({ ...cardStyle(theme, 14), width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
        >
          <ChevronLeftIcon color={theme.text} size={14} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, alignItems: onBack ? 'flex-end' : 'flex-start' }}>
        <ProgressSteps current={step} total={3} label={t("Configura tu menú · {{current}} de {{total}}", { current: step, total: 3 })} />
      </View>
      {onSkip ? (
        <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8} style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
          <Text style={{ color: theme.muted, fontWeight: '700', fontSize: 14 }}>{t("Saltar")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
