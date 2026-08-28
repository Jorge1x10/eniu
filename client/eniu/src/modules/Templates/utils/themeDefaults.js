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
});

export function normalizeConfiguration(configuration) {
  const templateKey = ["modern", "minimal", "elegant", "bistro", "bold", "natural", "retro", "luxury"].includes(configuration?.template_key)
    ? configuration.template_key
    : DEFAULT_TEMPLATE;
  return {
    template_key: templateKey,
    theme: { ...DEFAULT_THEME, ...(configuration?.theme || {}) },
    splash: { ...DEFAULT_SPLASH, ...(configuration?.splash || {}) },
  };
}
