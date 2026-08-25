import { Stack } from 'expo-router';

export default function HomeLayout() {
  return <Stack screenOptions={{ headerLargeTitle: true, headerTransparent: true, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: 'Inicio' }} /></Stack>;
}
