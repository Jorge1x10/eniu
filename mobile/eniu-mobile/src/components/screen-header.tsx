import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChevronLeftIcon, PlusIcon } from '@/components/ui/icons';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useScreenTopPadding } from '@/constants/layout';

type Props = {
  title: string;
  /** Sobretítulo en mayúsculas, p. ej. el nombre del menú. */
  overline?: string;
  /** Texto de la ayuda bajo el título. */
  subtitle?: string;
  /** Botón amarillo "+ Nuevo" a la derecha. */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

/** Encabezado de las pantallas internas: Volver, sobretítulo, título y "+ Nuevo". */
export function ScreenHeader({ title, overline, subtitle, actionLabel, onAction, actionDisabled = false }: Props) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const topPadding = useScreenTopPadding();
  return (
    <View style={{ paddingTop: topPadding, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Volver")}
          onPress={() => router.back()}
          style={({ pressed }) => ({ ...cardStyle(theme, 14), width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
        >
          <ChevronLeftIcon color={theme.text} size={14} />
        </Pressable>
        {actionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: actionDisabled }}
            disabled={actionDisabled}
            onPress={onAction}
            style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.yellow, opacity: actionDisabled ? 0.45 : pressed ? 0.8 : 1 })}
          >
            <PlusIcon color={theme.onYellow} size={14} />
            <Text style={{ color: theme.onYellow, fontSize: 15, fontWeight: '800' }}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: 4 }}>
        {overline ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{overline}</Text> : null}
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 }}>{title}</Text>
        {subtitle ? <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 21 }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
