export type User = {
  id: string;
  name?: string | null;
  username: string;
  email: string;
  phone_number?: string | null;
  profile_picture?: string | null;
  auth_methods?: { password?: boolean; google?: boolean };
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

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  image?: string | null;
  is_available: boolean;
  category_id?: string | null;
  category?: Category | null;
};

export type Analytics = {
  summary?: { menu_views?: { value?: number } };
  visits_over_time?: { date: string; views: number }[];
  sources?: { key: string; views: number }[];
};
