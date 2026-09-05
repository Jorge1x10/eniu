export type PlanLimits = {
  max_businesses: number | null;
  max_catalogues_per_business: number | null;
  max_products_per_catalogue: number | null;
  /** null significa que el plan no restringe la lista. */
  layout_keys?: string[] | null;
  /** Alias histórico de `layout_keys`; el backend sigue mandando los dos. */
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
  /**
   * Quién cobra la suscripción: "stripe" (contratada en la web) o la tienda del
   * teléfono. La app no debe ofrecer comprar a quien ya paga por Stripe: la
   * compra se haría, Apple cobraría, y acabaría pagando dos veces.
   */
  provider?: string | null;
};

export type User = {
  id: string;
  name?: string | null;
  username: string;
  email: string;
  phone_number?: string | null;
  profile_picture?: string | null;
  auth_methods?: { password?: boolean; google?: boolean };
  // Idioma elegido por el usuario, no el del dispositivo: es lo que hace que
  // Eniu le hable igual aquí y en el panel web.
  language?: string;
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

/**
 * Las claves de plantilla y tipografía las define el backend
 * (`template/catalog.py`, servido en `GET /api/templates`). Aquí son `string` a
 * propósito: cerrarlas como unión literal obligaba a publicar una versión en
 * las tiendas cada vez que se agregaba una plantilla. La app valida contra el
 * catálogo que descarga, y al dibujar cae a `modern` si recibe una que todavía
 * no sabe pintar.
 */
export type TemplateKey = string;
export type FontKey = string;

/** Colores editables del menú; el resto del tema no se puede enviar al PATCH. */
export type ThemeColor = 'background_color' | 'primary_color' | 'accent_color' | 'text_color';

/**
 * Los 10 colores con los que se dibuja el menú. Los 4 primeros son los campos
 * planos de siempre; los otros 6 sólo existen dentro de una paleta o de los
 * ajustes avanzados, y por eso viajan aparte.
 */
export type ThemeTokens = {
  background: string;
  primary: string;
  accent: string;
  text: string;
  surface: string;
  muted: string;
  price: string;
  category_title: string;
  nav_chip_bg: string;
  nav_chip_text: string;
};

export type ThemeTokenKey = keyof ThemeTokens;

export type MenuTheme = {
  background_color: string;
  primary_color: string;
  accent_color: string;
  text_color: string;
  font_key: FontKey;
  show_cover: boolean;
  show_product_images: boolean;
  background_opacity: number;
  /** Punto focal de la portada (0-1). 0.5/0.5 es centrado. */
  cover_focal_x: number;
  cover_focal_y: number;
  /** Patrón de fondo elegido del catálogo; null = sin patrón. */
  background_preset_key?: string | null;
  /** Paleta curada elegida; null = colores a mano. */
  color_preset_key?: string | null;
  /** Los 10 tokens ya resueltos por el servidor, listos para dibujar. */
  tokens?: ThemeTokens;
  /** Sólo los tokens que el usuario tocó a mano, que es lo que se envía. */
  theme_overrides?: Partial<ThemeTokens>;
  /** Rutas relativas que sirve la API; sólo de lectura, no se envían de vuelta. */
  cover_image_url?: string | null;
  background_image_url?: string | null;
};

export type MenuSplash = {
  enabled: boolean;
  /** Segundos que la bienvenida tapa el menú antes de desvanecerse. */
  duration: number;
  image_url?: string | null;
};

export type TemplateConfig = { template_key: TemplateKey; theme: MenuTheme; splash: MenuSplash };

/**
 * Promoción: resalta productos en el menú ciertos días. No cambia precios —
 * sólo decide si hoy le pone una etiqueta a un producto.
 */
export type Promotion = {
  id: string;
  name: string;
  badge_label?: string | null;
  is_active: boolean;
  /** 0 = lunes … 6 = domingo. Vacío significa todos los días. */
  days_of_week: number[];
  start_date?: string | null;
  end_date?: string | null;
  product_ids: string[];
  category_ids: string[];
};

export type Analytics = {
  summary?: { menu_views?: { value?: number } };
  visits_over_time?: { date: string; views: number }[];
  sources?: { key: string; views: number }[];
};
