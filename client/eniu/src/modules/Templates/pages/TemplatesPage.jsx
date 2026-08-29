import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, ImagePlus, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import { ACCEPTED_MIMETYPES, prepareImage } from "../../../services/imageFile";
import PlanBadge from "../../auth/components/PlanBadge";
import { usePlan } from "../../auth/hooks/usePlan";
import { useBusiness } from "../../Business/services/useBusiness";
import ImageQualitySelector from "../../Catalogue/components/ImageQualitySelector";
import { useCategoryService } from "../../Catalogue/services/categoryService";
import { useCatalogueService } from "../../Catalogue/services/catalogueService";
import { useProductService } from "../../Catalogue/services/productService";
import ColorControl from "../components/ColorControl";
import MobilePreviewFrame from "../components/MobilePreviewFrame";
import TemplateSelector from "../components/TemplateSelector";
import UnsavedChangesDialog from "../components/UnsavedChangesDialog";
import { getTemplateErrorMessage, useTemplateService } from "../services/templateService";
import { resolveTemplate } from "../templates/templateRegistry";
import { DEFAULT_THEME, FONT_REGISTRY, SPLASH_RANGE, normalizeConfiguration } from "../utils/themeDefaults";
import { normalizeHex, validateTheme } from "../utils/themeValidation";

const COLOR_CONTROLS = [
  ["background_color", "Color de fondo"],
  ["primary_color", "Color principal"],
  ["accent_color", "Color de acento"],
  ["text_color", "Color del texto"],
];

