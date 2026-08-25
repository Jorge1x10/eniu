import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerTransparent: true, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: 'Ajustes', headerLargeTitle: true }} /></Stack>;
}
