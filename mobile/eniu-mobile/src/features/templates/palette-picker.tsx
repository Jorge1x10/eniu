import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';
import type { CatalogPalette } from '@/features/templates/template-catalog';

const SWATCHES = ['background', 'primary', 'accent', 'text'] as const;

/**
 * Paletas curadas del catálogo, más la opción de elegir cada color a mano.
 *
 * El color nunca fue una función de pago —el plan gratuito siempre pudo
 * cambiarlo—, así que aquí no hay candados.
 */
export function PalettePicker({ palettes, value, onChange }: {
  palettes: CatalogPalette[];
  value?: string | null;
  onChange: (key: string | null) => void;
}) {
  const { t } = useTranslation();
  const appTheme = useEniuTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
      {palettes.map((palette) => {
        const on = value === palette.key;
        return (
          <Pressable
            key={palette.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(palette.key)}
            style={({ pressed }) => ({ width: 132, padding: 11, gap: 9, borderRadius: 15, borderCurve: 'continuous', backgroundColor: on ? appTheme.surfaceAlt : appTheme.background, borderWidth: on ? 2 : 1, borderColor: on ? appTheme.yellowPressed : appTheme.border, opacity: pressed ? 0.75 : 1 })}
          >
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {SWATCHES.map((token) => (
                <View key={token} style={{ width: 19, height: 19, borderRadius: 999, backgroundColor: palette.tokens[token], borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' }} />
              ))}
            </View>
            <Text style={{ color: appTheme.text, fontSize: 13, fontWeight: '800' }}>{t(palette.name)}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value == null }}
        onPress={() => onChange(null)}
        style={({ pressed }) => ({ width: 132, padding: 11, gap: 6, justifyContent: 'center', borderRadius: 15, borderCurve: 'continuous', borderStyle: 'dashed', backgroundColor: value == null ? appTheme.surfaceAlt : appTheme.background, borderWidth: 2, borderColor: value == null ? appTheme.yellowPressed : appTheme.border, opacity: pressed ? 0.75 : 1 })}
      >
        <Text style={{ color: appTheme.text, fontSize: 13, fontWeight: '800' }}>{t("Personalizado")}</Text>
        <Text style={{ color: appTheme.muted, fontSize: 11, lineHeight: 15 }}>{t("Elige cada color a mano")}</Text>
      </Pressable>
    </ScrollView>
  );
}
