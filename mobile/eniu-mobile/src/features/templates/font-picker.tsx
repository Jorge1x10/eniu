import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CheckIcon, ChevronDownIcon, LockIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import type { CatalogFont } from '@/features/templates/template-catalog';
import { CATEGORY_FAMILY, fontCategory, type FontCategory } from '@/features/templates/menu-theme';

/** Orden de los grupos: de la letra más neutra a la más decorativa. */
const GROUPS: { category: FontCategory; label: string }[] = [
  { category: 'sans', label: 'Sin serifas' },
  { category: 'serif', label: 'Con serifas' },
  { category: 'handwritten', label: 'Manuscritas' },
  { category: 'mono', label: 'Monoespaciadas' },
];

/**
 * Lista de selección de tipografías.
 *
 * Antes eran píldoras en una cuadrícula que se envolvía sola. Con cinco fuentes
 * se leía; con treinta y cinco es un muro de nombres donde no se distingue
 * ninguna, y encima el nombre iba en la letra de la interfaz, así que no decía
 * nada de cómo se ve la fuente de verdad.
 *
 * Ahora es una lista: un renglón por tipografía, con el nombre escrito en su
 * propia familia —que es la única forma de elegir una letra— y agrupada por
 * familia visual. Va cerrada por omisión, mostrando sólo la elegida, igual que
 * "Colores avanzados" en esta misma pantalla: la pantalla es larga y casi nunca
 * se cambia la tipografía.
 *
 * La aproximación es la misma que usa la vista previa: el sistema no tiene las
 * 35 fuentes, así que cada grupo se dibuja con la familia más cercana. El menú
 * publicado sí carga la fuente real.
 */
export function FontPicker({ fonts, value, onChange, isLocked }: {
  fonts: CatalogFont[];
  value: string;
  onChange: (key: string) => void;
  isLocked: (key: string) => boolean;
}) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () => GROUPS
      .map((group) => ({ ...group, items: fonts.filter((font) => fontCategory(font.key) === group.category) }))
      .filter((group) => group.items.length > 0),
    [fonts],
  );
  const selected = fonts.find((font) => font.key === value);

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t("Elegir tipografía")}
        onPress={() => setOpen((previous) => !previous)}
        style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, borderRadius: 14, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.75 : 1 })}
      >
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' }}>{t("Tipografía")}</Text>
          <Text
            numberOfLines={1}
            style={{ color: theme.text, fontSize: 16, fontWeight: '700', fontFamily: selected ? CATEGORY_FAMILY[fontCategory(selected.key)] : undefined }}
          >
            {selected?.name ?? value}
          </Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon color={theme.muted} size={13} />
        </View>
      </Pressable>

      {open ? (
        <View style={{ borderRadius: 16, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
          {groups.map((group, groupIndex) => (
            <View key={group.category}>
              <View style={{ paddingHorizontal: 15, paddingTop: groupIndex === 0 ? 12 : 16, paddingBottom: 6, backgroundColor: theme.surfaceAlt }}>
                <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t(group.label)}</Text>
              </View>
              {group.items.map((font, index) => {
                const on = font.key === value;
                const locked = isLocked(font.key);
                return (
                  <Pressable
                    key={font.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: locked }}
                    disabled={locked}
                    onPress={() => { onChange(font.key); setOpen(false); }}
                    style={({ pressed }) => ({ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: theme.border, backgroundColor: on ? theme.surfaceAlt : 'transparent', opacity: locked ? 0.45 : pressed ? 0.7 : 1 })}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, color: theme.text, fontSize: 17, fontWeight: on ? '800' : '500', fontFamily: CATEGORY_FAMILY[group.category] }}
                    >
                      {font.name}
                    </Text>
                    {locked ? <LockIcon color={theme.muted} size={13} /> : null}
                    {on ? <CheckIcon color={theme.yellowPressed} size={15} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
