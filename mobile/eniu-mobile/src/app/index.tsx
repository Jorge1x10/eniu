import { Redirect } from 'expo-router';

import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from 'react-i18next';

export default function IndexScreen() {
  const { t } = useTranslation();

  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader label={t("Preparando Eniu…")} />;
  return <Redirect href={user ? '/(tabs)/(home)' : '/(auth)/login'} />;
}
