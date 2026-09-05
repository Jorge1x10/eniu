import { Platform } from 'react-native';

import type { FontKey, MenuSplash, MenuTheme, TemplateConfig, TemplateKey, ThemeColor, ThemeTokens } from '@/types/models';
import i18n from '@/i18n';

export const DEFAULT_SPLASH: MenuSplash = { enabled: false, duration: 2.5, image_url: null };

/** El backend acota la duración a este rango; la app no ofrece más. */
export const SPLASH_RANGE = { min: 1, max: 4, step: 0.5 };

export const DEFAULT_THEME: MenuTheme = {
  background_color: '#FFFDF5',
  primary_color: '#FFE05A',
  accent_color: '#E8C93D',
  text_color: '#111111',
  font_key: 'inter',
  show_cover: true,
  show_product_images: true,
  background_opacity: 0.2,
  cover_image_url: null,
  background_image_url: null,
  cover_focal_x: 0.5,
  cover_focal_y: 0.5,
  background_preset_key: null,
  color_preset_key: 'classic',
  theme_overrides: {},
};

export const COLOR_FIELDS: { key: ThemeColor; label: string; hint: string }[] = [
  { key: 'background_color', label: 'Fondo', hint: 'El lienzo de todo el menú' },
  { key: 'primary_color', label: 'Principal', hint: 'Botones, filtros y portada' },
  { key: 'accent_color', label: 'Acento', hint: 'Bordes y separadores' },
  { key: 'text_color', label: 'Texto', hint: 'Títulos, precios y descripciones' },
];

/** Los 4 colores que sí tienen columna propia en la base. */
export const CORE_COLOR_FIELDS = new Set<ThemeColor>(COLOR_FIELDS.map((field) => field.key));

/** Los mismos 4, con el nombre que usan los tokens del catálogo. */
export const CORE_TOKEN_KEYS = new Set<string>(['background', 'primary', 'accent', 'text']);

/**
 * La app no empaqueta las 35 tipografías del menú publicado —serían decenas de
 * megas en el binario para una vista previa—, así que usa la familia del
 * sistema más parecida. Lo que el usuario necesita distinguir aquí es el
 * carácter de la letra: con serifas, sin ellas, de máquina de escribir o
 * manuscrita.
 */
const SERIF_FONTS = new Set([
  'playfair', 'lora', 'merriweather', 'libre_baskerville', 'crimson_text',
  'pt_serif', 'cormorant', 'fraunces', 'dm_serif_display', 'bitter', 'abril_fatface',
]);
const MONO_FONTS = new Set(['jetbrains_mono', 'space_mono']);
const HANDWRITTEN_FONTS = new Set(['pacifico', 'dancing_script', 'caveat']);

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
export const MONOSPACE = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const HANDWRITTEN = Platform.select({ ios: 'Snell Roundhand', android: 'casual', default: 'cursive' });

export function fontFamilyFor(fontKey: FontKey, templateKey?: TemplateKey) {
  if (MONO_FONTS.has(fontKey)) return MONOSPACE;
  if (HANDWRITTEN_FONTS.has(fontKey)) return HANDWRITTEN;
  if (SERIF_FONTS.has(fontKey)) return SERIF;
  // Igual que en la web: las plantillas editoriales ya son de serifas por
  // definición, y con la tipografía por defecto se muestran así.
  if (fontKey === 'inter' && (templateKey === 'elegant' || templateKey === 'luxury' || templateKey === 'story')) return SERIF;
  return undefined;
}

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHex(value: string): string | null {
  if (!HEX_PATTERN.test(value)) return null;
  const upper = value.toUpperCase();
  return upper.length === 4 ? `#${upper[1]}${upper[1]}${upper[2]}${upper[2]}${upper[3]}${upper[3]}` : upper;
}

function luminance(color: string) {
  const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255);
  const adjusted = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * adjusted[0] + 0.7152 * adjusted[1] + 0.0722 * adjusted[2];
}

