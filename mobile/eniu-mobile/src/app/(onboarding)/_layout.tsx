import { Redirect, Stack } from 'expo-router';

import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { useAuth } from '@/features/auth/auth-context';
import { OnboardingProvider } from '@/features/onboarding/onboarding-context';

export default function OnboardingLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </OnboardingProvider>
  );
}
