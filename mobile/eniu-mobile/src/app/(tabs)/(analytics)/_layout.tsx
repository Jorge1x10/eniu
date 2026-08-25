import { Stack } from 'expo-router';

export default function AnalyticsLayout() {
  return <Stack screenOptions={{ headerTransparent: true, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: 'Analíticas', headerLargeTitle: true }} /></Stack>;
}
