
import i18n from "../../../i18n";const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHex(value) {
  if (!HEX_PATTERN.test(value)) return null;
  const upper = value.toUpperCase();
  return upper.length === 4
    ? `#${upper[1]}${upper[1]}${upper[2]}${upper[2]}${upper[3]}${upper[3]}`
    : upper;
}

function luminance(color) {
  const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255);
  const adjusted = channels.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * adjusted[0] + 0.7152 * adjusted[1] + 0.0722 * adjusted[2];
}

export function contrastRatio(first, second) {
  const values = [normalizeHex(first), normalizeHex(second)];
  if (values.some((value) => !value)) return 0;
  const [light, dark] = values.map(luminance).sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

export function validateTheme(theme) {
  const errors = {};
  ["background_color", "primary_color", "accent_color", "text_color"].forEach((field) => {
    if (!normalizeHex(theme[field])) errors[field] = i18n.t("Usa un color hexadecimal válido.");
  });
  if (!errors.text_color && !errors.background_color && contrastRatio(theme.text_color, theme.background_color) < 4.5) {
    errors.contrast = i18n.t("El texto no tiene suficiente contraste con el fondo.");
  } else if (theme.tokens?.nav_chip_text && theme.tokens?.nav_chip_bg && contrastRatio(theme.tokens.nav_chip_text, theme.tokens.nav_chip_bg) < 4.5) {
    // El texto general ya no va sobre `primary_color` en ningún lado del
    // menú (el chip activo y la portada sin imagen usan `nav_chip_text`
    // aparte) — se exige contraste sobre el par que de verdad se dibuja
    // junto, igual que ya hace el backend (`template/services.py`).
    errors.contrast = i18n.t("El texto del filtro activo no tiene suficiente contraste con su fondo.");
  }
  if (typeof theme.background_opacity !== "number"
    || !Number.isFinite(theme.background_opacity)
    || theme.background_opacity < 0
    || theme.background_opacity > 1) {
    errors.background_opacity = i18n.t("La opacidad debe estar entre 0% y 100%.");
  }
  return errors;
}
