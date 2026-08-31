import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";

// El texto en español es la clave, igual que en el backend
// (`app/shared/i18n.py`): así las pantallas se leen tal cual en el código y,
// si a una cadena le falta traducción, sale en español en lugar de mostrar
// una clave sin sentido. Por eso no hay un `es.json`: el español ya está en
// el propio código.
export const SUPPORTED_LANGUAGES = ["es", "en"];
export const DEFAULT_LANGUAGE = "es";

const STORAGE_KEY = "eniu_language";

export function normalizeLanguage(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().replace("_", "-").split("-")[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(code) ? code : null;
}

/**
 * Idioma con el que arranca la aplicación, antes de saber quién entra.
 *
 * Se guarda en el navegador únicamente para que la pantalla de acceso y el
 * primer pintado no salgan en el idioma equivocado. La preferencia de verdad
 * vive en la cuenta, y en cuanto se carga el usuario manda esa.
 */
export function initialLanguage() {
  try {
    const stored = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Modo privado o almacenamiento bloqueado: se sigue con el del navegador.
  }
  for (const candidate of navigator.languages || [navigator.language]) {
    const language = normalizeLanguage(candidate);
    if (language) return language;
  }
  return DEFAULT_LANGUAGE;
}

export function rememberLanguage(language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Que no se pueda recordar no impide usar la app en este idioma.
  }
}

i18n.use(initReactI18next).init({
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  resources: { en: { translation: en } },
  // Las claves son frases completas, con puntos y dos puntos dentro. Sin
  // desactivar estos separadores, i18next leería "Duración:" como un espacio
  // de nombres y no encontraría nada.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