export default function TemplatesPage() {
  const { businessId, catalogueId } = useParams();
  const navigate = useNavigate();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  const { limits, allowsTemplate, allowsFont } = usePlan();
  const { get: getTemplate, update: updateTemplate } = useTemplateService(businessId, catalogueId);
  const { getOne: getCatalogue } = useCatalogueService(businessId, catalogueId);
  const { list: getCategories } = useCategoryService(businessId, catalogueId);
  const { list: getProducts } = useProductService(businessId, catalogueId);
  const [catalogue, setCatalogue] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
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
    if (responses.some((response) => response.aborted) || !mountedRef.current) return;
    const failed = responses.find((response) => !response.ok);
    if (failed) {
      setLoadError(getTemplateErrorMessage(failed, "No pudimos cargar la configuración de la plantilla."));
      setIsLoading(false);
      return;
    }
    const configuration = normalizeConfiguration(responses[0].data?.template);
    setSaved(configuration);
    setDraft(configuration);
    setCatalogue(responses[1].data?.catalogue || null);
    setCategories(responses[2].data?.categories || []);
    setProducts(responses[3].data?.products || []);
    setIsLoading(false);
  }, [getCatalogue, getCategories, getProducts, getTemplate]);

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
    setDraft((current) => ({ ...current, theme: { ...current.theme, [field]: value } }));
    setSaveError(""); setSuccess("");
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
      setSaveError(`${subject} debe ser JPG, PNG o WebP.`);
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
    const file = await pickImage(event, "La bienvenida");
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
    const file = await pickImage(event, "La portada");
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
    const file = await pickImage(event, "El fondo");
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
    const themePayload = Object.fromEntries(Object.entries(draft.theme).filter(([key]) => !["cover_image_url", "background_image_url"].includes(key)));
    const splashPayload = { enabled: draft.splash.enabled, duration: draft.splash.duration };
    let payload = { template_key: draft.template_key, theme: themePayload, splash: splashPayload };
    if (coverFile || removeCover || backgroundFile || removeBackground || splashFile || removeSplash) {
      const formData = new FormData();
      formData.append("template_key", draft.template_key);
      formData.append("theme", JSON.stringify(themePayload));
      formData.append("splash", JSON.stringify(splashPayload));
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
      setSaveError(getTemplateErrorMessage(response, "No pudimos guardar los cambios. Intenta nuevamente."));
      return;
    }
    const configuration = normalizeConfiguration(response.data?.template);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setSaved(configuration); setDraft(configuration); setCoverFile(null); setCoverPreview(null);
    setBackgroundFile(null); setBackgroundPreview(null); setRemoveBackground(false);
    setSplashFile(null); setSplashPreview(null); setRemoveSplash(false); setSplashVersion(Date.now());
    setRemoveCover(false); setCoverVersion(Date.now()); setBackgroundVersion(Date.now()); setSuccess("La plantilla se guardó correctamente.");
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
  const previewTheme = { ...previewThemeBase, background_image_url: backgroundUrl };

  return <section className="mx-auto w-full max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111]"><ArrowLeft size={17} /> Volver al menú</Link><div className="flex flex-wrap items-center gap-2">{isDirty && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">Cambios sin guardar</span>}<button type="button" onClick={discardChanges} disabled={!isDirty || isSaving} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={16} /> Descartar</button><button type="button" onClick={saveChanges} disabled={!isDirty || isSaving || Object.keys(validationErrors).length > 0} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"><Save size={17} /> {isSaving ? "Guardando..." : "Guardar personalización"}</button></div></div>
    <header><p className="text-sm font-semibold text-[#8A7420]">{catalogue.name}</p><h1 className="mt-1 text-3xl font-bold">Plantillas</h1><p className="mt-1 text-sm text-[#666666]">Personaliza la identidad visual sin alterar el contenido del menú.</p></header>
    {success && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}
    {saveError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)]">
      <div className="space-y-6 rounded-2xl border border-[#E9DDB7] bg-[#FFFDF5] p-5 shadow-sm sm:p-6">
        <TemplateSelector value={draft.template_key} isAllowed={allowsTemplate} onChange={(template_key) => { setDraft((current) => ({ ...current, template_key })); setSuccess(""); }} />
        <section><h2 className="text-sm font-bold">Colores</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{COLOR_CONTROLS.map(([field, label]) => <ColorControl key={field} id={`theme-${field}`} label={label} value={draft.theme[field]} originalValue={saved.theme[field]} error={validationErrors[field]} onChange={(value) => updateTheme(field, value)} />)}</div>{validationErrors.contrast && <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{validationErrors.contrast} Ajusta los colores antes de guardar.</p>}</section>
        <section><div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="theme-font" className="text-sm font-bold">Tipografía</label>{fontsLocked && <PlanBadge />}</div><select id="theme-font" value={draft.theme.font_key} disabled={fontsLocked} onChange={(event) => updateTheme("font_key", event.target.value)} className={`mt-2 min-h-11 w-full rounded-xl border border-[#D9D9D9] px-4 outline-none focus:border-[#E8C93D] ${fontsLocked ? "cursor-not-allowed bg-[#F7F3E4] opacity-60" : "cursor-pointer bg-white"}`}>{Object.entries(FONT_REGISTRY).map(([key, font]) => <option key={key} value={key} disabled={!allowsFont(key)}>{font.label}</option>)}</select></section>
        <section><h2 className="text-sm font-bold">Fotos</h2><p className="mt-1 text-xs text-[#777777]">Se aplica a la portada, el fondo y la bienvenida. Menos calidad hace que el menú abra más rápido en el celular de tus clientes.</p><ImageQualitySelector value={quality} onChange={setQuality} /></section>
        <section><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Portada y productos</h2>{coverLocked && <PlanBadge />}</div><div className="mt-3 space-y-3"><Toggle label="Mostrar portada" checked={draft.theme.show_cover} disabled={coverLocked} onChange={(value) => updateTheme("show_cover", value)} /><Toggle label="Mostrar imágenes de productos" checked={draft.theme.show_product_images} disabled={productImagesLocked} onChange={(value) => updateTheme("show_product_images", value)} /></div><ImagePicker title="Portada" url={coverUrl} emptyText="Sin portada" disabled={coverLocked} onChange={chooseCover} onRemove={removeCurrentCover} /></section>
        <section><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Fondo del menú</h2>{backgroundLocked && <PlanBadge />}</div><p className="mt-1 text-xs text-[#777777]">La imagen queda detrás del contenido y no reemplaza la portada.</p><ImagePicker title="Fondo" url={backgroundUrl} emptyText="Sin imagen de fondo" disabled={backgroundLocked} onChange={chooseBackground} onRemove={removeCurrentBackground} /><label htmlFor="background-opacity" className="mt-4 block text-sm font-semibold">Opacidad del fondo: {Math.round(draft.theme.background_opacity * 100)}%</label><input id="background-opacity" type="range" min="0" max="1" step="0.05" disabled={backgroundLocked} value={draft.theme.background_opacity} onChange={(event) => updateTheme("background_opacity", Number(event.target.value))} className={`mt-2 h-11 w-full accent-[#E8C93D] ${backgroundLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} /></section>
        <section><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Pantalla de bienvenida</h2>{splashLocked && <PlanBadge />}</div><p className="mt-1 text-xs text-[#777777]">Aparece unos segundos al abrir el menú y se desvanece sola. Un toque la cierra antes.</p><div className="mt-3"><Toggle label="Mostrar bienvenida" checked={draft.splash.enabled} disabled={splashLocked} onChange={(value) => updateSplash("enabled", value)} /></div><ImagePicker title="Bienvenida" url={splashUrl} emptyText="Sin imagen: se muestra el nombre del negocio" disabled={splashLocked} onChange={chooseSplash} onRemove={removeCurrentSplash} /><label htmlFor="splash-duration" className="mt-4 block text-sm font-semibold">Duración: {draft.splash.duration} s</label><input id="splash-duration" type="range" min={SPLASH_RANGE.min} max={SPLASH_RANGE.max} step={SPLASH_RANGE.step} disabled={splashLocked} value={draft.splash.duration} onChange={(event) => updateSplash("duration", Number(event.target.value))} className={`mt-2 h-11 w-full accent-[#E8C93D] ${splashLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} /></section>
      </div>
      <aside className="rounded-2xl border border-[#E9DDB7] bg-[#F8E8AE]/35 p-4 sm:p-6 xl:sticky xl:top-4"><h2 className="mb-4 flex items-center gap-2 font-bold"><Eye size={18} /> Vista previa móvil</h2><MobilePreviewFrame>{createElement(resolveTemplate(draft.template_key), { business, catalogue, categories, products, theme: previewTheme, coverUrl, showEniuBadge: limits.show_eniu_badge })}</MobilePreviewFrame></aside>
    </div>
    {pendingPath && <UnsavedChangesDialog onCancel={() => setPendingPath(null)} onConfirm={() => navigate(pendingPath)} />}
  </section>;
}

function Toggle({ label, checked, onChange, disabled = false }) { return <label className={`flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[#E9DDB7] px-4 ${disabled ? "cursor-not-allowed bg-[#F7F3E4] opacity-60" : "cursor-pointer bg-white"}`}><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#E8C93D]" /></label>; }
function ImagePicker({ title, url, emptyText, onChange, onRemove, disabled = false }) { return <div className={`mt-4 overflow-hidden rounded-xl border border-dashed border-[#CDBD87] ${disabled ? "bg-[#F7F3E4]" : "bg-white"}`}>{url ? <img src={url} alt={`Vista previa de ${title.toLowerCase()}`} className="h-40 w-full object-cover" /> : <div className="flex h-28 items-center justify-center text-sm text-[#777777]">{emptyText}</div>}<div className="flex flex-wrap items-center gap-3 p-4">{disabled ? <p className="text-sm text-[#777777]">Tu plan actual no incluye esta imagen.</p> : <><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 text-sm font-semibold text-white hover:bg-[#111111]"><ImagePlus size={17} /> {url ? `Cambiar ${title.toLowerCase()}` : `Elegir ${title.toLowerCase()}`}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} className="sr-only" /></label>{url && <button type="button" onClick={onRemove} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={16} /> Quitar</button>}<span className="text-xs text-[#777777]">JPG, PNG o WebP. Máximo 5 MB.</span></>}</div></div>; }
function LoadingState() { return <div aria-label="Cargando editor de plantillas" className="grid animate-pulse gap-6 xl:grid-cols-2"><div className="h-[680px] rounded-2xl bg-white" /><div className="mx-auto h-[720px] w-full max-w-[390px] rounded-[2.5rem] bg-[#D9D9D9]" /></div>; }
function ErrorState({ message, onRetry }) { return <div className="mx-auto max-w-2xl rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center"><h1 className="text-xl font-bold">No pudimos abrir el editor</h1><p role="alert" className="mt-2 text-[#666666]">{message}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 font-semibold text-white"><RefreshCw size={17} /> Reintentar</button></div>; }

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
