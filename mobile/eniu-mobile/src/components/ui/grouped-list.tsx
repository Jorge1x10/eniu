import { Children, Fragment, PropsWithChildren, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChevronRightIcon } from '@/components/ui/icons';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';

/**
 * Lista agrupada al estilo de los ajustes de iOS: filas relacionadas dentro de
 * una misma tarjeta, separadas por 1 px. El título del grupo es opcional.
 */
export function GroupedList({ title, footer, children }: PropsWithChildren<{ title?: string; footer?: string }>) {
  const theme = useEniuTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Text accessibilityRole="header" style={{ color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 4 }}>
          {title}
        </Text>
      ) : null}
      <View style={{ ...cardStyle(theme, 20), overflow: 'hidden' }}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 16 }} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 4 }}>{footer}</Text> : null}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  /** Valor a la derecha, en `muted` (p. ej. "MXN · CDMX" o un conteo). */
  value?: string;
  /** Ícono dentro del cuadro amarillo de 36×36. */
  icon?: ReactNode;
  /** Control a la derecha en vez del chevron (p. ej. un interruptor). */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Texto rojo y centrado: cerrar sesión, eliminar. */
  destructive?: boolean;
  accessibilityLabel?: string;
};

export function ListRow({ title, subtitle, value, icon, trailing, onPress, destructive = false, accessibilityLabel }: RowProps) {
  const theme = useEniuTheme();
  const content = (
    <View style={{ minHeight: subtitle ? 62 : 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 11, borderCurve: 'continuous', backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: destructive ? theme.danger : theme.text, fontSize: 16, fontWeight: '600', textAlign: destructive && !icon ? 'center' : 'left' }}>{title}</Text>
        {subtitle ? <Text style={{ color: theme.muted, fontSize: 13 }}>{subtitle}</Text> : null}
      </View>
      {value ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 15, maxWidth: '45%' }}>{value}</Text> : null}
      {trailing ?? (onPress && !destructive ? <ChevronRightIcon color={theme.muted} size={12} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? theme.surfaceAlt : 'transparent' })}
    >
      {content}
    </Pressable>
  );
}
