import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { CheckIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import type { Choice } from '@/lib/regions';

/**
 * Elige un valor de una lista larga, con buscador.
 *
 * Las monedas y las zonas horarias eran campos de texto libre —escribir
 * "EUR" y "Europe/Madrid" de memoria, sin equivocarse de guion bajo—, que
 * funcionaba mientras el único mercado era México y su único valor correcto
 * ya venía puesto. Con ciento sesenta monedas y cuatrocientas zonas hace
 * falta buscar, y hace falta que no se pueda guardar un valor que no existe.
 *
 * Sigue la misma hoja inferior que `ColorField` para que el formulario de
 * negocio no tenga dos maneras distintas de elegir algo.
 */
export function ChoiceField({ label, hint, value, options, searchLabel, onChange }: {
  label: string;
  hint?: string;
  value: string;
  options: Choice[];
  searchLabel: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle));
  }, [options, query]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery('');
  }

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Elegir {{name}}", { name: label.toLowerCase() })}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, borderRadius: 13, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.field, opacity: pressed ? 0.75 : 1 })}
      >
        <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' }}>{selected?.label || value}</Text>
        <Text style={{ color: theme.yellowPressed, fontSize: 12.5, fontWeight: '800' }}>{t("Cambiar")}</Text>
      </Pressable>
      {hint ? <Text style={{ color: theme.muted, fontSize: 11.5 }}>{hint}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Cerrar")} style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={{ backgroundColor: theme.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderCurve: 'continuous', padding: 18, gap: 14, height: '82%' }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border }} />
            <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{label}</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchLabel}
              placeholderTextColor={theme.muted}
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel={searchLabel}
              style={{ minHeight: 48, borderRadius: 13, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.field, color: theme.text, paddingHorizontal: 15, fontSize: 15 }}
            />
            <FlatList
              data={visible}
              keyExtractor={(option) => option.value}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={{ color: theme.muted, fontSize: 14, paddingVertical: 18, textAlign: 'center' }}>{t("Sin resultados")}</Text>}
              renderItem={({ item }) => {
                const on = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => choose(item.value)}
                    style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: on ? '800' : '500' }}>{item.label}</Text>
                    {on ? <CheckIcon color={theme.text} size={16} /> : null}
                  </Pressable>
                );
              }}
            />
            <Button variant="secondary" onPress={() => setOpen(false)}>{t("Cancelar")}</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
