import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessPhotoField } from '@/components/business-photo';
import { Button } from '@/components/ui/button';
import { ColorField } from '@/components/ui/color-picker';
import { Feedback } from '@/components/ui/feedback';
import { CloseIcon, EyeIcon, LockIcon } from '@/components/ui/icons';
import { ImageField, ImageQualitySelector } from '@/components/ui/image-field';
import { PlanNotice } from '@/components/ui/plan-notice';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { Slider } from '@/components/ui/slider';
import { useEniuTheme } from '@/constants/eniu-theme';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { getCatalogue } from '@/features/catalogues/catalogue-api';
import { BackgroundPresetPicker } from '@/features/templates/background-preset-picker';
import { CoverFocalField } from '@/features/templates/cover-focal-field';
import { MenuPreview } from '@/features/templates/menu-preview';
import { PalettePicker } from '@/features/templates/palette-picker';
import { CORE_COLOR_FIELDS, CORE_TOKEN_KEYS, COLOR_FIELDS, SPLASH_RANGE, colorPayload, deriveTokens, normalizeConfiguration, resolveTokens, splashPayload, themePayload, validateTheme } from '@/features/templates/menu-theme';
import { useTemplateCatalog } from '@/features/templates/template-catalog';
import { api } from '@/lib/api';
import { appendImage, type ImageQuality, type PickedPicture } from '@/lib/image-file';
import { usePrivateImage } from '@/lib/private-image';
import type { Category, MenuSplash, MenuTheme, Product, TemplateConfig, TemplateKey, ThemeTokenKey } from '@/types/models';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n/formats';

