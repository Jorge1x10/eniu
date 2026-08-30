import { Platform } from 'react-native';

import { FONT_KEYS, TEMPLATE_KEYS, type FontKey, type MenuSplash, type MenuTheme, type TemplateConfig, type TemplateKey, type ThemeColor } from '@/types/models';
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
};

export const COLOR_FIELDS: { key: ThemeColor; label: string; hint: string }[] = [
  { key: 'background_color', label: 'Fondo', hint: 'El lienzo de todo el menú' },
  { key: 'primary_color', label: 'Principal', hint: 'Botones, filtros y portada' },
  { key: 'accent_color', label: 'Acento', hint: 'Bordes y separadores' },
  { key: 'text_color', label: 'Texto', hint: 'Títulos, precios y descripciones' },
];

export const TEMPLATE_OPTIONS: { key: TemplateKey; name: string; description: string }[] = [
  { key: 'modern', name: 'Moderna', description: 'Tarjetas visuales y navegación redondeada.' },
  { key: 'minimal', name: 'Minimalista', description: 'Lectura rápida y filas limpias.' },
  { key: 'elegant', name: 'Elegante', description: 'Composición editorial con más aire.' },
  { key: 'bistro', name: 'Bistró', description: 'Carta cálida con acentos laterales.' },
  { key: 'bold', name: 'Impactante', description: 'Bloques fuertes y bordes marcados.' },
  { key: 'natural', name: 'Natural', description: 'Formas orgánicas y tarjetas suaves.' },
  { key: 'retro', name: 'Retro', description: 'Marcos punteados y aire nostálgico.' },
  { key: 'luxury', name: 'Lujo', description: 'Presentación sobria y premium.' },
];

export const FONT_OPTIONS: { key: FontKey; label: string }[] = [
  { key: 'inter', label: 'Inter' },
  { key: 'poppins', label: 'Poppins' },
  { key: 'montserrat', label: 'Montserrat' },
  { key: 'playfair', label: 'Playfair Display' },
  { key: 'lora', label: 'Lora' },
];

/**
 * La app no empaqueta las tipografías del menú publicado, así que la vista
 * previa usa la familia del sistema más parecida: lo que el usuario necesita
 * distinguir aquí es si su menú se lee con serifas o sin ellas.
 */
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export function fontFamilyFor(fontKey: FontKey, templateKey?: TemplateKey) {
  if (fontKey === 'playfair' || fontKey === 'lora') return SERIF;
  // Igual que en la web: «Elegante» y «Lujo» ya son editoriales por definición,
  // y con la tipografía por defecto se muestran con serifas.
  if (fontKey === 'inter' && (templateKey === 'elegant' || templateKey === 'luxury')) return SERIF;
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

/**
 * Repite las reglas que aplica el servidor. Sin esto el usuario sólo se entera
 * de que dos colores no contrastan cuando falla el guardado, con todo el resto
 * de la personalización ya escrita.
 */
export function validateTheme(theme: MenuTheme) {
  const errors: Partial<Record<ThemeColor | 'contrast', string>> = {};
  COLOR_FIELDS.forEach(({ key }) => { if (!normalizeHex(theme[key])) errors[key] = i18n.t(i18n.t(i18n.t("Usa un color hexadecimal válido."))); });
  if (!errors.text_color && !errors.background_color && contrastRatio(theme.text_color, theme.background_color) < 4.5) {
    errors.contrast = i18n.t(i18n.t(i18n.t("El texto no contrasta lo suficiente con el fondo.")));
  } else if (!errors.text_color && !errors.primary_color && contrastRatio(theme.text_color, theme.primary_color) < 4.5) {
    errors.contrast = i18n.t(i18n.t(i18n.t("El texto no contrasta lo suficiente con el color principal.")));
  }
  return errors;
}

export function normalizeConfiguration(configuration?: Partial<TemplateConfig> | null): TemplateConfig {
  const templateKey = TEMPLATE_KEYS.includes(configuration?.template_key as TemplateKey) ? configuration!.template_key! : 'modern';
  const theme = { ...DEFAULT_THEME, ...(configuration?.theme ?? {}) };
  if (!FONT_KEYS.includes(theme.font_key)) theme.font_key = 'inter';
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
  };
}