export function contrastRatio(first: string, second: string) {
  const values = [normalizeHex(first), normalizeHex(second)];
  if (values.some((value) => !value)) return 0;
  const [light, dark] = values.map((value) => luminance(value!)).sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** Color de texto legible sobre `background`, para etiquetas sobre un color elegido. */
export function readableOn(background: string) {
  return contrastRatio('#111111', background) >= contrastRatio('#FFFFFF', background) ? '#111111' : '#FFFFFF';
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function mix(hexA: string, hexB: string, weight: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mixed = a.map((channel, index) => Math.round(channel * weight + b[index] * (1 - weight)));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * Espejo de `catalog.derive_tokens` del backend: da una vista previa correcta
 * de los tokens que no tienen campo propio mientras se editan los colores, sin
 * esperar a que el guardado devuelva los valores definitivos.
 */
export function deriveTokens(background: string, primary: string, text: string): Omit<ThemeTokens, 'background' | 'primary' | 'accent' | 'text'> {
  return {
    surface: background,
    muted: mix(text, background, 0.65),
    price: text,
    category_title: text,
    nav_chip_bg: primary,
    nav_chip_text: text,
  };
}

/**
 * Los 10 colores con los que se dibuja, vengan de donde vengan.
 *
 * Los 4 planos son las columnas reales de la base y mandan siempre; el resto
 * sale de `tokens` (que el servidor ya resolvió) y, si todavía no llegó, de
 * derivarlos igual que lo haría el backend.
 */
export function resolveTokens(theme: MenuTheme): ThemeTokens {
  return {
    ...deriveTokens(theme.background_color, theme.primary_color, theme.text_color),
    ...(theme.tokens ?? {}),
    background: theme.background_color,
    primary: theme.primary_color,
    accent: theme.accent_color,
    text: theme.text_color,
  };
}

/**
 * Repite las reglas que aplica el servidor. Sin esto el usuario sólo se entera
 * de que dos colores no contrastan cuando falla el guardado, con todo el resto
 * de la personalización ya escrita.
 */
export function validateTheme(theme: MenuTheme) {
  const errors: Partial<Record<ThemeColor | 'contrast', string>> = {};
  COLOR_FIELDS.forEach(({ key }) => { if (!normalizeHex(theme[key])) errors[key] = i18n.t("Usa un color hexadecimal válido."); });
  const tokens = resolveTokens(theme);
  if (!errors.text_color && !errors.background_color && contrastRatio(theme.text_color, theme.background_color) < 4.5) {
    errors.contrast = i18n.t("El texto no contrasta lo suficiente con el fondo.");
  } else if (contrastRatio(tokens.nav_chip_text, tokens.nav_chip_bg) < 4.5) {
    // Se mide el par que de verdad se dibuja —el chip de categoría activo—, y
    // no texto contra color principal: con `nav_chip_text` aparte, una paleta
    // oscura puede usar texto claro en general y oscuro sólo sobre el chip.
    errors.contrast = i18n.t("El texto del filtro activo no contrasta lo suficiente con su fondo.");
  }
  return errors;
}

export function normalizeConfiguration(configuration?: Partial<TemplateConfig> | null): TemplateConfig {
  // No se valida la clave contra una lista local: el servidor ya la validó al
  // guardarla, y rechazarla aquí haría que una plantilla nueva se viera como
  // "Moderna" hasta publicar una versión en las tiendas.
  const templateKey = configuration?.template_key || 'modern';
  const theme = { ...DEFAULT_THEME, ...(configuration?.theme ?? {}) };
  const splash = { ...DEFAULT_SPLASH, ...(configuration?.splash ?? {}) };
  return { template_key: templateKey, theme, splash };
}

/** Sólo los campos que el PATCH acepta: la URL de la bienvenida es de lectura. */
export function splashPayload(splash: MenuSplash) {
  return { enabled: splash.enabled, duration: splash.duration };
}

/** Sólo los campos que el PATCH acepta: las URLs de portada y fondo son de lectura. */
export function themePayload(theme: MenuTheme) {
  return {
    background_color: theme.background_color,
    primary_color: theme.primary_color,
    accent_color: theme.accent_color,
    text_color: theme.text_color,
    font_key: theme.font_key,
    show_cover: theme.show_cover,
    show_product_images: theme.show_product_images,
    background_opacity: theme.background_opacity,
    cover_focal_x: theme.cover_focal_x,
    cover_focal_y: theme.cover_focal_y,
    background_preset_key: theme.background_preset_key ?? null,
  };
}

/**
 * La paleta y los ajustes finos viajan al lado de `theme`, no dentro: el
 * backend los valida por separado (ver `THEME_FIELDS` en `template/services.py`).
 * Se manda uno u otro, nunca los dos: elegir paleta descarta los retoques a
 * mano, y retocar a mano deja de seguir la paleta.
 */
export function colorPayload(theme: MenuTheme) {
  return theme.color_preset_key
    ? { color_preset_key: theme.color_preset_key }
    : { theme_overrides: theme.theme_overrides ?? {} };
}
