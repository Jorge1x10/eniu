import { createContext, PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import type { User } from '@/types/models';

import { normalizeLanguage, rememberLanguage, restoreStoredLanguage, type Language } from './index';

type LanguageContextValue = {
  language: string;
  changeLanguage: (value: Language) => Promise<void>;
  isSaving: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const { i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Lo que se eligió la última vez, para que el arranque no parpadee en el
  // idioma del dispositivo antes de que responda `auth/me`.
  useEffect(() => { void restoreStoredLanguage(); }, []);

  const accountLanguage = normalizeLanguage(user?.language);

  // La preferencia de la cuenta manda sobre la del dispositivo: alguien puede
  // tener el teléfono en inglés y querer Eniu en español, y esa elección debe
  // seguirle también al panel web.
  useEffect(() => {
    if (accountLanguage && accountLanguage !== i18n.language) {
      void i18n.changeLanguage(accountLanguage);
      void rememberLanguage(accountLanguage);
    }
  }, [accountLanguage, i18n]);

  const changeLanguage = useCallback(async (value: Language) => {
    const language = normalizeLanguage(value);
    if (!language || language === i18n.language) return;

    // Se cambia en pantalla antes de guardar para que responda al momento; si
    // la petición falla se vuelve al anterior, para no mentir sobre lo que
    // quedó guardado en la cuenta.
    const previous = normalizeLanguage(i18n.language) ?? 'es';
    await i18n.changeLanguage(language);
    await rememberLanguage(language);

    if (!user) return;

    setIsSaving(true);
    try {
      const data = await api.patch<{ user: User }>('users/me', { language });
      setUser(data.user);
    } catch {
      await i18n.changeLanguage(previous);
      await rememberLanguage(previous);
    } finally {
      setIsSaving(false);
    }
  }, [i18n, user, setUser]);

  const value = useMemo(
    () => ({ language: i18n.language, changeLanguage, isSaving }),
    [i18n.language, changeLanguage, isSaving],
  );

  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export function useLanguage() {
  const context = use(LanguageContext);
  if (!context) throw new Error('useLanguage debe usarse dentro de LanguageProvider');
  return context;
}
