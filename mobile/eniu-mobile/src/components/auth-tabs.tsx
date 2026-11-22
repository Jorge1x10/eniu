import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/ui/segmented';

type Tab = 'login' | 'register';

const HREFS = { login: '/(auth)/login', register: '/(auth)/register' } as const;

/** Iniciar sesión | Crear cuenta. Reemplaza la fila "¿Todavía no tienes cuenta?". */
export function AuthTabs({ active }: { active: Tab }) {
  const { t } = useTranslation();
  return (
    <SegmentedControl<Tab>
      options={[{ key: 'login', label: t("Iniciar sesión") }, { key: 'register', label: t("Crear cuenta") }]}
      value={active}
      onChange={(tab) => router.replace(HREFS[tab])}
    />
  );
}
