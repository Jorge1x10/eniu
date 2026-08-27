import { Stack } from 'expo-router';

import { useEniuTheme } from '@/constants/eniu-theme';

export default function MenusLayout() {
  const theme = useEniuTheme();
  return (
    // Header opaco (no transparente): con el transparente el contenido se metía
    // debajo de la barra y tapaba el estado del menú.
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Menús' }} />
      <Stack.Screen name="[catalogueId]/index" options={{ title: 'Menú' }} />
      <Stack.Screen name="[catalogueId]/products" options={{ title: 'Productos' }} />
      <Stack.Screen name="[catalogueId]/categories" options={{ title: 'Categorías' }} />
      <Stack.Screen name="[catalogueId]/template" options={{ title: 'Diseño del menú' }} />
      <Stack.Screen name="[catalogueId]/publication" options={{ title: 'Publicar y compartir' }} />
    </Stack>
  );
}
