import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { ImageIcon } from '@/components/ui/icons';
import { MONOSPACE, fontFamilyFor, resolveTokens } from '@/features/templates/menu-theme';
import { resolveMediaUrl } from '@/lib/api';
import type { Business, Catalogue, Category, MenuTheme, Product, TemplateKey, ThemeTokens } from '@/types/models';
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
  /** Cómo se navegan las categorías: píldoras, subrayado, columna lateral o sin nada. */
  nav: 'pill' | 'underline' | 'sidebar' | 'none';
  compactCover?: boolean;
  /** La web cae al nombre del negocio cuando el menú no tiene descripción. */
  subtitleFallback?: boolean;
  imageHeight: number;
  card: (accent: string, surface: string) => ViewStyle;
  offsetShadow?: boolean;
  /** Pizarra y Recibo no llevan fotos: es parte de su composición, no un ajuste. */
  hideImages?: boolean;
  /** Recibo: todo en monoespaciada, como un ticket impreso. */
  mono?: boolean;
  /** Cómo se dibuja el precio cuando no es texto suelto. */
  price?: 'dashed-pill' | 'bordered' | 'leader';
  /** Revista: el primer producto de cada sección va a lo ancho y en grande. */
  featuredFirst?: boolean;
  /** Pizarra: el título va apenas torcido, como escrito a mano. */
  titleTilt?: boolean;
};

/**
 * Las 13 composiciones, con las mismas claves que `catalog.LAYOUTS` en el
 * backend. Si el servidor manda una que esta versión de la app todavía no sabe
 * pintar, `variantFor` cae a «Moderna» en vez de romperse.
 */
