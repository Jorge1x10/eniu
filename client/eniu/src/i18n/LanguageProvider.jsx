import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../modules/auth/hooks/useAuth";
import { updateLanguage } from "../modules/auth/services/authService";
import { LanguageContext } from "./languageContext";
import { normalizeLanguage, rememberLanguage } from "./index";

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const accountLanguage = normalizeLanguage(user?.language);

  // La preferencia de la cuenta manda sobre la del navegador: alguien puede
  // tener el equipo en inglés y querer Eniu en español, y esa elección debe
  // seguirle a cualquier dispositivo donde entre.
  useEffect(() => {
    if (accountLanguage && accountLanguage !== i18n.language) {
      i18n.changeLanguage(accountLanguage);
      rememberLanguage(accountLanguage);
    }
  }, [accountLanguage, i18n]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const changeLanguage = useCallback(async (value) => {
    const language = normalizeLanguage(value);
    if (!language || language === i18n.language) return { success: true };

    // Se cambia en pantalla antes de guardar: la interfaz responde al momento
    // y, si la petición falla, se avisa sin haber dejado a nadie esperando.
    i18n.changeLanguage(language);
    rememberLanguage(language);

    if (!user) return { success: true };

    setIsSaving(true);
    const response = await updateLanguage(language);
    setIsSaving(false);

    if (response.success) {
      setUser(response.data.user);
    } else {
      // La cuenta se quedó en el idioma anterior; se revierte para no mentir
      // sobre lo que quedó guardado.
      const previous = normalizeLanguage(user.language) || "es";
      i18n.changeLanguage(previous);
      rememberLanguage(previous);
    }
    return response;
  }, [i18n, user, setUser]);

  const value = useMemo(() => ({
    language: i18n.language,
    changeLanguage,
    isSaving,
  }), [i18n.language, changeLanguage, isSaving]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
