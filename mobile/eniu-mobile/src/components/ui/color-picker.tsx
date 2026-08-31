import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { CheckIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { normalizeHex, readableOn } from '@/features/templates/menu-theme';
import { useTranslation } from 'react-i18next';

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const sector = Math.floor(hue / 60) % 6;
  const rgb = [
    [chroma, secondary, 0], [secondary, chroma, 0], [0, chroma, secondary],
    [0, secondary, chroma], [secondary, 0, chroma], [chroma, 0, secondary],
  ][sector];
  return `#${rgb.map((value) => Math.round((value + match) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

const HUES = [0, 22, 40, 52, 78, 140, 168, 192, 214, 250, 285, 325];
const LIGHTNESS = [0.9, 0.79, 0.66, 0.52, 0.38, 0.25];
const NEUTRALS = ['#FFFFFF', '#F5F2E9', '#D9D9D9', '#8A8A8A', '#444444', '#111111'];
const BRAND = ['#FFFDF5', '#FFE05A', '#E8C93D', '#F8E8AE', '#E9DDB7', '#2A2A2A'];
const PALETTE = [BRAND, NEUTRALS, ...HUES.map((hue) => LIGHTNESS.map((lightness) => hslToHex(hue, 0.7, lightness)))];

function Swatch({ color, selected, onPress }: { color: string; selected: boolean; onPress: () => void }) {
  const theme = useEniuTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Color {{name}}", { name: color })}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, aspectRatio: 1, borderRadius: 11, borderCurve: 'continuous', backgroundColor: color, borderWidth: selected ? 2.5 : 1, borderColor: selected ? theme.text : 'rgba(0,0,0,0.14)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      {selected ? <CheckIcon color={readableOn(color)} size={15} /> : null}
    </Pressable>
  );
}

/**
 * Selector visual de color. La pantalla de diseño sólo aceptaba códigos
 * hexadecimales escritos a mano, que es exactamente lo que nadie sabe de
 * memoria; el campo de texto sigue ahí para quien traiga el color de su marca.
 */
export function ColorField({ label, hint, value, original, error, onChange }: { label: string; hint?: string; value: string; original?: string; error?: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const valid = normalizeHex(draft);
  const preview = normalizeHex(value) ?? theme.surfaceAlt;

  function openPicker() {
    setDraft(value);
    setOpen(true);
  }

  function confirm() {
    if (!valid) return;
    onChange(valid);
    setOpen(false);
  }

  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
        {original && normalizeHex(value) !== normalizeHex(original) ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onChange(original)}><Text style={{ color: theme.yellowPressed, fontSize: 12, fontWeight: '700' }}>{t("Restaurar")}</Text></Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Elegir {{name}}", { name: label.toLowerCase() })}
        onPress={openPicker}
        style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.field, opacity: pressed ? 0.75 : 1 })}
      >
        <View style={{ width: 38, height: 38, borderRadius: 11, borderCurve: 'continuous', backgroundColor: preview, borderWidth: 1, borderColor: 'rgba(0,0,0,0.16)' }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value.toUpperCase()}</Text>
          {hint ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11.5, marginTop: 1 }}>{hint}</Text> : null}
        </View>
        <Text style={{ color: theme.yellowPressed, fontSize: 12.5, fontWeight: '800' }}>{t("Cambiar")}</Text>
      </Pressable>
      {error ? <Text style={{ color: theme.danger, fontSize: 12 }}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={{ backgroundColor: theme.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderCurve: 'continuous', padding: 18, gap: 14, maxHeight: '82%' }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border }} />
            <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 15, borderCurve: 'continuous', backgroundColor: valid ?? theme.surfaceAlt, borderWidth: 1, borderColor: theme.border }} />
              <TextInput
                value={draft}
                onChangeText={(text) => setDraft(text.startsWith('#') || !text ? text.toUpperCase() : `#${text.toUpperCase()}`)}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                accessibilityLabel="Código hexadecimal"
                style={{ flex: 1, minHeight: 52, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: valid ? theme.border : theme.danger, backgroundColor: theme.field, color: theme.text, paddingHorizontal: 15, fontSize: 16, fontWeight: '700' }}
              />
            </View>
            <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
              {PALETTE.map((row, index) => (
                <View key={index} style={{ flexDirection: 'row', gap: 8 }}>
                  {row.map((color) => <Swatch key={color} color={color} selected={valid === color} onPress={() => setDraft(color)} />)}
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="secondary" style={{ flex: 1 }} onPress={() => setOpen(false)}>{t("Cancelar")}</Button>
              <Button style={{ flex: 1 }} disabled={!valid} onPress={confirm}>{t("Usar color")}</Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