function Section({ title, description, children }: React.PropsWithChildren<{ title: string; description?: string }>) {
  const theme = useEniuTheme();
  return (
    <View style={{ gap: 13, padding: 17, borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 16.5, fontWeight: '900' }}>{title}</Text>
        {description ? <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Miniatura que insinúa la composición de cada plantilla con los colores del menú. */
function TemplateThumb({ templateKey, theme }: { templateKey: TemplateKey; theme: MenuTheme }) {
  const line = { backgroundColor: theme.text_color, opacity: 0.35, height: 3, borderRadius: 2 } as const;
  const block = { backgroundColor: theme.primary_color, flex: 1, borderRadius: 3 } as const;
  const frame = { width: 52, height: 34, padding: 4, gap: 3, backgroundColor: theme.background_color, borderRadius: 6, overflow: 'hidden' } as const;
  if (templateKey === 'minimal') return <View style={frame}><View style={[line, { width: '70%', height: 4, opacity: 0.7 }]} /><View style={line} /><View style={line} /><View style={line} /></View>;
  if (templateKey === 'elegant' || templateKey === 'luxury') return <View style={[frame, { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.accent_color }]}><Text style={{ color: theme.text_color, fontSize: 13, fontStyle: 'italic' }}>Aa</Text></View>;
  if (templateKey === 'bistro') return <View style={[frame, { flexDirection: 'row' }]}><View style={{ width: 4, backgroundColor: theme.accent_color, borderRadius: 2 }} /><View style={{ flex: 1, gap: 3, justifyContent: 'center' }}><View style={[line, { width: '80%' }]} /><View style={[line, { width: '55%' }]} /></View></View>;
  if (templateKey === 'bold') return <View style={[frame, { flexDirection: 'row' }]}><View style={[block, { borderRadius: 0, borderWidth: 1.5, borderColor: theme.accent_color }]} /><View style={[block, { borderRadius: 0, borderWidth: 1.5, borderColor: theme.accent_color }]} /></View>;
  if (templateKey === 'retro') return <View style={[frame, { flexDirection: 'row', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.accent_color }]}><View style={block} /><View style={block} /></View>;
  if (templateKey === 'natural') return <View style={frame}><View style={{ flex: 1, backgroundColor: theme.primary_color, borderRadius: 12 }} /><View style={{ flex: 1, backgroundColor: theme.accent_color, borderRadius: 12, opacity: 0.6 }} /></View>;
  if (templateKey === 'chalkboard') return <View style={[frame, { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: theme.accent_color }]}><Text style={{ color: theme.text_color, fontSize: 12, fontStyle: 'italic', fontWeight: '900' }}>Aa</Text></View>;
  // Revista: un destacado a lo ancho arriba y dos columnas debajo.
  if (templateKey === 'magazine') return <View style={frame}><View style={{ flex: 1.4, backgroundColor: theme.primary_color, borderRadius: 3 }} /><View style={{ flex: 1, flexDirection: 'row', gap: 3 }}><View style={block} /><View style={block} /></View></View>;
  if (templateKey === 'sidebar') return <View style={[frame, { flexDirection: 'row' }]}><View style={{ width: 12, backgroundColor: theme.primary_color, borderRadius: 3 }} /><View style={{ flex: 1, gap: 3, justifyContent: 'center' }}><View style={[line, { width: '85%' }]} /><View style={[line, { width: '65%' }]} /><View style={[line, { width: '75%' }]} /></View></View>;
  if (templateKey === 'receipt') return <View style={[frame, { justifyContent: 'center', gap: 4 }]}>{[0, 1, 2].map((row) => <View key={row} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><View style={[line, { width: 12, height: 2 }]} /><View style={{ flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', borderColor: theme.text_color, opacity: 0.4 }} /><View style={[line, { width: 7, height: 2 }]} /></View>)}</View>;
  if (templateKey === 'story') return <View style={[frame, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}><View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: theme.primary_color }} /><View style={{ flex: 1, gap: 3 }}><View style={[line, { width: '80%' }]} /><View style={[line, { width: '60%' }]} /></View></View>;
  return <View style={[frame, { flexDirection: 'row' }]}><View style={block} /><View style={block} /></View>;
}

export default function TemplateScreen() {
  const { t } = useTranslation();

  const appTheme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const { limits, allowsTemplate, allowsFont } = usePlan();
  // Layouts, paletas, tipografías y fondos salen del backend: así una
  // plantilla nueva aparece en la app sin publicar una versión en las tiendas.
  const { catalog } = useTemplateCatalog();
  const templatesLocked = catalog.layouts.some((layout) => !allowsTemplate(layout.key));
  const fontsLocked = catalog.fonts.some((font) => !allowsFont(font.key));
  // Los 4 primeros tokens ya tienen su propio selector arriba (son las
  // columnas planas); aquí sólo van los que no tienen campo propio.
  const advancedTokens = catalog.color_tokens.filter((token) => !CORE_TOKEN_KEYS.has(token.key));
  const coverLocked = !limits.allow_cover;
  const backgroundLocked = !limits.allow_background;
  const splashLocked = !limits.allow_splash;
  const productImagesLocked = !limits.allow_product_images;
  const enabled = Boolean(selectedBusiness && catalogueId);
  const base = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}`;
  const key = ['template', selectedBusiness?.id, catalogueId] as const;

  const query = useQuery({ queryKey: key, queryFn: () => api.get<{ template: TemplateConfig }>(`${base}/template`), enabled });
  const catalogueQuery = useQuery({ queryKey: ['catalogue', selectedBusiness?.id, catalogueId], queryFn: () => getCatalogue(selectedBusiness!.id, catalogueId), enabled });
  const categoriesQuery = useQuery({ queryKey: ['categories', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ categories: Category[] }>(`${base}/categories`), enabled });
  const productsQuery = useQuery({ queryKey: ['products', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ products: Product[] }>(`${base}/products`), enabled });

  const [saved, setSaved] = useState<TemplateConfig | null>(null);
  const [draft, setDraft] = useState<TemplateConfig | null>(null);
  const [coverPicked, setCoverPicked] = useState<PickedPicture | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [backgroundPicked, setBackgroundPicked] = useState<PickedPicture | null>(null);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [splashPicked, setSplashPicked] = useState<PickedPicture | null>(null);
  const [removeSplash, setRemoveSplash] = useState(false);
  const [assetVersion, setAssetVersion] = useState(0);
  const [quality, setQuality] = useState<ImageQuality>('alta');
  const [expanded, setExpanded] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const task = setTimeout(() => {
      const configuration = query.data?.template ? normalizeConfiguration(query.data.template) : null;
      setSaved(configuration);
      setDraft(configuration);
    }, 0);
    return () => clearTimeout(task);
  }, [query.data?.template]);

  const storedCover = !removeCover && !coverPicked ? draft?.theme.cover_image_url : null;
  const storedBackground = !removeBackground && !backgroundPicked ? draft?.theme.background_image_url : null;
  const privateCover = usePrivateImage(storedCover, assetVersion);
  const storedSplash = !removeSplash && !splashPicked ? draft?.splash.image_url : null;
  const privateBackground = usePrivateImage(storedBackground, assetVersion);
  const privateSplash = usePrivateImage(storedSplash, assetVersion);
  const cover = coverPicked ? { uri: coverPicked.uri } : privateCover;
  const background = backgroundPicked ? { uri: backgroundPicked.uri } : privateBackground;
  const splash = splashPicked ? { uri: splashPicked.uri } : privateSplash;

  function updateTheme<K extends keyof MenuTheme>(field: K, value: MenuTheme[K]) {
    setDraft((current) => {
      if (!current) return current;
      const theme = { ...current.theme, [field]: value };
      // Tocar un color a mano es "quiero personalizarlo": deja de seguir a la
      // paleta, y los tokens sin campo propio (precio, superficie, chip…) se
      // recalculan para que la vista previa no se quede con los de la paleta
      // anterior mientras se sigue editando.
      if (CORE_COLOR_FIELDS.has(field as never)) {
        theme.color_preset_key = null;
        theme.tokens = {
          ...deriveTokens(theme.background_color, theme.primary_color, theme.text_color),
          background: theme.background_color, primary: theme.primary_color, accent: theme.accent_color, text: theme.text_color,
          ...(current.theme.theme_overrides ?? {}),
        };
      }
      return { ...current, theme };
    });
    setError(''); setSuccess('');
  }

  function choosePalette(key: string | null) {
    setDraft((current) => {
      if (!current) return current;
      // "Personalizado" parte de los colores que ya se veían: cambiar de
      // opinión sobre la paleta no debe borrar lo que la persona eligió.
      if (key === null) return { ...current, theme: { ...current.theme, color_preset_key: null } };
      const palette = catalog.palettes.find((item) => item.key === key);
      if (!palette) return current;
      return {
        ...current,
        theme: {
          ...current.theme,
          background_color: palette.tokens.background,
          primary_color: palette.tokens.primary,
          accent_color: palette.tokens.accent,
          text_color: palette.tokens.text,
          color_preset_key: key,
          theme_overrides: {},
          tokens: palette.tokens,
        },
      };
    });
    setError(''); setSuccess('');
  }

  function updateTokenOverride(tokenKey: ThemeTokenKey, value: string) {
    setDraft((current) => (current ? {
      ...current,
      theme: {
        ...current.theme,
        color_preset_key: null,
        theme_overrides: { ...(current.theme.theme_overrides ?? {}), [tokenKey]: value },
        tokens: { ...resolveTokens(current.theme), [tokenKey]: value },
      },
    } : current));
    setError(''); setSuccess('');
  }

  function updateFocalPoint(x: number, y: number) {
    setDraft((current) => (current ? { ...current, theme: { ...current.theme, cover_focal_x: x, cover_focal_y: y } } : current));
    setError(''); setSuccess('');
  }
  function updateTemplate(templateKey: TemplateKey) {
    setDraft((current) => (current ? { ...current, template_key: templateKey } : current));
    setError(''); setSuccess('');
  }
  function pickCover(picture: PickedPicture) {
    setCoverPicked(picture); setRemoveCover(false); setError(''); setSuccess('');
    // Subir una portada y dejarla oculta no tendría sentido.
    updateTheme('show_cover', true);
  }
  function dropCover() { setCoverPicked(null); setRemoveCover(true); setError(''); setSuccess(''); }
  function pickBackground(picture: PickedPicture) { setBackgroundPicked(picture); setRemoveBackground(false); setError(''); setSuccess(''); }
  function dropBackground() { setBackgroundPicked(null); setRemoveBackground(true); setError(''); setSuccess(''); }
  function updateSplash<K extends keyof MenuSplash>(field: K, value: MenuSplash[K]) {
    setDraft((current) => (current ? { ...current, splash: { ...current.splash, [field]: value } } : current));
    setError(''); setSuccess('');
  }
  function pickSplash(picture: PickedPicture) { setSplashPicked(picture); setRemoveSplash(false); setError(''); setSuccess(''); }
  function dropSplash() { setSplashPicked(null); setRemoveSplash(true); setError(''); setSuccess(''); }
  function discard() {
    setDraft(saved); setCoverPicked(null); setRemoveCover(false); setBackgroundPicked(null); setRemoveBackground(false);
    setSplashPicked(null); setRemoveSplash(false);
    setError(''); setSuccess('');
  }

  async function save() {
    if (!draft) return;
    const problems = validateTheme(draft.theme);
    const firstProblem = problems.contrast ?? COLOR_FIELDS.map(({ key: field }) => problems[field]).find(Boolean);
    if (firstProblem) { setError(firstProblem); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const theme = themePayload(draft.theme);
      const splashData = splashPayload(draft.splash);
      // La paleta y los retoques finos viajan al lado de `theme`, no dentro:
      // el backend los valida por separado.
      const colors = colorPayload(draft.theme);
      const touchesImages = Boolean(coverPicked || removeCover || backgroundPicked || removeBackground || splashPicked || removeSplash);
      let data: { template: TemplateConfig };
      if (touchesImages) {
        const form = new FormData();
        form.append('template_key', draft.template_key);
        form.append('theme', JSON.stringify(theme));
        form.append('splash', JSON.stringify(splashData));
        Object.entries(colors).forEach(([field, value]) => {
          form.append(field, typeof value === 'string' ? value : JSON.stringify(value));
        });
        form.append('remove_cover', String(removeCover));
        form.append('remove_background', String(removeBackground));
        form.append('remove_splash', String(removeSplash));
        if (coverPicked) appendImage(form, 'cover', coverPicked);
        if (backgroundPicked) appendImage(form, 'background', backgroundPicked);
        if (splashPicked) appendImage(form, 'splash', splashPicked);
        data = await api.patchForm<{ template: TemplateConfig }>(`${base}/template`, form);
      } else {
        data = await api.patch<{ template: TemplateConfig }>(`${base}/template`, { template_key: draft.template_key, theme, splash: splashData, ...colors });
      }
      const configuration = normalizeConfiguration(data.template);
      queryClient.setQueryData(key, { template: configuration });
      setSaved(configuration); setDraft(configuration);
      setCoverPicked(null); setRemoveCover(false); setBackgroundPicked(null); setRemoveBackground(false);
      setAssetVersion(Date.now());
      setSuccess(t("La personalización se guardó correctamente."));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar la plantilla."));
    } finally {
      setSaving(false);
    }
  }

  if (query.isLoading) return <LoadingState label={t("Cargando diseño…")} />;
  if (query.isError || !draft || !saved) return <ErrorState message={t("No pudimos cargar la plantilla.")} error={query.error} onRetry={() => query.refetch()} />;

  const problems = validateTheme(draft.theme);
  // Los 10 colores ya resueltos: lo que de verdad se dibuja, que es también lo
  // que deben mostrar los selectores de los ajustes avanzados.
  const draftTokens = resolveTokens(draft.theme);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft) || Boolean(coverPicked || removeCover || backgroundPicked || removeBackground || splashPicked || removeSplash);
  const catalogue = catalogueQuery.data?.catalogue ?? { name: t("Tu menú"), description: null };
  const categories = categoriesQuery.data?.categories ?? [];
  const products = productsQuery.data?.products ?? [];
  const currency = new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });
  const preview = { templateKey: draft.template_key, theme: draft.theme, business: selectedBusiness, catalogue, categories, products, cover, background, currency, showEniuBadge: limits.show_eniu_badge };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: appTheme.background }} contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {dirty ? <Text style={{ color: appTheme.yellowPressed, fontSize: 12.5, fontWeight: '800' }}>{t("Cambios sin guardar")}</Text> : <Text style={{ color: appTheme.muted, fontSize: 12.5 }}>{t("Todo guardado")}</Text>}
        </View>
        <Button variant="secondary" disabled={!dirty || saving} onPress={discard} style={{ paddingHorizontal: 14 }}>{t("Descartar")}</Button>
        <Button loading={saving} disabled={!dirty} onPress={save} style={{ paddingHorizontal: 18 }}>{t("Guardar")}</Button>
      </View>
      <Feedback message={error} /><Feedback message={success} tone="success" />
      {problems.contrast ? <Feedback message={t("{{error}} Ajústalo antes de guardar.", { error: problems.contrast })} /> : null}

      <View style={{ gap: 11, alignItems: 'center' }}>
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <EyeIcon color={appTheme.text} size={17} />
          <Text style={{ color: appTheme.text, fontSize: 16.5, fontWeight: '900', flex: 1 }}>{t("Vista previa")}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setExpanded(true)}><Text style={{ color: appTheme.yellowPressed, fontSize: 13, fontWeight: '800' }}>{t("Ampliar")}</Text></Pressable>
        </View>
        <View style={{ width: 296, borderRadius: 34, borderCurve: 'continuous', borderWidth: 8, borderColor: '#111111', backgroundColor: '#111111', overflow: 'hidden' }}>
          <View style={{ height: 452, overflow: 'hidden' }}><MenuPreview {...preview} /></View>
        </View>
        <Text style={{ color: appTheme.muted, fontSize: 11.5, textAlign: 'center' }}>{t("Así se ve el menú en el teléfono de tus clientes.")}</Text>
      </View>

      <Section title={t("Plantilla")} description={t("Define la composición del menú: tarjetas, listas o carta editorial.")}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
          {catalog.layouts.map((option) => {
            const on = draft.template_key === option.key;
            const locked = !allowsTemplate(option.key);
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: locked }}
                disabled={locked}
                onPress={() => updateTemplate(option.key)}
                style={({ pressed }) => ({ width: 152, padding: 12, gap: 8, borderRadius: 17, borderCurve: 'continuous', backgroundColor: on ? appTheme.surfaceAlt : appTheme.background, borderWidth: on ? 2 : 1, borderColor: on ? appTheme.yellowPressed : appTheme.border, opacity: locked ? 0.5 : pressed ? 0.75 : 1 })}
              >
                <TemplateThumb templateKey={option.key} theme={draft.theme} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {locked ? <LockIcon color={appTheme.muted} size={13} /> : null}
                  <Text style={{ color: appTheme.text, fontSize: 14, fontWeight: '800' }}>{t(option.name)}</Text>
                </View>
                <Text style={{ color: appTheme.muted, fontSize: 11, lineHeight: 16 }}>{t(option.description)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {templatesLocked ? <PlanNotice message={t("Tu plan actual sólo incluye la plantilla básica.")} /> : null}
      </Section>

      <Section title={t("Colores")} description={t("Empieza por una paleta lista o elige cada color a mano.")}>
        <PalettePicker palettes={catalog.palettes} value={draft.theme.color_preset_key} onChange={choosePalette} />
        {COLOR_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={t(field.label)}
            hint={t(field.hint)}
            value={draft.theme[field.key]}
            original={saved.theme[field.key]}
            error={problems[field.key]}
            onChange={(value) => updateTheme(field.key, value)}
          />
        ))}

        {advancedTokens.length ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: advancedOpen }}
              onPress={() => setAdvancedOpen((open) => !open)}
              style={({ pressed }) => ({ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, borderRadius: 13, borderCurve: 'continuous', borderWidth: 1, borderColor: appTheme.border, backgroundColor: appTheme.background, opacity: pressed ? 0.75 : 1 })}
            >
              <Text style={{ color: appTheme.text, fontSize: 13.5, fontWeight: '700' }}>{t("Colores avanzados")}</Text>
              <Text style={{ color: appTheme.muted, fontSize: 13, fontWeight: '700' }}>{advancedOpen ? '−' : '+'}</Text>
            </Pressable>
            {advancedOpen ? (
              <View style={{ gap: 13 }}>
                <Text style={{ color: appTheme.muted, fontSize: 11.5, lineHeight: 16 }}>{t("Colores de elementos específicos: precio, título de categoría y el filtro de categoría seleccionado.")}</Text>
                {advancedTokens.map((token) => (
                  <ColorField
                    key={token.key}
                    label={t(token.label)}
                    hint={t(token.hint)}
                    value={draftTokens[token.key as ThemeTokenKey]}
                    onChange={(value) => updateTokenOverride(token.key as ThemeTokenKey, value)}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </Section>

      <Section title={t("Tipografía")} description={t("La vista previa usa la fuente del sistema más parecida a la del menú publicado.")}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {catalog.fonts.map((option) => {
            const on = draft.theme.font_key === option.key;
            const locked = !allowsFont(option.key);
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: locked }}
                disabled={locked}
                onPress={() => updateTheme('font_key', option.key)}
                style={({ pressed }) => ({ minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, borderRadius: 999, backgroundColor: on ? appTheme.yellow : appTheme.background, borderWidth: 1, borderColor: on ? appTheme.yellowPressed : appTheme.border, opacity: locked ? 0.5 : pressed ? 0.75 : 1 })}
              >
                {locked ? <LockIcon color={appTheme.muted} size={12} /> : null}
                <Text style={{ color: on ? appTheme.onYellow : appTheme.text, fontSize: 13.5, fontWeight: on ? '800' : '600' }}>{option.name}</Text>
              </Pressable>
            );
          })}
        </View>
        {fontsLocked ? <PlanNotice message={t("Tu plan actual sólo incluye la tipografía básica.")} /> : null}
      </Section>

      <Section title={t("Imágenes del menú")} description={t("La foto del negocio te identifica; la portada encabeza el menú que ven tus clientes.")}>
        <ImageQualitySelector value={quality} onChange={setQuality} />
        <BusinessPhotoField quality={quality} onError={setError} />
        <View style={{ gap: 9 }}>
          <Text style={{ color: appTheme.text, fontSize: 13, fontWeight: '700' }}>{t("Portada del menú")}</Text>
          {coverLocked
            ? <PlanNotice message={t("Tu plan actual no incluye portada en el menú.")} />
            : <ImageField title="portada" emptyText={t("Sin portada")} source={cover} quality={quality} onPicked={pickCover} onRemove={dropCover} onError={setError} note="Se muestra arriba del menú. Se guarda al tocar «Guardar»." />}
        </View>
        {!coverLocked ? (
          <CoverFocalField
            source={cover}
            focalX={draft.theme.cover_focal_x ?? 0.5}
            focalY={draft.theme.cover_focal_y ?? 0.5}
            onChange={updateFocalPoint}
          />
        ) : null}
        {([['show_cover', t("Mostrar portada")], ['show_product_images', t("Mostrar imágenes de productos")]] as const).map(([field, label]) => {
          const locked = field === 'show_cover' ? coverLocked : productImagesLocked;
          return (
            <View key={field} style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: locked ? 0.5 : 1 }}>
              <Text style={{ color: appTheme.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
              <Switch value={draft.theme[field]} disabled={locked} onValueChange={(value) => updateTheme(field, value)} trackColor={{ true: appTheme.yellowPressed }} />
            </View>
          );
        })}
      </Section>

      <Section title={t("Fondo del menú")} description={t("La imagen queda detrás del contenido y no reemplaza la portada.")}>
        {backgroundLocked ? <PlanNotice message={t("Tu plan actual no incluye imagen de fondo en el menú.")} /> : null}
        <Text style={{ color: appTheme.text, fontSize: 13, fontWeight: '700' }}>{t("Fondo prediseñado")}</Text>
        <BackgroundPresetPicker
          backgrounds={catalog.backgrounds}
          value={draft.theme.background_preset_key}
          disabled={backgroundLocked}
          onChange={(key) => updateTheme('background_preset_key', key)}
        />
        <Text style={{ color: appTheme.text, fontSize: 13, fontWeight: '700' }}>{t("O sube tu propia imagen")}</Text>
        <ImageField title="fondo" emptyText={t("Sin imagen de fondo")} source={background} quality={quality} onPicked={pickBackground} onRemove={dropBackground} onError={setError} disabled={backgroundLocked} note="Baja la opacidad para que el texto siga leyéndose." />
        <Slider label={t("Opacidad del fondo")} value={draft.theme.background_opacity} disabled={backgroundLocked} onChange={(value) => updateTheme('background_opacity', value)} />
      </Section>

      <Section title={t("Pantalla de bienvenida")} description={t("Aparece unos segundos al abrir el menú y se desvanece sola. Un toque la cierra antes.")}>
        {splashLocked ? <PlanNotice message={t("Tu plan actual no incluye la pantalla de bienvenida del menú.")} /> : null}
        <View style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: splashLocked ? 0.5 : 1 }}>
          <Text style={{ color: appTheme.text, fontWeight: '700', fontSize: 14 }}>{t("Mostrar bienvenida")}</Text>
          <Switch value={draft.splash.enabled} disabled={splashLocked} onValueChange={(value) => updateSplash('enabled', value)} trackColor={{ true: appTheme.yellowPressed }} />
        </View>
        <ImageField title="bienvenida" emptyText={t("Sin imagen: se muestra el nombre del negocio")} source={splash} quality={quality} onPicked={pickSplash} onRemove={dropSplash} onError={setError} disabled={splashLocked} note="Tu logo se ve mejor centrado y con fondo transparente." />
        <Slider label={t("Duración")} value={draft.splash.duration} min={SPLASH_RANGE.min} max={SPLASH_RANGE.max} step={SPLASH_RANGE.step} unit="s" disabled={splashLocked} onChange={(value) => updateSplash('duration', value)} />
      </Section>

      <Button loading={saving} disabled={!dirty} onPress={save}>{t("Guardar personalización")}</Button>

      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <View style={{ flex: 1, backgroundColor: appTheme.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingTop: insets.top + 12, paddingBottom: 12 }}>
            <Text style={{ color: appTheme.text, fontSize: 19, fontWeight: '900' }}>{t("Vista previa")}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar vista previa" onPress={() => setExpanded(false)} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: appTheme.surface, borderWidth: 1, borderColor: appTheme.border, opacity: pressed ? 0.7 : 1 })}>
              <CloseIcon color={appTheme.text} size={16} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}><MenuPreview {...preview} /></ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
