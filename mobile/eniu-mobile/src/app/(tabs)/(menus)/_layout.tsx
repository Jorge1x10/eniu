import { Stack } from 'expo-router';

export default function MenusLayout() {
  return (
    <Stack screenOptions={{ headerTransparent: true, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[catalogueId]/index" options={{ title: 'Menú' }} />
      <Stack.Screen name="[catalogueId]/products" options={{ title: 'Productos' }} />
      <Stack.Screen name="[catalogueId]/categories" options={{ title: 'Categorías' }} />
      <Stack.Screen name="[catalogueId]/template" options={{ title: 'Diseño del menú' }} />
      <Stack.Screen name="[catalogueId]/publication" options={{ title: 'Publicar y compartir' }} />
    </Stack>
  );
}
