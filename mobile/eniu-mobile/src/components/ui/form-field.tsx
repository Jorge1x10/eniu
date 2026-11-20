import { ReactNode, Ref, useState } from 'react';
import { Text, TextInput, TextInputProps, useColorScheme, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  ref?: Ref<TextInput>;
  /** Ícono a la izquierda del texto. */
  icon?: ReactNode;
  /** Control a la derecha, p. ej. el botón para mostrar la contraseña. */
  trailing?: ReactNode;
  /** Bloque pegado a la izquierda con fondo propio, p. ej. "MX +52". */
  prefix?: ReactNode;
  /** Va en la fila del label, alineado a la derecha. */
  labelAccessory?: ReactNode;
  /** Ayuda breve debajo del campo. */
  hint?: string;
  /** Alto del campo en la variante con adornos (por defecto 52). */
  fieldHeight?: number;
};

export function FormField({ label, error, multiline, ref, icon, trailing, prefix, labelAccessory, hint, fieldHeight = 52, onFocus, onBlur, ...props }: Props) {
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  const [focused, setFocused] = useState(false);

  const hintText = hint ? <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 16 }}>{hint}</Text> : null;
  const errorText = error ? <Text selectable style={{ color: theme.danger, fontSize: 12 }}>{error}</Text> : null;

  // Sin adornos el campo se ve exactamente como antes: se usa en muchas
  // pantallas fuera del acceso y no debe cambiar.
  const decorated = !!(icon || trailing || prefix || labelAccessory);
  if (!decorated) {
    return (
      <View style={{ gap: 7 }}>
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
        <TextInput
          {...props}
          ref={ref}
          onFocus={onFocus}
          onBlur={onBlur}
          multiline={multiline}
          placeholderTextColor={theme.muted}
          style={{
            minHeight: multiline ? 100 : 48, borderRadius: 13, borderCurve: 'continuous', borderWidth: 1,
            borderColor: error ? theme.danger : theme.border, backgroundColor: theme.field, color: theme.text,
            paddingHorizontal: 15, paddingVertical: multiline ? 12 : 0, textAlignVertical: multiline ? 'top' : 'center', fontSize: 15,
          }}
        />
        {errorText}
        {hintText}
      </View>
    );
  }

  const borderColor = error ? theme.danger : focused ? (isDark ? theme.yellow : theme.text) : theme.border;
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ flexShrink: 1, color: theme.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
        {labelAccessory}
      </View>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', height: fieldHeight, borderRadius: 14, borderCurve: 'continuous',
          borderWidth: 1, borderColor, backgroundColor: theme.field, overflow: 'hidden',
        }}
      >
        {prefix ? (
          <View style={{ alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: theme.surfaceAlt, borderRightWidth: 1, borderRightColor: theme.border }}>
            {prefix}
          </View>
        ) : null}
        {icon ? <View style={{ paddingLeft: 14 }}>{icon}</View> : null}
        <TextInput
          {...props}
          ref={ref}
          accessibilityLabel={props.accessibilityLabel ?? label}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          placeholderTextColor={theme.muted}
          style={{
            flex: 1, alignSelf: 'stretch', color: theme.text, fontSize: 16, paddingVertical: 0,
            paddingLeft: icon ? 10 : 14, paddingRight: trailing ? 4 : 14,
          }}
        />
        {trailing}
      </View>
      {errorText}
      {hintText}
    </View>
  );
}
