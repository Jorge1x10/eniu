export type PlanLimits = {
  max_businesses: number | null;
  max_catalogues_per_business: number | null;
  max_products_per_catalogue: number | null;
  /** null significa que el plan no restringe la lista. */
  template_keys: string[] | null;
  font_keys: string[] | null;
  allow_cover: boolean;
  allow_background: boolean;
  allow_product_images: boolean;
  allow_analytics: boolean;
  allow_splash: boolean;
  show_eniu_badge: boolean;
};

export type Plan = {
  key: string;
  name: string;
  status: string;
  has_access: boolean;
  cancel_at_period_end: boolean;
  current_period_end?: string | null;
  effective_key: string;
  limits: PlanLimits;
};

export type User = {
  id: string;
  name?: string | null;
  username: string;
  email: string;
  phone_number?: string | null;
  profile_picture?: string | null;
  auth_methods?: { password?: boolean; google?: boolean };
  plan?: Plan;
};

export type Business = {
  id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  currency?: string;
  timezone?: string;
  photo_url?: string | null;
};

export type Catalogue = {
  id: string;
  name: string;
  description?: string | null;
  is_published: boolean;
  public_slug?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Category = { id: string; name: string; description?: string | null };

/** Foto de producto tal como la devuelve la API: `url` puede venir relativa. */
export type ProductPicture = { id: string; url: string; is_default: boolean };

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  pictures?: ProductPicture[];
  is_available: boolean;
  category_id?: string | null;
  category?: Category | null;
};

export const TEMPLATE_KEYS = ['modern', 'minimal', 'elegant', 'bistro', 'bold', 'natural', 'retro', 'luxury'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const FONT_KEYS = ['inter', 'poppins', 'montserrat', 'playfair', 'lora'] as const;
export type FontKey = (typeof FONT_KEYS)[number];

/** Colores editables del menú; el resto del tema no se puede enviar al PATCH. */
export type ThemeColor = 'background_color' | 'primary_color' | 'accent_color' | 'text_color';

export type MenuTheme = {
  background_color: string;
  primary_color: string;
  accent_color: string;
  text_color: string;
  font_key: FontKey;
  show_cover: boolean;
  show_product_images: boolean;
  background_opacity: number;
  /** Rutas relativas que sirve la API; sólo de lectura, no se envían de vuelta. */
  cover_image_url?: string | null;
  background_image_url?: string | null;
};

export type TemplateConfig = { template_key: TemplateKey; theme: MenuTheme };

export type Analytics = {
  summary?: { menu_views?: { value?: number } };
  visits_over_time?: { date: string; views: number }[];
  sources?: { key: string; views: number }[];
};
