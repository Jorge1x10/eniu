import { Redirect } from 'expo-router';

import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { useAuth } from '@/features/auth/auth-context';

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader label="Preparando Eniu…" />;
  return <Redirect href={user ? '/(tabs)/(home)' : '/(auth)/login'} />;
}
