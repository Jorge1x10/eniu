import { Redirect, Stack } from 'expo-router';

import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { useAuth } from '@/features/auth/auth-context';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (user) return <Redirect href="/(tabs)/(home)" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
