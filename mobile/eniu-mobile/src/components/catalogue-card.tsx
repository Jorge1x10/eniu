import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChevronRightIcon } from '@/components/ui/icons';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { api } from '@/lib/api';
import type { Catalogue, Category, Product } from '@/types/models';

/** Miniatura de 60×76: una hoja con renglones. Oscura en claro y crema en oscuro. */
export function MenuThumbnail({ width = 60, height = 76 }: { width?: number; height?: number }) {
  const isDark = useColorScheme() === 'dark';
  const theme = useEniuTheme();
  const paper = isDark ? theme.ticketPaper : theme.authHero;
  const line = isDark ? 'rgba(17,17,17,0.18)' : 'rgba(251,247,236,0.22)';
  return (
    <View accessible={false} style={{ width, height, borderRadius: 10, borderCurve: 'continuous', backgroundColor: paper, padding: 9, gap: 6 }}>
      <View style={{ width: '55%', height: 5, borderRadius: 99, backgroundColor: theme.yellow }} />
      {[0.9, 0.7, 0.85, 0.6, 0.75].map((size, index) => (
        <View key={index} style={{ width: `${size * 100}%`, height: 3, borderRadius: 99, backgroundColor: line }} />
      ))}
    </View>
  );
}

/** "7 productos · 2 categorías", con los endpoints que ya existen (y su caché). */
export function useCatalogueCounts(businessId: string | undefined, catalogueId: string) {
  const base = `businesses/${businessId}/catalogues/${catalogueId}`;
  const products = useQuery({ queryKey: ['products', businessId, catalogueId] as const, queryFn: () => api.get<{ products: Product[] }>(`${base}/products`), enabled: Boolean(businessId) });
  const categories = useQuery({ queryKey: ['categories', businessId, catalogueId] as const, queryFn: () => api.get<{ categories: Category[] }>(`${base}/categories`), enabled: Boolean(businessId) });
  return { products: products.data?.products.length, categories: categories.data?.categories.length };
}

export function countsLabel(t: (key: string, options?: Record<string, unknown>) => string, products?: number, categories?: number) {
  if (products === undefined || categories === undefined) return '';
  const productText = products === 1 ? t("1 producto") : t("{{count}} productos", { count: products });
  const categoryText = categories === 1 ? t("1 categoría") : t("{{count}} categorías", { count: categories });
  return `${productText} · ${categoryText}`;
}

export function CatalogueCard({ catalogue, businessId }: { catalogue: Catalogue; businessId?: string }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const counts = useCatalogueCounts(businessId, catalogue.id);
  const status = catalogue.is_published ? t("Publicado") : t("Borrador");
  return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/(tabs)/(menus)/[catalogueId]', params: { catalogueId: catalogue.id } })}
        accessibilityLabel={`${catalogue.name}, ${status}. ${countsLabel(t, counts.products, counts.categories)}`}
        style={({ pressed }) => ({ ...cardStyle(theme, 22), flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, opacity: pressed ? 0.75 : 1 })}
      >
        <MenuThumbnail />
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{catalogue.name}</Text>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: catalogue.is_published ? 'rgba(22,128,58,0.12)' : theme.surfaceAlt }}>
            <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: catalogue.is_published ? theme.success : theme.muted }} />
            <Text style={{ color: catalogue.is_published ? theme.success : theme.muted, fontSize: 12, fontWeight: '800' }}>{status}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13 }}>{countsLabel(t, counts.products, counts.categories) || ' '}</Text>
        </View>
        <ChevronRightIcon color={theme.muted} size={12} />
      </Pressable>
  );
}
