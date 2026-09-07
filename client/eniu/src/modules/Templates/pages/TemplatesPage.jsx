import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Eye, ImagePlus, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import { ACCEPTED_MIMETYPES, prepareImage } from "../../../services/imageFile";
import PlanBadge from "../../auth/components/PlanBadge";
import { usePlan } from "../../auth/hooks/usePlan";
import { useBusiness } from "../../Business/services/useBusiness";
import ImageQualitySelector from "../../Catalogue/components/ImageQualitySelector";
import { useCategoryService } from "../../Catalogue/services/categoryService";
import { useCatalogueService } from "../../Catalogue/services/catalogueService";
import { useProductService } from "../../Catalogue/services/productService";
import BackgroundPresetPicker from "../components/BackgroundPresetPicker";
import ColorControl from "../components/ColorControl";
import CoverFocalPicker from "../components/CoverFocalPicker";
import MobilePreviewFrame from "../components/MobilePreviewFrame";
import PalettePicker from "../components/PalettePicker";
import TemplateSelector from "../components/TemplateSelector";
import UnsavedChangesDialog from "../components/UnsavedChangesDialog";
import { useTemplateCatalogService } from "../services/templateCatalogService";
import { getTemplateErrorMessage, useTemplateService } from "../services/templateService";
import { resolveTemplate } from "../templates/templateRegistry";
import { CLASSIC_PALETTE_TOKENS, DEFAULT_THEME, FONT_REGISTRY, SPLASH_RANGE, deriveTokens, normalizeConfiguration } from "../utils/themeDefaults";
import { normalizeHex, validateTheme } from "../utils/themeValidation";
import { useTranslation } from "react-i18next";

const COLOR_CONTROLS = [
  ["background_color", "Color de fondo"],
  ["primary_color", "Color principal"],
  ["accent_color", "Color de acento"],
  ["text_color", "Color del texto"],
];
const CORE_COLOR_FIELDS = new Set(COLOR_CONTROLS.map(([field]) => field));
const CORE_TOKEN_KEYS = new Set(["background", "primary", "accent", "text"]);

