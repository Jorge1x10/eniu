import { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLine } from '@/components/brand-line';
import { useEniuTheme } from '@/constants/eniu-theme';

type Props = PropsWithChildren<{
  /** Contenido del bloque oscuro. Su texto va en `theme.heroText` / `heroMuted`. */
  hero: ReactNode;
  /** Alto mínimo del bloque oscuro, sin contar el área segura. */
  heroMinHeight?: number;
  /** La línea de la marca de fondo, a baja opacidad. */
  showBrandLine?: boolean;
  /** Espacio extra al final del contenido (p. ej. para un botón fijo). */
  contentPaddingBottom?: number;
  sheetStyle?: ViewStyle;
}>;

/**
 * Bloque oscuro arriba y una hoja encimada (`marginTop: -24`, radio 24) con el
 * contenido. Es la estructura de Inicio y del detalle de un menú.
 *
 * El oscuro llega hasta el borde físico de la pantalla con la misma técnica de
 * `HeroScreen`: una banda fija detrás del ScrollView rellena el hueco que deja
 * el área segura.
 */
export function HeroSheet({ hero, heroMinHeight = 200, showBrandLine = true, contentPaddingBottom = 24, sheetStyle, children }: Props) {
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 12);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: safeTop, backgroundColor: theme.authHero }} />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ flexGrow: 1, backgroundColor: theme.background }}
      >
        <View style={{ minHeight: safeTop + heroMinHeight, backgroundColor: theme.authHero, overflow: 'hidden', paddingTop: safeTop + 10, paddingHorizontal: 20, paddingBottom: 24 + 20 }}>
          {showBrandLine ? (
            <BrandLine color={theme.yellow} width={200} height={186} style={{ position: 'absolute', right: -18, top: safeTop + 6, opacity: 0.32 }} />
          ) : null}
          {hero}
        </View>
        <View
          style={{
            flex: 1, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderCurve: 'continuous',
            backgroundColor: theme.background, paddingTop: 20, paddingHorizontal: 20, paddingBottom: contentPaddingBottom, gap: 16,
            ...sheetStyle,
          }}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
