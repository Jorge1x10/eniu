import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { ImageIcon } from '@/components/ui/icons';
import { fontFamilyFor } from '@/features/templates/menu-theme';
import { resolveMediaUrl } from '@/lib/api';
import type { Business, Catalogue, Category, MenuTheme, Product, TemplateKey } from '@/types/models';
import { useTranslation } from 'react-i18next';

/** Una imagen puede venir del carrete (`file://`) o de la API detrás del JWT. */
export type PreviewImage = { uri: string; headers?: Record<string, string> } | null;

type Section = { id: string; name: string; products: Product[] };

type Variant = {
  /** `business` usa el nombre del negocio; cualquier otro texto se usa tal cual. */
  eyebrow: 'business' | string;
  align: 'left' | 'center';
  titleSize: number;
  titleWeight: TextStyle['fontWeight'];
  italic?: boolean;
  uppercase?: boolean;
  columns: 1 | 2;
  navRounded: boolean;
  compactCover?: boolean;
  /** La web cae al nombre del negocio cuando el menú no tiene descripción. */
  subtitleFallback?: boolean;
  imageHeight: number;
  card: (accent: string, background: string) => ViewStyle;
  offsetShadow?: boolean;
};

const VARIANTS: Record<TemplateKey, Variant> = {
  modern: {
    eyebrow: 'business', align: 'left', titleSize: 24, titleWeight: '900', columns: 2, navRounded: true, imageHeight: 62,
    card: (_accent, background) => ({ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)', backgroundColor: background, overflow: 'hidden' }),
  },
  minimal: {
    eyebrow: 'business', align: 'left', titleSize: 19, titleWeight: '600', columns: 1, navRounded: false, compactCover: true, imageHeight: 44,
    card: () => ({ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.18)', paddingBottom: 11 }),
  },
  elegant: {
    eyebrow: 'business', align: 'center', titleSize: 23, titleWeight: '400', italic: true, columns: 1, navRounded: false, imageHeight: 84,
    card: (accent) => ({ borderWidth: 1, borderColor: accent, padding: 9 }),
  },
  bistro: {
    subtitleFallback: true, eyebrow: 'Selección de la casa', align: 'left', titleSize: 23, titleWeight: '900', columns: 1, navRounded: true, imageHeight: 66,
    card: (accent, background) => ({ borderRadius: 9, borderLeftWidth: 4, borderLeftColor: accent, backgroundColor: background, padding: 10 }),
  },
  bold: {
    subtitleFallback: true, eyebrow: 'Sabor sin límites', align: 'left', titleSize: 24, titleWeight: '900', uppercase: true, columns: 2, navRounded: true, imageHeight: 56, offsetShadow: true,
    card: (accent, background) => ({ borderWidth: 2, borderColor: accent, backgroundColor: background, padding: 8 }),
  },
  natural: {
    subtitleFallback: true, eyebrow: 'Ingredientes y origen', align: 'center', titleSize: 23, titleWeight: '800', columns: 1, navRounded: true, imageHeight: 70,
    card: (_accent, background) => ({ borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.14)', backgroundColor: background, padding: 11, overflow: 'hidden' }),
  },
  retro: {
    subtitleFallback: true, eyebrow: 'Clásicos favoritos', align: 'center', titleSize: 22, titleWeight: '900', uppercase: true, columns: 2, navRounded: true, imageHeight: 56,
    card: (accent, background) => ({ borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: accent, backgroundColor: background, padding: 8 }),
  },
  luxury: {
    subtitleFallback: true, eyebrow: 'Una experiencia especial', align: 'center', titleSize: 23, titleWeight: '700', columns: 1, navRounded: false, imageHeight: 90,
    card: () => ({ borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.30)', paddingVertical: 11 }),
  },
};

function buildSections(categories: Category[], products: Product[]): Section[] {
  const sections = categories.map((category) => ({ id: category.id, name: category.name, products: products.filter((product) => product.category_id === category.id) }));
  const rest = products.filter((product) => !product.category_id);
  return rest.length ? [...sections, { id: 'other', name: 'Otros', products: rest }] : sections;
}

function mainImage(product: Product) {
  const pictures = product.pictures ?? [];
  return resolveMediaUrl((pictures.find((picture) => picture.is_default) ?? pictures[0])?.url);
}

type Props = {
  templateKey: TemplateKey;
  theme: MenuTheme;
  business?: Business | null;
  catalogue: Pick<Catalogue, 'name' | 'description'>;
  categories: Category[];
  products: Product[];
  cover?: PreviewImage;
  background?: PreviewImage;
  currency: Intl.NumberFormat;
  showEniuBadge?: boolean;
};

/**
 * Reproduce en React Native la plantilla que el cliente ve en el navegador.
 *
 * Antes esta pantalla mostraba un recuadro con los cuatro colores, así que
 * cambiar de plantilla no se notaba en el teléfono: era justo lo único que la
 * vista previa no enseñaba.
 */
export function MenuPreview({ templateKey, theme, business, catalogue, categories, products, cover, background, currency, showEniuBadge = false }: Props) {
  const { t } = useTranslation();

  const variant = VARIANTS[templateKey];
  const fontFamily = fontFamilyFor(theme.font_key, templateKey);
  const text = theme.text_color;
  const sections = buildSections(categories, products);
  const [selected, setSelected] = useState('all');
  const active = selected !== 'all' && !sections.some((section) => section.id === selected) ? 'all' : selected;
  const visible = active === 'all' ? sections : sections.filter((section) => section.id === active);
  const eyebrow = variant.eyebrow === 'business' ? business?.name || t("Tu negocio") : variant.eyebrow;
  const subtitle = catalogue.description || (variant.subtitleFallback ? business?.name : null);

  return (
    // `flexGrow` y no `flex`: así llena el marco del teléfono cuando el menú es
    // corto y crece con el contenido dentro del ScrollView de pantalla completa.
    <View style={{ flexGrow: 1, backgroundColor: theme.background_color }}>
      {background ? <Image source={background} style={[StyleSheet.absoluteFill, { opacity: theme.background_opacity }]} contentFit="cover" transition={150} /> : null}

      {theme.show_cover ? (
        cover ? (
          <View style={{ height: variant.compactCover ? 62 : 108 }}>
            <Image source={cover} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
          </View>
        ) : (
          <View style={{ height: variant.compactCover ? 48 : 74, backgroundColor: theme.primary_color, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: 0.85 }}>
            <ImageIcon color={text} size={18} />
            <Text numberOfLines={1} style={{ color: text, fontSize: 12.5, fontWeight: '700', fontFamily, maxWidth: '70%' }}>{business?.name || t("Tu negocio")}</Text>
          </View>
        )
      ) : null}

      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, alignItems: variant.align === 'center' ? 'center' : 'flex-start' }}>
        <Text numberOfLines={1} style={{ color: text, opacity: 0.6, fontSize: 9, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', fontFamily, textAlign: variant.align }}>{eyebrow}</Text>
        {variant.align === 'center' ? <View style={{ height: 1, width: 34, backgroundColor: theme.accent_color, marginVertical: 8 }} /> : null}
        <Text style={{ color: text, fontSize: variant.titleSize, fontWeight: variant.titleWeight, fontFamily, fontStyle: variant.italic ? 'italic' : 'normal', textTransform: variant.uppercase ? 'uppercase' : 'none', marginTop: variant.align === 'center' ? 0 : 4, textAlign: variant.align }}>{catalogue.name}</Text>
        {subtitle ? <Text numberOfLines={2} style={{ color: text, opacity: 0.68, fontSize: 11.5, lineHeight: 17, marginTop: 6, fontFamily, textAlign: variant.align }}>{subtitle}</Text> : null}
      </View>

      {sections.length ? (
        // Sin `flexShrink: 0` esta barra desaparece: el estilo base de un
        // ScrollView horizontal la deja encoger, y dentro del marco de altura
        // fija es lo único que cede cuando el menú no cabe entero.
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingBottom: 12 }}>
          {[{ id: 'all', name: t("Todo") }, ...sections].map((section) => {
            const on = active === section.id;
            return (
              <Pressable key={section.id} onPress={() => setSelected(section.id)} style={{ minHeight: 28, justifyContent: 'center', paddingHorizontal: 12, borderRadius: variant.navRounded ? 999 : 0, backgroundColor: on ? theme.primary_color : 'transparent', borderBottomWidth: variant.navRounded ? 0 : 2, borderColor: on ? theme.accent_color : 'transparent' }}>
                <Text style={{ color: text, opacity: on ? 1 : 0.65, fontSize: 11, fontWeight: '700', fontFamily }}>{section.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {!products.length ? (
        <View style={{ margin: 20, padding: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: text, borderRadius: 10, opacity: 0.6 }}>
          <Text style={{ color: text, fontSize: 11.5, textAlign: 'center', fontFamily }}>{t("Los productos aparecerán aquí cuando los agregues.")}</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 20 }}>
          {visible.map((section) => (
            <View key={section.id} style={{ gap: 10 }}>
              <Text style={{ color: text, fontSize: 15, fontWeight: '800', fontFamily, fontStyle: variant.italic ? 'italic' : 'normal', textAlign: variant.align }}>{section.name}</Text>
              {/* `flexWrap` sólo en dos columnas: envolviendo una columna, Yoga
                  reparte las tarjetas en columnas del ancho de su contenido y
                  cada producto se encogía en vez de ocupar todo el ancho. */}
              <View style={{ flexDirection: variant.columns === 2 ? 'row' : 'column', flexWrap: variant.columns === 2 ? 'wrap' : 'nowrap', gap: 10 }}>
                {section.products.map((product) => <PreviewProduct key={product.id} product={product} variant={variant} theme={theme} fontFamily={fontFamily} currency={currency} />)}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* La marca sólo va en el plan gratuito, igual que en el menú publicado. */}
      {showEniuBadge ? <Text style={{ color: text, opacity: 0.55, fontSize: 9, textAlign: 'center', paddingVertical: 22, fontFamily }}>{t("Menú creado con ENIU")}</Text> : null}
    </View>
  );
}

function PreviewProduct({ product, variant, theme, fontFamily, currency }: { product: Product; variant: Variant; theme: MenuTheme; fontFamily?: string; currency: Intl.NumberFormat }) {
  const { t } = useTranslation();

  const text = theme.text_color;
  const uri = mainImage(product);
  const price = product.price == null ? 'Consultar' : currency.format(Number(product.price));
  // En dos columnas y en las plantillas de foto grande la imagen va arriba;
  // en las de lista va como miniatura al lado del nombre.
  const stacked = variant.columns === 2 || variant.imageHeight > 60;
  const column = variant.columns === 2 ? { flexBasis: '47%' as const, flexGrow: 1, minWidth: 0 } : null;

  const card = (
    <View style={[{ opacity: product.is_available ? 1 : 0.6 }, variant.card(theme.accent_color, theme.background_color), variant.offsetShadow ? null : column]}>
      {theme.show_product_images && stacked ? (
        uri
          ? <Image source={{ uri }} style={{ width: '100%', height: variant.imageHeight, marginBottom: 8 }} contentFit="cover" transition={150} />
          : <View style={{ width: '100%', height: variant.imageHeight, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: text, opacity: 0.45, fontSize: 9, fontFamily }}>{t("Sin imagen")}</Text></View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
        {theme.show_product_images && !stacked && uri ? <Image source={{ uri }} style={{ width: variant.imageHeight, height: variant.imageHeight, borderRadius: 8 }} contentFit="cover" transition={150} /> : null}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={2} style={{ color: text, fontSize: 12.5, fontWeight: '800', fontFamily, fontStyle: variant.italic ? 'italic' : 'normal' }}>{product.name}</Text>
          {product.description ? <Text numberOfLines={2} style={{ color: text, opacity: 0.65, fontSize: 10.5, lineHeight: 15, fontFamily }}>{product.description}</Text> : null}
          {product.is_available ? null : <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: text, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 }}><Text style={{ color: text, fontSize: 8, fontWeight: '800', fontFamily }}>{t("Agotado")}</Text></View>}
          {variant.columns === 2 ? <Text style={{ color: text, fontSize: 12, fontWeight: '900', fontFamily, marginTop: 4 }}>{price}</Text> : null}
        </View>
        {variant.columns === 1 ? <Text style={{ color: text, fontSize: 12, fontWeight: '800', fontFamily, flexShrink: 0 }}>{price}</Text> : null}
      </View>
    </View>
  );

  // «Impactante» lleva una sombra dura desplazada, que en React Native se
  // dibuja con un bloque detrás de la tarjeta en lugar de con `shadow*`. El
  // bloque sobresale hacia el hueco entre tarjetas, sin margen propio: con
  // margen las dos columnas ya no cabían y el diseño se caía a una sola.
  if (!variant.offsetShadow) return card;
  return (
    <View style={column}>
      <View style={{ position: 'absolute', left: 5, top: 5, right: -5, bottom: -5, backgroundColor: theme.accent_color }} />
      {card}
    </View>
  );
}