const VARIANTS: Record<string, Variant> = {
  modern: {
    eyebrow: 'business', align: 'left', titleSize: 24, titleWeight: '900', columns: 2, nav: 'pill', imageHeight: 62,
    card: (_accent, surface) => ({ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)', backgroundColor: surface, overflow: 'hidden' }),
  },
  minimal: {
    eyebrow: 'business', align: 'left', titleSize: 19, titleWeight: '600', columns: 1, nav: 'underline', compactCover: true, imageHeight: 44,
    card: () => ({ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.18)', paddingBottom: 11 }),
  },
  elegant: {
    eyebrow: 'business', align: 'center', titleSize: 23, titleWeight: '400', italic: true, columns: 1, nav: 'underline', imageHeight: 84,
    card: (accent) => ({ borderWidth: 1, borderColor: accent, padding: 9 }),
  },
  bistro: {
    subtitleFallback: true, eyebrow: 'Selección de la casa', align: 'left', titleSize: 23, titleWeight: '900', columns: 1, nav: 'pill', imageHeight: 66,
    card: (accent, surface) => ({ borderRadius: 9, borderLeftWidth: 4, borderLeftColor: accent, backgroundColor: surface, padding: 10 }),
  },
  bold: {
    subtitleFallback: true, eyebrow: 'Sabor sin límites', align: 'left', titleSize: 24, titleWeight: '900', uppercase: true, columns: 2, nav: 'pill', imageHeight: 56, offsetShadow: true,
    card: (accent, surface) => ({ borderWidth: 2, borderColor: accent, backgroundColor: surface, padding: 8 }),
  },
  natural: {
    subtitleFallback: true, eyebrow: 'Ingredientes y origen', align: 'center', titleSize: 23, titleWeight: '800', columns: 1, nav: 'pill', imageHeight: 70,
    card: (_accent, surface) => ({ borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.14)', backgroundColor: surface, padding: 11, overflow: 'hidden' }),
  },
  retro: {
    subtitleFallback: true, eyebrow: 'Clásicos favoritos', align: 'center', titleSize: 22, titleWeight: '900', uppercase: true, columns: 2, nav: 'pill', imageHeight: 56,
    card: (accent, surface) => ({ borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: accent, backgroundColor: surface, padding: 8 }),
  },
  luxury: {
    subtitleFallback: true, eyebrow: 'Una experiencia especial', align: 'center', titleSize: 23, titleWeight: '700', columns: 1, nav: 'underline', imageHeight: 90,
    card: () => ({ borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.30)', paddingVertical: 11 }),
  },
  chalkboard: {
    eyebrow: 'business', align: 'center', titleSize: 24, titleWeight: '900', italic: true, titleTilt: true, columns: 1, nav: 'pill',
    compactCover: true, hideImages: true, imageHeight: 0, price: 'dashed-pill',
    card: (accent, surface) => ({ borderRadius: 12, borderWidth: 3, borderStyle: 'dashed', borderColor: accent, backgroundColor: surface, padding: 12 }),
  },
  magazine: {
    eyebrow: 'Edición del chef', align: 'left', titleSize: 27, titleWeight: '900', uppercase: true, columns: 2, nav: 'pill',
    imageHeight: 58, featuredFirst: true,
    card: (_accent, surface) => ({ borderRadius: 14, backgroundColor: surface, overflow: 'hidden' }),
  },
  sidebar: {
    eyebrow: 'business', align: 'left', titleSize: 20, titleWeight: '600', columns: 1, nav: 'sidebar', compactCover: true, imageHeight: 40,
    card: () => ({ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.18)', paddingBottom: 9 }),
  },
  receipt: {
    eyebrow: 'Ticket del día', align: 'left', titleSize: 20, titleWeight: '600', columns: 1, nav: 'none',
    compactCover: true, hideImages: true, imageHeight: 0, mono: true, price: 'leader',
    card: () => ({}),
  },
  story: {
    eyebrow: 'Nuestra historia', align: 'center', titleSize: 23, titleWeight: '400', italic: true, columns: 1, nav: 'underline',
    imageHeight: 64, price: 'bordered',
    card: () => ({ paddingVertical: 12 }),
  },
};

function variantFor(templateKey: TemplateKey): Variant {
  return VARIANTS[templateKey] ?? VARIANTS.modern;
}

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

  const variant = variantFor(templateKey);
  const tokens = resolveTokens(theme);
  const baseFont = fontFamilyFor(theme.font_key, templateKey);
  const fontFamily = variant.mono ? MONOSPACE : baseFont;
  const text = tokens.text;
  const sections = buildSections(categories, products);
  const [selected, setSelected] = useState('all');
  const active = selected !== 'all' && !sections.some((section) => section.id === selected) ? 'all' : selected;
  const visible = active === 'all' || variant.nav === 'none' ? sections : sections.filter((section) => section.id === active);
  const eyebrow = variant.eyebrow === 'business' ? business?.name || t("Tu negocio") : t(variant.eyebrow);
  const subtitle = catalogue.description || (variant.subtitleFallback ? business?.name : null);
  const choices = [{ id: 'all', name: t("Todo") }, ...sections];

  const productList = (list: Product[]) => list.map((product, index) => (
    <PreviewProduct
      key={product.id}
      product={product}
      variant={variant}
      theme={theme}
      tokens={tokens}
      fontFamily={fontFamily}
      currency={currency}
      featured={Boolean(variant.featuredFirst) && index === 0}
    />
  ));

  return (
    // `flexGrow` y no `flex`: así llena el marco del teléfono cuando el menú es
    // corto y crece con el contenido dentro del ScrollView de pantalla completa.
    <View style={{ flexGrow: 1, backgroundColor: tokens.background }}>
      {background ? <Image source={background} style={[StyleSheet.absoluteFill, { opacity: theme.background_opacity }]} contentFit="cover" transition={150} /> : null}

      {theme.show_cover ? (
        cover ? (
          <View style={{ height: variant.compactCover ? 62 : 108 }}>
            {/* El punto focal decide qué parte de la foto queda visible dentro
                del recuadro, igual que `object-position` en la web. */}
            <Image
              source={cover}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              contentPosition={{ left: `${(theme.cover_focal_x ?? 0.5) * 100}%`, top: `${(theme.cover_focal_y ?? 0.5) * 100}%` }}
              transition={150}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
          </View>
        ) : (
          <View style={{ height: variant.compactCover ? 48 : 74, backgroundColor: tokens.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: 0.85 }}>
            {/* Sobre el color principal manda `nav_chip_text`, no el color de
                texto general: una paleta oscura usa texto claro en el menú y
                oscuro sólo encima del dorado. */}
            <ImageIcon color={tokens.nav_chip_text} size={18} />
            <Text numberOfLines={1} style={{ color: tokens.nav_chip_text, fontSize: 12.5, fontWeight: '700', fontFamily, maxWidth: '70%' }}>{business?.name || t("Tu negocio")}</Text>
          </View>
        )
      ) : null}

      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, alignItems: variant.align === 'center' ? 'center' : 'flex-start' }}>
        <Text numberOfLines={1} style={{ color: text, opacity: 0.6, fontSize: 9, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', fontFamily, textAlign: variant.align }}>{eyebrow}</Text>
        {variant.align === 'center' && !variant.titleTilt ? <View style={{ height: 1, width: 34, backgroundColor: tokens.accent, marginVertical: 8 }} /> : null}
        <Text
          style={{
            color: text, fontSize: variant.titleSize, fontWeight: variant.titleWeight, fontFamily,
            fontStyle: variant.italic ? 'italic' : 'normal', textTransform: variant.uppercase ? 'uppercase' : 'none',
            marginTop: variant.align === 'center' && !variant.titleTilt ? 0 : 4, textAlign: variant.align,
            transform: variant.titleTilt ? [{ rotate: '-1.5deg' }] : undefined,
          }}
        >
          {catalogue.name}
        </Text>
        {subtitle ? <Text numberOfLines={2} style={{ color: tokens.muted, fontSize: 11.5, lineHeight: 17, marginTop: 6, fontFamily, textAlign: variant.align }}>{subtitle}</Text> : null}
      </View>

      {/* «Recibo» no lleva navegación: es una lista corrida, como un ticket. */}
      {sections.length && variant.nav !== 'none' && variant.nav !== 'sidebar' ? (
        // Sin `flexShrink: 0` esta barra desaparece: el estilo base de un
        // ScrollView horizontal la deja encoger, y dentro del marco de altura
        // fija es lo único que cede cuando el menú no cabe entero.
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingBottom: 12 }}>
          {choices.map((section) => {
            const on = active === section.id;
            return (
              <Pressable key={section.id} onPress={() => setSelected(section.id)} style={{ minHeight: 28, justifyContent: 'center', paddingHorizontal: 12, borderRadius: variant.nav === 'pill' ? 999 : 0, backgroundColor: on ? tokens.nav_chip_bg : 'transparent', borderBottomWidth: variant.nav === 'pill' ? 0 : 2, borderColor: on ? tokens.accent : 'transparent' }}>
                <Text style={{ color: on ? tokens.nav_chip_text : text, opacity: on ? 1 : 0.65, fontSize: 11, fontWeight: '700', fontFamily }}>{section.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {!products.length ? (
        <View style={{ margin: 20, padding: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: text, borderRadius: 10, opacity: 0.6 }}>
          <Text style={{ color: text, fontSize: 11.5, textAlign: 'center', fontFamily }}>{t("Los productos aparecerán aquí cuando los agregues.")}</Text>
        </View>
      ) : variant.nav === 'sidebar' ? (
        // «Columnas»: las categorías viven en una columna fija a un lado, como
        // en la carta de un restaurante formal.
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
          <View style={{ width: 72, gap: 4, borderRightWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.18)', paddingRight: 8 }}>
            {choices.map((section) => {
              const on = active === section.id;
              return (
                <Pressable key={section.id} onPress={() => setSelected(section.id)} style={{ minHeight: 30, justifyContent: 'center', paddingHorizontal: 7, borderRadius: 8, backgroundColor: on ? tokens.nav_chip_bg : 'transparent' }}>
                  <Text numberOfLines={2} style={{ color: on ? tokens.nav_chip_text : text, opacity: on ? 1 : 0.7, fontSize: 10, fontWeight: '700', fontFamily }}>{section.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
            {visible.map((section) => (
              <View key={section.id} style={{ gap: 8 }}>
                <Text style={{ color: tokens.category_title, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily }}>{section.name}</Text>
                <View style={{ gap: 10 }}>{productList(section.products)}</View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 20 }}>
          {visible.map((section) => (
            <View key={section.id} style={{ gap: 10 }}>
              <Text style={{ color: tokens.category_title, fontSize: variant.mono ? 11 : 15, fontWeight: '800', fontFamily, fontStyle: variant.italic ? 'italic' : 'normal', textAlign: variant.align, letterSpacing: variant.mono ? 1.2 : 0, textTransform: variant.mono ? 'uppercase' : 'none' }}>{section.name}</Text>
              {/* `flexWrap` sólo en dos columnas: envolviendo una columna, Yoga
                  reparte las tarjetas en columnas del ancho de su contenido y
                  cada producto se encogía en vez de ocupar todo el ancho. */}
              <View style={{ flexDirection: variant.columns === 2 ? 'row' : 'column', flexWrap: variant.columns === 2 ? 'wrap' : 'nowrap', gap: variant.mono ? 0 : 10 }}>
                {productList(section.products)}
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

type ProductProps = {
  product: Product;
  variant: Variant;
  theme: MenuTheme;
  tokens: ThemeTokens;
  fontFamily?: string;
  currency: Intl.NumberFormat;
  featured?: boolean;
};

function PreviewProduct({ product, variant, theme, tokens, fontFamily, currency, featured = false }: ProductProps) {
  const { t } = useTranslation();

  const text = tokens.text;
  const uri = mainImage(product);
  const price = product.price == null ? t("Consultar") : currency.format(Number(product.price));
  const showImages = theme.show_product_images && !variant.hideImages;
  // En dos columnas y en las plantillas de foto grande la imagen va arriba;
  // en las de lista va como miniatura al lado del nombre.
  const stacked = variant.columns === 2 || variant.imageHeight > 60;
  const imageHeight = featured ? 96 : variant.imageHeight;
  // El destacado de «Revista» ocupa la fila entera; el resto reparte a dos.
  const column = variant.columns === 2 ? { flexBasis: featured ? ('100%' as const) : ('47%' as const), flexGrow: featured ? 0 : 1, minWidth: 0 } : null;

  // «Recibo» es una línea de ticket: nombre, puntitos y precio alineado.
  if (variant.price === 'leader') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingVertical: 5, opacity: product.is_available ? 1 : 0.5 }}>
        <Text numberOfLines={1} style={{ color: text, fontSize: 11.5, fontFamily, flexShrink: 1 }}>{product.name}</Text>
        <View style={{ flex: 1, minWidth: 8, borderBottomWidth: 1, borderStyle: 'dotted', borderColor: text, opacity: 0.4 }} />
        <Text style={{ color: tokens.price, fontSize: 11.5, fontWeight: '700', fontFamily }}>{price}</Text>
      </View>
    );
  }

  const priceLabel = variant.price === 'dashed-pill' ? (
    <View style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: tokens.accent, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ color: tokens.price, fontSize: 11.5, fontWeight: '900', fontStyle: 'italic', fontFamily }}>{price}</Text>
    </View>
  ) : variant.price === 'bordered' ? (
    <View style={{ borderWidth: 1, borderColor: tokens.accent, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ color: tokens.price, fontSize: 11.5, fontWeight: '700', fontFamily }}>{price}</Text>
    </View>
  ) : (
    <Text style={{ color: tokens.price, fontSize: 12, fontWeight: '800', fontFamily, flexShrink: 0 }}>{price}</Text>
  );

  const card = (
    <View style={[{ opacity: product.is_available ? 1 : 0.6 }, variant.card(tokens.accent, tokens.surface), variant.offsetShadow ? null : column]}>
      {showImages && stacked ? (
        uri
          ? <Image source={{ uri }} style={{ width: '100%', height: imageHeight, marginBottom: 8 }} contentFit="cover" transition={150} />
          : <View style={{ width: '100%', height: imageHeight, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: tokens.muted, fontSize: 9, fontFamily }}>{t("Sin imagen")}</Text></View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
        {showImages && !stacked && uri ? <Image source={{ uri }} style={{ width: variant.imageHeight, height: variant.imageHeight, borderRadius: 8 }} contentFit="cover" transition={150} /> : null}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={2} style={{ color: text, fontSize: featured ? 15 : 12.5, fontWeight: '800', fontFamily, fontStyle: variant.italic ? 'italic' : 'normal' }}>{product.name}</Text>
          {product.description ? <Text numberOfLines={2} style={{ color: tokens.muted, fontSize: 10.5, lineHeight: 15, fontFamily, fontStyle: variant.italic ? 'italic' : 'normal' }}>{product.description}</Text> : null}
          {product.is_available ? null : <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: text, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 }}><Text style={{ color: text, fontSize: 8, fontWeight: '800', fontFamily }}>{t("Agotado")}</Text></View>}
          {variant.columns === 2 ? <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>{priceLabel}</View> : null}
        </View>
        {variant.columns === 1 ? priceLabel : null}
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
      <View style={{ position: 'absolute', left: 5, top: 5, right: -5, bottom: -5, backgroundColor: tokens.accent }} />
      {card}
    </View>
  );
}
