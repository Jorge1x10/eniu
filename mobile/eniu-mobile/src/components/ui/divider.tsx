import { View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

/**
 * Línea divisoria. Separa el encabezado del contenido de una pantalla y, dentro
 * de una tarjeta, el bloque de información de su acción, para que la tarjeta se
 * lea como un contenedor y no como texto suelto sobre el fondo.
 */
export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useEniuTheme();
  return <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: inset }} />;
}
