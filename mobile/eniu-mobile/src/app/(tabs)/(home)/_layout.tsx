import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Sin header: el título "Inicio" duplicaba la etiqueta de la pestaña y empujaba
// el contenido muy abajo. La pantalla dibuja su propio encabezado pegado al notch.
export default function HomeLayout() {
  const { t } = useTranslation();

  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" options={{ title: t("Inicio") }} /></Stack>;
}
