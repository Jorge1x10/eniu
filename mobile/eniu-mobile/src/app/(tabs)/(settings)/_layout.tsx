import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';

/** Ajustes sólo navega: cada formulario vive en su propia subpantalla. */
export default function SettingsLayout() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" options={{ title: t("Ajustes") }} />
      <Stack.Screen name="profile" options={{ title: t("Perfil") }} />
      <Stack.Screen name="business-profile" options={{ title: t("Mi negocio") }} />
      <Stack.Screen name="regional" options={{ title: t("Moneda y horario") }} />
      <Stack.Screen name="help" options={{ title: t("Ayuda y soporte") }} />
    </Stack>
  );
}
