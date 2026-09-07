import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { ThemeTokens } from '@/types/models';

/**
 * Catálogo de plantillas servido por el backend (`GET /api/templates`).
 *
 * Se descarga en vez de cablearse para que agregar una plantilla, una paleta o
 * una tipografía no obligue a publicar una versión nueva en las tiendas —que
 * es justo lo que pasaba antes, con las listas escritas a mano aquí y en la
 * web, ya desincronizadas entre sí.
 */
export type CatalogLayout = { key: string; name: string; description: string };
export type CatalogPalette = { key: string; name: string; tokens: ThemeTokens };
export type CatalogFont = { key: string; name: string };
export type CatalogColorToken = { key: string; label: string; hint: string };
/**
 * Los patrones de fondo son gradientes CSS, que sólo el menú web sabe dibujar.
 * La app los ofrece y los guarda igual, pero su vista previa no puede
 * reproducirlos (ver `BackgroundPresetPicker`): `css` y `size` viajan para no
 * perder información, no para pintarse aquí.
 */
export type CatalogBackground = { key: string; name: string; description: string; css: string; size: string };

export type TemplateCatalog = {
  layouts: CatalogLayout[];
  palettes: CatalogPalette[];
  fonts: CatalogFont[];
  color_tokens: CatalogColorToken[];
  backgrounds: CatalogBackground[];
};

/**
 * Espejo mínimo del catálogo para cuando la petición aún no llegó o falló.
 *
 * No pretende estar completo —la lista buena es la del servidor—; sólo evita
 * que la pantalla de plantillas se quede vacía y sin poder guardar nada.
 */
export const FALLBACK_CATALOG: TemplateCatalog = {
  layouts: [
    { key: 'modern', name: 'Moderna', description: 'Tarjetas visuales y navegación redondeada.' },
    { key: 'minimal', name: 'Minimalista', description: 'Lectura rápida y filas limpias.' },
    { key: 'elegant', name: 'Elegante', description: 'Composición editorial con más aire.' },
  ],
  palettes: [
    {
      key: 'classic',
      name: 'Clásico Eniu',
      tokens: {
        background: '#FFFDF5', primary: '#FFE05A', accent: '#E8C93D', text: '#111111',
        surface: '#FFFDF5', muted: '#6B6B6B', price: '#111111', category_title: '#111111',
        nav_chip_bg: '#FFE05A', nav_chip_text: '#111111',
      },
    },
  ],
  fonts: [{ key: 'inter', name: 'Inter' }],
  color_tokens: [],
  backgrounds: [],
};

export const templateCatalogKey = ['template-catalog'] as const;

export function useTemplateCatalog() {
  const query = useQuery({
    queryKey: templateCatalogKey,
    queryFn: () => api.get<TemplateCatalog>('templates'),
    // El catálogo sólo cambia cuando se despliega backend nuevo: no tiene
    // sentido volver a pedirlo cada vez que se abre la pantalla.
    staleTime: 1000 * 60 * 60,
  });
  return { catalog: query.data ?? FALLBACK_CATALOG, isLoading: query.isLoading };
}

/** Tokens de la paleta indicada, o los de la primera del catálogo. */
export function paletteTokens(catalog: TemplateCatalog, key?: string | null): ThemeTokens {
  const palette = catalog.palettes.find((item) => item.key === key) ?? catalog.palettes[0];
  return palette?.tokens ?? FALLBACK_CATALOG.palettes[0].tokens;
}
