// Espejo de la paleta "classic" del backend (`template/catalog.py`). Sirve de
// respaldo mientras el catálogo real (`/api/templates`) no ha llegado, o para
// cualquier configuración guardada antes de que las paletas existieran.
export const CLASSIC_PALETTE_TOKENS = Object.freeze({
  background: "#FFFDF5", primary: "#FFE05A", accent: "#E8C93D", text: "#111111",
  surface: "#FFFDF5", muted: "#6B6B6B", price: "#111111", category_title: "#111111",
  nav_chip_bg: "#FFE05A", nav_chip_text: "#111111",
});

export const DEFAULT_THEME = Object.freeze({
  background_color: "#FFFDF5",
  primary_color: "#FFE05A",
  accent_color: "#E8C93D",
  text_color: "#111111",
  font_key: "inter",
  show_cover: true,
  show_product_images: true,
  cover_image_url: null,
  background_image_url: null,
  background_opacity: 0.2,
  color_preset_key: "classic",
  theme_overrides: {},
  tokens: CLASSIC_PALETTE_TOKENS,
  cover_focal_x: 0.5,
  cover_focal_y: 0.5,
  background_preset_key: null,
});

export const DEFAULT_SPLASH = Object.freeze({
  enabled: false,
  duration: 2.5,
  image_url: null,
});

export const SPLASH_RANGE = Object.freeze({ min: 1, max: 4, step: 0.5 });

export const DEFAULT_TEMPLATE = "modern";

export const FONT_REGISTRY = Object.freeze({
  inter: { label: "Inter", family: 'Inter, Arial, sans-serif' },
  poppins: { label: "Poppins", family: 'Poppins, Arial, sans-serif' },
  montserrat: { label: "Montserrat", family: 'Montserrat, Arial, sans-serif' },
  playfair: { label: "Playfair Display", family: '"Playfair Display", Georgia, serif' },
  lora: { label: "Lora", family: 'Lora, Georgia, serif' },
  // Sans-serif adicionales.
  roboto: { label: "Roboto", family: 'Roboto, Arial, sans-serif' },
  open_sans: { label: "Open Sans", family: '"Open Sans", Arial, sans-serif' },
  nunito: { label: "Nunito", family: 'Nunito, Arial, sans-serif' },
  raleway: { label: "Raleway", family: 'Raleway, Arial, sans-serif' },
  work_sans: { label: "Work Sans", family: '"Work Sans", Arial, sans-serif' },
  rubik: { label: "Rubik", family: 'Rubik, Arial, sans-serif' },
  karla: { label: "Karla", family: 'Karla, Arial, sans-serif' },
  manrope: { label: "Manrope", family: 'Manrope, Arial, sans-serif' },
  sora: { label: "Sora", family: 'Sora, Arial, sans-serif' },
  space_grotesk: { label: "Space Grotesk", family: '"Space Grotesk", Arial, sans-serif' },
  barlow: { label: "Barlow", family: 'Barlow, Arial, sans-serif' },
  archivo: { label: "Archivo", family: 'Archivo, Arial, sans-serif' },
  // Serif — tono editorial/elegante.
  merriweather: { label: "Merriweather", family: 'Merriweather, Georgia, serif' },
  libre_baskerville: { label: "Libre Baskerville", family: '"Libre Baskerville", Georgia, serif' },
  crimson_text: { label: "Crimson Text", family: '"Crimson Text", Georgia, serif' },
  pt_serif: { label: "PT Serif", family: '"PT Serif", Georgia, serif' },
  cormorant: { label: "Cormorant", family: 'Cormorant, Georgia, serif' },
  fraunces: { label: "Fraunces", family: 'Fraunces, Georgia, serif' },
  dm_serif_display: { label: "DM Serif Display", family: '"DM Serif Display", Georgia, serif' },
  bitter: { label: "Bitter", family: 'Bitter, Georgia, serif' },
  // Display — titulares con personalidad.
  bebas_neue: { label: "Bebas Neue", family: '"Bebas Neue", Impact, sans-serif' },
  oswald: { label: "Oswald", family: 'Oswald, Impact, sans-serif' },
  anton: { label: "Anton", family: 'Anton, Impact, sans-serif' },
  abril_fatface: { label: "Abril Fatface", family: '"Abril Fatface", Georgia, serif' },
  righteous: { label: "Righteous", family: 'Righteous, Impact, sans-serif' },
  // Manuscrita — el toque hecho-a-mano que le viene bien a Pizarra.
  pacifico: { label: "Pacifico", family: 'Pacifico, cursive' },
  dancing_script: { label: "Dancing Script", family: '"Dancing Script", cursive' },
  caveat: { label: "Caveat", family: 'Caveat, cursive' },
  // Monoespaciada — el aire de ticket que pide Recibo.
  jetbrains_mono: { label: "JetBrains Mono", family: '"JetBrains Mono", "Courier New", monospace' },
  space_mono: { label: "Space Mono", family: '"Space Mono", "Courier New", monospace' },
});

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function mix(hexA, hexB, weight) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mixed = a.map((channel, index) => Math.round(channel * weight + b[index] * (1 - weight)));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/**
 * Espejo de `catalog.derive_tokens` del backend (mismo patrón que
 * `themeValidation.js` ya usa para repetir el cálculo de contraste): da una
 * vista previa correcta de los tokens extra mientras se edita, antes de que
 * el guardado le pida al backend el valor final y autoritativo.
 */
export function deriveTokens(background, primary, accent, text) {
  return {
    surface: background,
    muted: mix(text, background, 0.65),
    price: text,
    category_title: text,
    nav_chip_bg: primary,
    nav_chip_text: text,
  };
}

// Mismas 13 claves que `catalog.LAYOUTS` en el backend — se repite aquí (y en
// `templateRegistry.js`) en vez de compartirse porque juntar los dos módulos
// crearía un import circular (`MenuTemplateRenderer` ya importa de este archivo).
const TEMPLATE_KEYS = [
  "modern", "minimal", "elegant", "bistro", "bold", "natural", "retro", "luxury",
  "chalkboard", "magazine", "sidebar", "receipt", "story",
];

export function normalizeConfiguration(configuration) {
  const templateKey = TEMPLATE_KEYS.includes(configuration?.template_key)
    ? configuration.template_key
    : DEFAULT_TEMPLATE;
  return {
    template_key: templateKey,
    theme: { ...DEFAULT_THEME, ...(configuration?.theme || {}) },
    splash: { ...DEFAULT_SPLASH, ...(configuration?.splash || {}) },
  };
}
