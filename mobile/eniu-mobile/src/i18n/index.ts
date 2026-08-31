import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { localStore } from '@/lib/local-store';

import en from './en.json';

// El texto en español es la clave, igual que en el backend
// (`app/shared/i18n.py`) y en el dashboard web: las pantallas se leen tal cual
// en el código y, si a una cadena le falta traducción, sale en español en
// lugar de mostrar una clave sin sentido. Por eso no hay un `es.json`.
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export const DEFAULT_LANGUAGE = 'es';

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'eniu_language';

export function normalizeLanguage(value: unknown): Language | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().replace('_', '-').split('-')[0].toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code) ? (code as Language) : null;
}

/**
 * Idioma del dispositivo, sólo para el primer arranque.
 *
 * Los docs de Expo advierten que en Android se puede cambiar el idioma del
 * sistema sin reiniciar la app y recomiendan releerlo al volver del segundo
 * plano. Aquí no aplica, y además no conviene: en cuanto hay preferencia
 * guardada o cuenta, esa manda, y releer el sistema pisaría una elección
 * que el usuario hizo a propósito.
 */
function deviceLanguage(): Language {
  for (const locale of getLocales()) {
    const language = normalizeLanguage(locale.languageCode);
    if (language) return language;
  }
  return DEFAULT_LANGUAGE;
}

// Arranca con el idioma del dispositivo para que la pantalla de acceso no
// salga en el equivocado, y se corrige en cuanto se sabe quién entra: la
// preferencia de verdad vive en la cuenta.
i18n.use(initReactI18next).init({
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  resources: { en: { translation: en } },
  // Las claves son frases completas, con puntos y dos puntos dentro. Sin
  // desactivar estos separadores, i18next leería "Menú:" como un espacio de
  // nombres y no encontraría nada.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  // React Native no tiene `Intl.PluralRules` completo en todas las versiones;
  // el catálogo no usa plurales de i18next, así que no hace falta.
  compatibilityJSON: 'v4',
});

/**
 * Recupera el idioma que se eligió la última vez, antes de haber sesión.
 *
 * Se guarda en el dispositivo además de en la cuenta para que el arranque
 * —antes de que responda `auth/me`— ya salga en el idioma correcto.
 */
export async function restoreStoredLanguage() {
  try {
    const stored = normalizeLanguage(await localStore.getItem(STORAGE_KEY));
    if (stored && stored !== i18n.language) await i18n.changeLanguage(stored);
  } catch {
    // Sin acceso al almacenamiento se sigue con el idioma del dispositivo.
  }
}

export async function rememberLanguage(language: Language) {
  try {
    await localStore.setItem(STORAGE_KEY, language);
  } catch {
    // Que no se pueda recordar no impide usar la app en este idioma.
  }
}

export default i18n;