export default function TemplatesPage() {
  const { t } = useTranslation();

  const { businessId, catalogueId } = useParams();
  const navigate = useNavigate();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  const { limits, allowsTemplate, allowsFont } = usePlan();
  const { get: getTemplate, update: updateTemplate } = useTemplateService(businessId, catalogueId);
  const { getOne: getCatalogue } = useCatalogueService(businessId, catalogueId);
  const { list: getCategories } = useCategoryService(businessId, catalogueId);
  const { list: getProducts } = useProductService(businessId, catalogueId);
  const { get: getTemplateCatalog } = useTemplateCatalogService();
  const [catalogue, setCatalogue] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [palettes, setPalettes] = useState([{ key: "classic", name: "Clásico Eniu", tokens: CLASSIC_PALETTE_TOKENS }]);
  const [colorTokens, setColorTokens] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [quality, setQuality] = useState("alta");
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverVersion, setCoverVersion] = useState(0);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState(null);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [backgroundVersion, setBackgroundVersion] = useState(0);
  const [splashFile, setSplashFile] = useState(null);
  const [splashPreview, setSplashPreview] = useState(null);
  const [removeSplash, setRemoveSplash] = useState(false);
  const [splashVersion, setSplashVersion] = useState(0);
  const [pendingPath, setPendingPath] = useState(null);
  const mountedRef = useRef(true);
  const savingRef = useRef(false);

  const business = businesses.find((item) => item.id === businessId) || selectedBusiness;
  const isDirty = Boolean(saved && draft) && (
    JSON.stringify(saved) !== JSON.stringify(draft) || Boolean(coverFile) || removeCover || Boolean(backgroundFile) || removeBackground || Boolean(splashFile) || removeSplash
  );
  const validationErrors = draft ? validateTheme(draft.theme) : {};
  const fontsLocked = Object.keys(FONT_REGISTRY).some((key) => !allowsFont(key));
  const coverLocked = !limits.allow_cover;
  const backgroundLocked = !limits.allow_background;
  const productImagesLocked = !limits.allow_product_images;
  const splashLocked = !limits.allow_splash;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const match = businesses.find((item) => item.id === businessId);
    if (match && selectedBusiness?.id !== businessId) selectBusiness(businessId);
  }, [businessId, businesses, selectBusiness, selectedBusiness?.id]);

  const loadData = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError("");
    const responses = await Promise.all([
      getTemplate({ signal }), getCatalogue({ signal }), getCategories({ signal }), getProducts({ signal }),
    ]);
    // El catálogo de paletas se pide aparte: si falla, se sigue con la sola
    // paleta "Clásico Eniu" de respaldo en vez de bloquear todo el editor por
    // algo que sólo afecta a una sección de la pantalla.
    const catalogResponse = await getTemplateCatalog({ signal });
    if (responses.some((response) => response.aborted) || !mountedRef.current) return;
    const failed = responses.find((response) => !response.ok);
    if (failed) {
      setLoadError(getTemplateErrorMessage(failed, t("No pudimos cargar la configuración de la plantilla.")));
      setIsLoading(false);
      return;
    }
    if (catalogResponse.ok) {
      setPalettes(catalogResponse.data?.palettes || []);
      setColorTokens(catalogResponse.data?.color_tokens || []);
      setBackgrounds(catalogResponse.data?.backgrounds || []);
    }
    const configuration = normalizeConfiguration(responses[0].data?.template);
    setSaved(configuration);
    setDraft(configuration);
    setCatalogue(responses[1].data?.catalogue || null);
    setCategories(responses[2].data?.categories || []);
    setProducts(responses[3].data?.products || []);
    setIsLoading(false);
  }, [getCatalogue, getCategories, getProducts, getTemplate, getTemplateCatalog]);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => loadData(controller.signal), 0);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [loadData]);

  useEffect(() => {
    if (!isDirty) return undefined;
    function beforeUnload(event) { event.preventDefault(); event.returnValue = ""; }
    function interceptNavigation(event) {
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.getAttribute("href"), window.location.origin);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingPath(`${destination.pathname}${destination.search}${destination.hash}`);
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptNavigation, true);
    };
  }, [isDirty]);

  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);
  useEffect(() => () => { if (backgroundPreview) URL.revokeObjectURL(backgroundPreview); }, [backgroundPreview]);
  useEffect(() => () => { if (splashPreview) URL.revokeObjectURL(splashPreview); }, [splashPreview]);

  function updateTheme(field, value) {
    setDraft((current) => {
      const theme = { ...current.theme, [field]: value };
      // Tocar un color a mano es "quiero personalizarlo": ya no sigue a la
      // paleta elegida, y los tokens que no tienen campo propio (precio,
      // superficie de tarjeta, etc.) se recalculan a partir de los 4 colores
      // nuevos para que la vista previa no se quede con valores de la paleta
      // anterior mientras se sigue editando.
      if (CORE_COLOR_FIELDS.has(field)) {
        theme.color_preset_key = null;
        theme.tokens = {
          ...deriveTokens(theme.background_color, theme.primary_color, theme.accent_color, theme.text_color),
          background: theme.background_color, primary: theme.primary_color, accent: theme.accent_color, text: theme.text_color,
          ...current.theme.theme_overrides,
        };
      }
      return { ...current, theme };
    });
    setSaveError(""); setSuccess("");
  }

  function chooseColorPreset(presetKey) {
    setDraft((current) => {
      if (presetKey === null) {
        // "Personalizado": parte de los colores que ya se veían, no los
        // resetea — cambiar de opinión sobre la paleta no debe borrar nada.
        return { ...current, theme: { ...current.theme, color_preset_key: null } };
      }
      const preset = palettes.find((palette) => palette.key === presetKey);
      if (!preset) return current;
      return {
        ...current,
        theme: {
          ...current.theme,
          background_color: preset.tokens.background,
          primary_color: preset.tokens.primary,
          accent_color: preset.tokens.accent,
          text_color: preset.tokens.text,
          color_preset_key: presetKey,
          theme_overrides: {},
          tokens: preset.tokens,
        },
      };
    });
    setSaveError(""); setSuccess("");
  }

  function updateThemeOverride(tokenKey, value) {
    setDraft((current) => ({
      ...current,
      theme: {
        ...current.theme,
        color_preset_key: null,
        theme_overrides: { ...current.theme.theme_overrides, [tokenKey]: value },
        tokens: { ...current.theme.tokens, [tokenKey]: value },
      },
    }));
    setSaveError(""); setSuccess("");
  }

  function updateCoverFocalPoint(x, y) {
    setDraft((current) => ({ ...current, theme: { ...current.theme, cover_focal_x: x, cover_focal_y: y } }));
  }

  function updateSplash(field, value) {
    setDraft((current) => ({ ...current, splash: { ...current.splash, [field]: value } }));
    setSaveError(""); setSuccess("");
  }

  /**
   * Valida y reencodifica la imagen elegida antes de quedarse con ella.
   *
   * Las tres imágenes de esta pantalla —portada, fondo y bienvenida— viajan a
   * cada comensal que abre el menú, así que ninguna debe subirse tal como
   * salió de la cámara. Devuelve `null` cuando no hay nada que hacer: el
   * usuario canceló, o el archivo no sirve y el error ya quedó en pantalla.
   */
  async function pickImage(event, subject) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return null;
    if (!ACCEPTED_MIMETYPES.includes(file.type)) {
      setSaveError(t("{{field}} debe ser JPG, PNG o WebP.", { field: subject }));
      return null;
    }
    try {
      return await prepareImage(file, quality);
    } catch (error) {
      setSaveError(error.message);
      return null;
    }
  }

  async function chooseSplash(event) {
    const file = await pickImage(event, t("La bienvenida"));
    if (!file) return;
    if (splashPreview) URL.revokeObjectURL(splashPreview);
    setSplashFile(file); setSplashPreview(URL.createObjectURL(file)); setRemoveSplash(false);
    setSaveError(""); setSuccess("");
  }

  function removeCurrentSplash() {
    if (splashPreview) URL.revokeObjectURL(splashPreview);
    setSplashFile(null); setSplashPreview(null); setRemoveSplash(true); setSaveError(""); setSuccess("");
  }

  async function chooseCover(event) {
    const file = await pickImage(event, t("La portada"));
    if (!file) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); setRemoveCover(false);
    updateTheme("show_cover", true);
  }

  function removeCurrentCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null); setCoverPreview(null); setRemoveCover(true); setSaveError("");
  }

  async function chooseBackground(event) {
    const file = await pickImage(event, t("El fondo"));
    if (!file) return;
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
    setBackgroundFile(file); setBackgroundPreview(URL.createObjectURL(file)); setRemoveBackground(false);
    setSaveError(""); setSuccess("");
  }

  function removeCurrentBackground() {
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
    setBackgroundFile(null); setBackgroundPreview(null); setRemoveBackground(true); setSaveError(""); setSuccess("");
  }

  function discardChanges() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setDraft(saved); setCoverFile(null); setCoverPreview(null); setRemoveCover(false);
    setBackgroundFile(null); setBackgroundPreview(null); setRemoveBackground(false);
    setSplashFile(null); setSplashPreview(null); setRemoveSplash(false);
    setSaveError(""); setSuccess("");
  }

  async function saveChanges() {
    if (savingRef.current || Object.keys(validationErrors).length) return;
    savingRef.current = true; setIsSaving(true); setSaveError(""); setSuccess("");
    // `color_preset_key`/`theme_overrides`/`tokens` no son campos de `theme`
    // para el backend (ver `THEME_FIELDS` en `template/services.py`): los dos
    // primeros van sueltos en el nivel superior del payload, y `tokens` es
    // sólo el valor ya resuelto para la vista previa, nunca algo que se guarde.
    const themePayload = Object.fromEntries(Object.entries(draft.theme).filter(
      ([key]) => !["cover_image_url", "background_image_url", "color_preset_key", "theme_overrides", "tokens"].includes(key)
    ));
    const splashPayload = { enabled: draft.splash.enabled, duration: draft.splash.duration };
    const colorPayload = draft.theme.color_preset_key
      ? { color_preset_key: draft.theme.color_preset_key }
      : { theme_overrides: draft.theme.theme_overrides || {} };
    let payload = { template_key: draft.template_key, theme: themePayload, splash: splashPayload, ...colorPayload };
    if (coverFile || removeCover || backgroundFile || removeBackground || splashFile || removeSplash) {
      const formData = new FormData();
      formData.append("template_key", draft.template_key);
      formData.append("theme", JSON.stringify(themePayload));
      formData.append("splash", JSON.stringify(splashPayload));
      if (colorPayload.color_preset_key !== undefined) formData.append("color_preset_key", colorPayload.color_preset_key ?? "");
      if (colorPayload.theme_overrides !== undefined) formData.append("theme_overrides", JSON.stringify(colorPayload.theme_overrides));
      formData.append("remove_cover", String(removeCover));
      formData.append("remove_background", String(removeBackground));
      formData.append("remove_splash", String(removeSplash));
      if (coverFile) formData.append("cover", coverFile);
      if (backgroundFile) formData.append("background", backgroundFile);
      if (splashFile) formData.append("splash", splashFile);
      payload = formData;
    }
    const response = await updateTemplate(payload);
    savingRef.current = false;
    if (!mountedRef.current) return;
    setIsSaving(false);
    if (!response.ok) {
      setSaveError(getTemplateErrorMessage(response, t("No pudimos guardar los cambios. Intenta nuevamente.")));
      return;
    }
    const configuration = normalizeConfiguration(response.data?.template);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setSaved(configuration); setDraft(configuration); setCoverFile(null); setCoverPreview(null);
    setBackgroundFile(null); setBackgroundPreview(null); setRemoveBackground(false);
    setSplashFile(null); setSplashPreview(null); setRemoveSplash(false); setSplashVersion(Date.now());
    setRemoveCover(false); setCoverVersion(Date.now()); setBackgroundVersion(Date.now()); setSuccess(t("La plantilla se guardó correctamente."));
  }

  const previewThemeBase = useMemo(() => {
    if (!draft) return DEFAULT_THEME;
    const theme = { ...draft.theme };
    COLOR_CONTROLS.forEach(([field]) => { theme[field] = normalizeHex(theme[field]) || saved?.theme[field] || DEFAULT_THEME[field]; });
    return theme;
  }, [draft, saved]);

  const storedCoverPath = !removeCover && draft?.theme.cover_image_url
    ? `${draft.theme.cover_image_url}${coverVersion ? `?v=${coverVersion}` : ""}` : null;
  const storedBackgroundPath = !removeBackground && draft?.theme.background_image_url
    ? `${draft.theme.background_image_url}${backgroundVersion ? `?v=${backgroundVersion}` : ""}` : null;
  const authenticatedCoverUrl = usePrivateAsset(storedCoverPath);
  const storedSplashPath = !removeSplash && draft?.splash?.image_url
    ? `${draft.splash.image_url}${splashVersion ? `?v=${splashVersion}` : ""}` : null;
  const authenticatedBackgroundUrl = usePrivateAsset(storedBackgroundPath);
  const authenticatedSplashUrl = usePrivateAsset(storedSplashPath);

  if (isLoading) return <LoadingState />;
  if (loadError || !catalogue || !draft) return <ErrorState message={loadError} onRetry={() => loadData()} />;

  const coverUrl = coverPreview || authenticatedCoverUrl;
  const backgroundUrl = backgroundPreview || authenticatedBackgroundUrl;
  const splashUrl = splashPreview || authenticatedSplashUrl;
  const backgroundPreset = backgrounds.find((background) => background.key === draft.theme.background_preset_key) || null;
  const previewTheme = { ...previewThemeBase, background_image_url: backgroundUrl, background_preset: backgroundPreset };

  return <section className="mx-auto w-full max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111]"><ArrowLeft size={17} /> {t("Volver al menú")}</Link><div className="flex flex-wrap items-center gap-2">{isDirty && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">{t("Cambios sin guardar")}</span>}<button type="button" onClick={discardChanges} disabled={!isDirty || isSaving} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={16} /> {t("Descartar")}</button><button type="button" onClick={saveChanges} disabled={!isDirty || isSaving || Object.keys(validationErrors).length > 0} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"><Save size={17} /> {isSaving ? "Guardando..." : t("Guardar personalización")}</button></div></div>
    <header><p className="text-sm font-semibold text-[#8A7420]">{catalogue.name}</p><h1 className="mt-1 text-3xl font-bold">{t("Plantillas")}</h1><p className="mt-1 text-sm text-[#666666]">{t("Personaliza la identidad visual sin alterar el contenido del menú.")}</p></header>
    {success && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}
    {saveError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)]">
      <div className="space-y-6 rounded-2xl border border-[#E9DDB7] bg-[#FFFDF5] p-5 shadow-sm sm:p-6">
        <TemplateSelector value={draft.template_key} isAllowed={allowsTemplate} onChange={(template_key) => { setDraft((current) => ({ ...current, template_key })); setSuccess(""); }} />
        <section>
          <h2 className="text-sm font-bold">{t("Colores")}</h2>
          <PalettePicker palettes={palettes} value={draft.theme.color_preset_key} onChange={chooseColorPreset} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{COLOR_CONTROLS.map(([field, label]) => <ColorControl key={field} id={`theme-${field}`} label={t(label)} value={draft.theme[field]} originalValue={saved.theme[field]} error={validationErrors[field]} onChange={(value) => updateTheme(field, value)} />)}</div>
          {validationErrors.contrast && <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{validationErrors.contrast} {t("Ajusta los colores antes de guardar.")}</p>}
          <button type="button" onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen} className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-[#E9DDB7] bg-white px-4 text-sm font-semibold hover:border-[#D7C36A]">
            {t("Colores avanzados")}
            <ChevronDown size={16} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </button>
          {advancedOpen && (
            <div className="mt-3 grid gap-4 rounded-xl border border-[#E9DDB7] bg-[#FBF7EA] p-4 sm:grid-cols-2">
              <p className="text-xs text-[#777777] sm:col-span-2">{t("Colores de elementos específicos: precio, título de categoría y el filtro de categoría seleccionado.")}</p>
              {colorTokens.filter((token) => !CORE_TOKEN_KEYS.has(token.key)).map((token) => (
                <ColorControl
                  key={token.key}
                  id={`token-${token.key}`}
                  label={t(token.label)}
                  value={draft.theme.tokens?.[token.key] ?? CLASSIC_PALETTE_TOKENS[token.key]}
                  originalValue={saved.theme.tokens?.[token.key] ?? CLASSIC_PALETTE_TOKENS[token.key]}
                  onChange={(value) => updateThemeOverride(token.key, value)}
                />
              ))}
            </div>
          )}
        </section>
        <section><div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="theme-font" className="text-sm font-bold">{t("Tipografía")}</label>{fontsLocked && <PlanBadge />}</div><select id="theme-font" value={draft.theme.font_key} disabled={fontsLocked} onChange={(event) => updateTheme("font_key", event.target.value)} className={`mt-2 min-h-11 w-full rounded-xl border border-[#D9D9D9] px-4 outline-none focus:border-[#E8C93D] ${fontsLocked ? "cursor-not-allowed bg-[#F7F3E4] opacity-60" : "cursor-pointer bg-white"}`}>{Object.entries(FONT_REGISTRY).map(([key, font]) => <option key={key} value={key} disabled={!allowsFont(key)}>{font.label}</option>)}</select></section>
        <section><h2 className="text-sm font-bold">{t("Fotos")}</h2><p className="mt-1 text-xs text-[#777777]">{t("Se aplica a la portada, el fondo y la bienvenida. Menos calidad hace que el menú abra más rápido en el celular de tus clientes.")}</p><ImageQualitySelector value={quality} onChange={setQuality} /></section>
        <section><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">{t("Portada y productos")}</h2>{coverLocked && <PlanBadge />}</div><div className="mt-3 space-y-3"><Toggle label={t("Mostrar portada")} checked={draft.theme.show_cover} disabled={coverLocked} onChange={(value) => updateTheme("show_cover", value)} /><Toggle label={t("Mostrar imágenes de productos")} checked={draft.theme.show_product_images} disabled={productImagesLocked} onChange={(value) => updateTheme("show_product_images", value)} /></div><ImagePicker title={t("Portada")} url={coverUrl} emptyText={t("Sin portada")} disabled={coverLocked} onChange={chooseCover} onRemove={removeCurrentCover} />{!coverLocked && <CoverFocalPicker imageUrl={coverUrl} focalX={draft.theme.cover_focal_x} focalY={draft.theme.cover_focal_y} onChange={updateCoverFocalPoint} />}</section>
        <section><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">{t("Fondo del menú")}</h2>{backgroundLocked && <PlanBadge />}</div><p className="mt-1 text-xs text-[#777777]">{t("La imagen queda detrás del contenido y no reemplaza la portada.")}</p><p className="mt-3 text-xs font-semibold text-[#2A2A2A]">{t("Fondo prediseñado")}</p><BackgroundPresetPicker backgrounds={backgrounds} value={draft.theme.background_preset_key} disabled={backgroundLocked} onChange={(key) => updateTheme("background_preset_key", key)} /><p className="mt-4 text-xs font-semibold text-[#2A2A2A]">{t("O sube tu propia imagen")}</p><ImagePicker title={t("Fondo")} url={backgroundUrl} emptyText={t("Sin imagen de fondo")} disabled={backgroundLocked} onChange={chooseBackground} onRemove={removeCurrentBackground} /><label htmlFor="background-opacity" className="mt-4 block text-sm font-semibold">{t("Opacidad del fondo:")} {Math.round(draft.theme.background_opacity * 100)}%</label><input id="background-opacity" type="range" min="0" max="1" step="0.05" disabled={backgroundLocked} value={draft.theme.background_opacity} onChange={(event) => updateTheme("background_opacity", Number(event.target.value))} className={`mt-2 h-11 w-full accent-[#E8C93D] ${backgroundLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} /></section>
        <section><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">{t("Pantalla de bienvenida")}</h2>{splashLocked && <PlanBadge />}</div><p className="mt-1 text-xs text-[#777777]">{t("Aparece unos segundos al abrir el menú y se desvanece sola. Un toque la cierra antes.")}</p><div className="mt-3"><Toggle label={t("Mostrar bienvenida")} checked={draft.splash.enabled} disabled={splashLocked} onChange={(value) => updateSplash("enabled", value)} /></div><ImagePicker title={t("Bienvenida")} url={splashUrl} emptyText={t("Sin imagen: se muestra el nombre del negocio")} disabled={splashLocked} onChange={chooseSplash} onRemove={removeCurrentSplash} /><label htmlFor="splash-duration" className="mt-4 block text-sm font-semibold">{t("Duración:")} {draft.splash.duration} s</label><input id="splash-duration" type="range" min={SPLASH_RANGE.min} max={SPLASH_RANGE.max} step={SPLASH_RANGE.step} disabled={splashLocked} value={draft.splash.duration} onChange={(event) => updateSplash("duration", Number(event.target.value))} className={`mt-2 h-11 w-full accent-[#E8C93D] ${splashLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} /></section>
      </div>
      <aside className="rounded-2xl border border-[#E9DDB7] bg-[#F8E8AE]/35 p-4 sm:p-6 xl:sticky xl:top-4"><h2 className="mb-4 flex items-center gap-2 font-bold"><Eye size={18} /> {t("Vista previa móvil")}</h2><MobilePreviewFrame>{createElement(resolveTemplate(draft.template_key), { business, catalogue, categories, products, theme: previewTheme, coverUrl, showEniuBadge: limits.show_eniu_badge })}</MobilePreviewFrame></aside>
    </div>
    {pendingPath && <UnsavedChangesDialog onCancel={() => setPendingPath(null)} onConfirm={() => navigate(pendingPath)} />}
  </section>;
}

function Toggle({ label, checked, onChange, disabled = false }) { return <label className={`flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[#E9DDB7] px-4 ${disabled ? "cursor-not-allowed bg-[#F7F3E4] opacity-60" : "cursor-pointer bg-white"}`}><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#E8C93D]" /></label>; }
function ImagePicker({ title, url, emptyText, onChange, onRemove, disabled = false }) {
  const { t } = useTranslation();
 return <div className={`mt-4 overflow-hidden rounded-xl border border-dashed border-[#CDBD87] ${disabled ? "bg-[#F7F3E4]" : "bg-white"}`}>{url ? <img src={url} alt={t("Vista previa de {{name}}", { name: title.toLowerCase() })} className="h-40 w-full object-cover" /> : <div className="flex h-28 items-center justify-center text-sm text-[#777777]">{emptyText}</div>}<div className="flex flex-wrap items-center gap-3 p-4">{disabled ? <p className="text-sm text-[#777777]">{t("Tu plan actual no incluye esta imagen.")}</p> : <><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 text-sm font-semibold text-white hover:bg-[#111111]"><ImagePlus size={17} /> {url ? t("Cambiar {{name}}", { name: title.toLowerCase() }) : t("Elegir {{name}}", { name: title.toLowerCase() })}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} className="sr-only" /></label>{url && <button type="button" onClick={onRemove} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={16} /> {t("Quitar")}</button>}<span className="text-xs text-[#777777]">{t("JPG, PNG o WebP. Máximo 5 MB.")}</span></>}</div></div>; }
function LoadingState() {
  const { t } = useTranslation();
 return <div aria-label={t("Cargando editor de plantillas")} className="grid animate-pulse gap-6 xl:grid-cols-2"><div className="h-[680px] rounded-2xl bg-white" /><div className="mx-auto h-[720px] w-full max-w-[390px] rounded-[2.5rem] bg-[#D9D9D9]" /></div>; }
function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();
 return <div className="mx-auto max-w-2xl rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center"><h1 className="text-xl font-bold">{t("No pudimos abrir el editor")}</h1><p role="alert" className="mt-2 text-[#666666]">{message}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 font-semibold text-white"><RefreshCw size={17} /> {t("Reintentar")}</button></div>; }

function usePrivateAsset(path) {
  const [objectUrl, setObjectUrl] = useState(null);
  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    let createdUrl = null;
    const origin = new URL(import.meta.env.VITE_API_URL).origin;
    fetch(`${origin}${path}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      signal: controller.signal,
    }).then((response) => response.ok ? response.blob() : null).then((blob) => {
      if (!blob || controller.signal.aborted) return;
      createdUrl = URL.createObjectURL(blob);
      setObjectUrl(createdUrl);
    }).catch(() => {});
    return () => { controller.abort(); if (createdUrl) URL.revokeObjectURL(createdUrl); };
  }, [path]);
  return path ? objectUrl : null;
}
