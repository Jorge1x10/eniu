import { PropsWithChildren } from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEniuTheme } from '@/constants/eniu-theme';

type Props = PropsWithChildren<{
  paddingHorizontal: number;
  paddingBottom: number;
  gap?: number;
  /** Sólo Inicio lleva sombra: es la cabecera que flota sobre el resumen. */
  elevated?: boolean;
  style?: ViewStyle;
}>;

/**
 * Cabecera oscura a sangre: negra hasta el borde físico de la pantalla, con el
 * contenido por debajo de la barra de estado.
 *
 * El `paddingTop` con `insets.top` no basta por sí solo. Da por hecho que el
 * contenedor empieza en el borde de la pantalla, y cuando algo por encima ya
 * insertó el área segura, ese padding se suma en vez de reemplazarlo: la
 * cabecera arranca por debajo del notch y deja una franja del fondo claro
 * arriba. Es justo lo que se veía.
 *
 * En vez de perseguir de dónde sale ese inset —cambia entre el stack nativo,
 * las pestañas nativas y la versión de iOS—, se pinta una banda negra anclada
 * *por encima* de la cabecera (`bottom: '100%'`), que se coloca sola:
 *
 * - Si la cabecera ya toca el borde, la banda queda fuera de pantalla y no se
 *   ve. No estorba.
 * - Si algo la empujó hacia abajo, la banda rellena exactamente ese hueco.
 *
 * Así el resultado es el mismo en los dos casos, sin depender de un diagnóstico
 * que no se puede comprobar sin correr la app en un dispositivo real. La altura
 * es el doble del inset porque cubre de sobra cualquier desplazamiento
 * plausible; lo que sobra queda fuera de la pantalla.
 */
export function HeroHeader({ children, paddingHorizontal, paddingBottom, gap, elevated, style }: Props) {
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 12);

  return (
    <View
      style={{
        backgroundColor: theme.hero,
        paddingHorizontal,
        paddingTop: safeTop + 14,
        paddingBottom,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderCurve: 'continuous',
        gap,
        // La sombra la decide el tema: en oscuro va vacía, porque una sombra
        // sobre un fondo casi negro no se ve y el relieve lo da que la
        // cabecera sea el plano más claro.
        ...(elevated ? theme.heroShadow : null),
        ...style,
      }}
    >
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: '100%', height: safeTop * 2, backgroundColor: theme.hero }}
      />
      {children}
    </View>
  );
}
