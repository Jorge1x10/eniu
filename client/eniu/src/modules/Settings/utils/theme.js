export const THEME_STORAGE_KEY = "eniu_theme";

export function getStoredTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalizedTheme;
  document.documentElement.style.colorScheme = normalizedTheme;
  return normalizedTheme;
}

export function saveTheme(theme) {
  const normalizedTheme = applyTheme(theme);
  localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  return normalizedTheme;
}
