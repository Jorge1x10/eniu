import { PropsWithChildren } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEniuTheme } from '@/constants/eniu-theme';

/**
 * Pantalla con cabecera oscura a sangre.
 *
 * El problema que resuelve: cuando algo por encima del ScrollView ya insertó el
 * área segura, la cabecera arranca por debajo de la barra de estado y queda una
 * franja del fondo claro arriba.
 *
 * El intento anterior pintaba esa franja dentro de la cabecera, anclada por
 * encima de ella. No servía: el ScrollView recorta todo lo que cae antes del
 * origen de su contenido, así que la banda nunca llegaba a verse. Por eso ahora
 * va **fuera** del ScrollView, pegada al borde de la pantalla.
 *
 * Se dibuja *detrás* del contenido a propósito. Al inicio la cabecera cubre
 * casi todo y la banda sólo asoma en el hueco de arriba, que es justo lo que
 * hay que tapar; al bajar, el contenido pasa por encima y la franja negra no se
 * queda flotando sobre el fondo claro.
 */
export function HeroScreen({ children, contentContainerStyle }: PropsWithChildren<{ contentContainerStyle?: ViewStyle }>) {
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 12);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: safeTop, backgroundColor: theme.hero }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ backgroundColor: theme.background, ...contentContainerStyle }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
