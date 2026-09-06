import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';
import type { CatalogBackground } from '@/features/templates/template-catalog';

/**
 * Patrones de fondo prediseñados.
 *
 * Se eligen y se guardan aquí, pero **no se dibujan en la vista previa**: son
 * gradientes CSS y React Native no los sabe pintar. Reproducirlos a mano con
 * SVG daría un dibujo parecido pero no igual, y una vista previa que miente
 * sobre el resultado es peor que una que avisa. Por eso cada opción se muestra
 * con su nombre y su descripción, y el aviso de abajo dice dónde se ven.
 */
export function BackgroundPresetPicker({ backgrounds, value, disabled = false, onChange }: {
  backgrounds: CatalogBackground[];
  value?: string | null;
  disabled?: boolean;
  onChange: (key: string | null) => void;
}) {
  const { t } = useTranslation();
  const appTheme = useEniuTheme();

  const options: { key: string | null; name: string; description: string }[] = [
    { key: null, name: t("Ninguno"), description: t("Sin patrón de fondo") },
    ...backgrounds.map((background) => ({ key: background.key, name: t(background.name), description: t(background.description) })),
  ];

  return (
    <View style={{ gap: 9, opacity: disabled ? 0.5 : 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingRight: 4 }}>
        {options.map((option) => {
          const on = (value ?? null) === option.key;
          return (
            <Pressable
              key={option.key ?? 'none'}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.key)}
              style={({ pressed }) => ({ width: 142, padding: 11, gap: 4, borderRadius: 15, borderCurve: 'continuous', backgroundColor: on ? appTheme.surfaceAlt : appTheme.background, borderWidth: on ? 2 : 1, borderColor: on ? appTheme.yellowPressed : appTheme.border, opacity: pressed ? 0.75 : 1 })}
            >
              <Text style={{ color: appTheme.text, fontSize: 13, fontWeight: '800' }}>{option.name}</Text>
              <Text style={{ color: appTheme.muted, fontSize: 11, lineHeight: 15 }}>{option.description}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={{ color: appTheme.muted, fontSize: 11.5, lineHeight: 16 }}>
        {t("El patrón se dibuja en el menú que abren tus clientes; la vista previa de aquí no lo muestra.")}
      </Text>
    </View>
  );
}
