import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Padding superior para las pantallas raíz de las pestañas, que no llevan header.
 *
 * En iOS lo resuelve `contentInsetAdjustmentBehavior="automatic"` del ScrollView;
 * sumarle el inset a mano lo duplicaba. Pero esa propiedad es exclusiva de iOS,
 * así que en Android hay que aplicar el área segura manualmente o el contenido
 * se mete debajo de la barra de estado.
 */
export function useScreenTopPadding(extra = 8) {
  const insets = useSafeAreaInsets();
  if (process.env.EXPO_OS === 'web') return 28;
  return Platform.OS === 'android' ? insets.top + extra : extra;
}
