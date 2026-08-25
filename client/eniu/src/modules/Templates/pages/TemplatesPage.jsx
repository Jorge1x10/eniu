import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, ImagePlus, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import { useBusiness } from "../../Business/services/useBusiness";
import { useCategoryService } from "../../Catalogue/services/categoryService";
import { useCatalogueService } from "../../Catalogue/services/catalogueService";
import { useProductService } from "../../Catalogue/services/productService";
import ColorControl from "../components/ColorControl";
import MobilePreviewFrame from "../components/MobilePreviewFrame";
import TemplateSelector from "../components/TemplateSelector";
import UnsavedChangesDialog from "../components/UnsavedChangesDialog";
import { getTemplateErrorMessage, useTemplateService } from "../services/templateService";
import { resolveTemplate } from "../templates/templateRegistry";
import { DEFAULT_THEME, FONT_REGISTRY, normalizeConfiguration } from "../utils/themeDefaults";
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
  const [pendingPath, setPendingPath] = useState(null);
  const mountedRef = useRef(true);
  const savingRef = useRef(false);

  const business = businesses.find((item) => item.id === businessId) || selectedBusiness;
  const isDirty = Boolean(saved && draft) && (
    JSON.stringify(saved) !== JSON.stringify(draft) || Boolean(coverFile) || removeCover || Boolean(backgroundFile) || removeBackground
  );
  const validationErrors = draft ? validateTheme(draft.theme) : {};

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

  function updateTheme(field, value) {
    setDraft((current) => ({ ...current, theme: { ...current.theme, [field]: value } }));
    setSaveError(""); setSuccess("");
  }

  function chooseCover(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSaveError("La portada debe ser JPG, PNG o WebP."); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("La portada puede pesar máximo 5 MB."); return;
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); setRemoveCover(false);
    updateTheme("show_cover", true);
  }

  function removeCurrentCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null); setCoverPreview(null); setRemoveCover(true); setSaveError("");
  }

  function chooseBackground(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSaveError("El fondo debe ser JPG, PNG o WebP."); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("El fondo puede pesar máximo 5 MB."); return;
    }
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
    setSaveError(""); setSuccess("");
  }

  async function saveChanges() {
    if (savingRef.current || Object.keys(validationErrors).length) return;
    savingRef.current = true; setIsSaving(true); setSaveError(""); setSuccess("");
    const themePayload = Object.fromEntries(Object.entries(draft.theme).filter(([key]) => !["cover_image_url", "background_image_url"].includes(key)));
    let payload = { template_key: draft.template_key, theme: themePayload };
    if (coverFile || removeCover || backgroundFile || removeBackground) {
      const formData = new FormData();
      formData.append("template_key", draft.template_key);
      formData.append("theme", JSON.stringify(themePayload));
      formData.append("remove_cover", String(removeCover));
      formData.append("remove_background", String(removeBackground));
      if (coverFile) formData.append("cover", coverFile);
      if (backgroundFile) formData.append("background", backgroundFile);
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
  const authenticatedBackgroundUrl = usePrivateAsset(storedBackgroundPath);

  if (isLoading) return <LoadingState />;
  if (loadError || !catalogue || !draft) return <ErrorState message={loadError} onRetry={() => loadData()} />;

  const coverUrl = coverPreview || authenticatedCoverUrl;
  const backgroundUrl = backgroundPreview || authenticatedBackgroundUrl;
  const previewTheme = { ...previewThemeBase, background_image_url: backgroundUrl };

  return <section className="mx-auto w-full max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111]"><ArrowLeft size={17} /> Volver al menú</Link><div className="flex flex-wrap items-center gap-2">{isDirty && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">Cambios sin guardar</span>}<button type="button" onClick={discardChanges} disabled={!isDirty || isSaving} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={16} /> Descartar</button><button type="button" onClick={saveChanges} disabled={!isDirty || isSaving || Object.keys(validationErrors).length > 0} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"><Save size={17} /> {isSaving ? "Guardando..." : "Guardar personalización"}</button></div></div>
    <header><p className="text-sm font-semibold text-[#8A7420]">{catalogue.name}</p><h1 className="mt-1 text-3xl font-bold">Plantillas</h1><p className="mt-1 text-sm text-[#666666]">Personaliza la identidad visual sin alterar el contenido del menú.</p></header>
    {success && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}
    {saveError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)]">
      <div className="space-y-6 rounded-2xl border border-[#E9DDB7] bg-[#FFFDF5] p-5 shadow-sm sm:p-6">
        <TemplateSelector value={draft.template_key} onChange={(template_key) => { setDraft((current) => ({ ...current, template_key })); setSuccess(""); }} />
        <section><h2 className="text-sm font-bold">Colores</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{COLOR_CONTROLS.map(([field, label]) => <ColorControl key={field} id={`theme-${field}`} label={label} value={draft.theme[field]} originalValue={saved.theme[field]} error={validationErrors[field]} onChange={(value) => updateTheme(field, value)} />)}</div>{validationErrors.contrast && <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{validationErrors.contrast} Ajusta los colores antes de guardar.</p>}</section>
        <section><label htmlFor="theme-font" className="text-sm font-bold">Tipografía</label><select id="theme-font" value={draft.theme.font_key} onChange={(event) => updateTheme("font_key", event.target.value)} className="mt-2 min-h-11 w-full cursor-pointer rounded-xl border border-[#D9D9D9] bg-white px-4 outline-none focus:border-[#E8C93D]">{Object.entries(FONT_REGISTRY).map(([key, font]) => <option key={key} value={key}>{font.label}</option>)}</select></section>
        <section><h2 className="text-sm font-bold">Portada y productos</h2><div className="mt-3 space-y-3"><Toggle label="Mostrar portada" checked={draft.theme.show_cover} onChange={(value) => updateTheme("show_cover", value)} /><Toggle label="Mostrar imágenes de productos" checked={draft.theme.show_product_images} onChange={(value) => updateTheme("show_product_images", value)} /></div><ImagePicker title="Portada" url={coverUrl} emptyText="Sin portada" onChange={chooseCover} onRemove={removeCurrentCover} /></section>
        <section><h2 className="text-sm font-bold">Fondo del menú</h2><p className="mt-1 text-xs text-[#777777]">La imagen queda detrás del contenido y no reemplaza la portada.</p><ImagePicker title="Fondo" url={backgroundUrl} emptyText="Sin imagen de fondo" onChange={chooseBackground} onRemove={removeCurrentBackground} /><label htmlFor="background-opacity" className="mt-4 block text-sm font-semibold">Opacidad del fondo: {Math.round(draft.theme.background_opacity * 100)}%</label><input id="background-opacity" type="range" min="0" max="1" step="0.05" value={draft.theme.background_opacity} onChange={(event) => updateTheme("background_opacity", Number(event.target.value))} className="mt-2 h-11 w-full cursor-pointer accent-[#E8C93D]" /></section>
      </div>
      <aside className="rounded-2xl border border-[#E9DDB7] bg-[#F8E8AE]/35 p-4 sm:p-6 xl:sticky xl:top-4"><h2 className="mb-4 flex items-center gap-2 font-bold"><Eye size={18} /> Vista previa móvil</h2><MobilePreviewFrame>{createElement(resolveTemplate(draft.template_key), { business, catalogue, categories, products, theme: previewTheme, coverUrl })}</MobilePreviewFrame></aside>
    </div>
    {pendingPath && <UnsavedChangesDialog onCancel={() => setPendingPath(null)} onConfirm={() => navigate(pendingPath)} />}
  </section>;
}

function Toggle({ label, checked, onChange }) { return <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E9DDB7] bg-white px-4"><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#E8C93D]" /></label>; }
function ImagePicker({ title, url, emptyText, onChange, onRemove }) { return <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-[#CDBD87] bg-white">{url ? <img src={url} alt={`Vista previa de ${title.toLowerCase()}`} className="h-40 w-full object-cover" /> : <div className="flex h-28 items-center justify-center text-sm text-[#777777]">{emptyText}</div>}<div className="flex flex-wrap items-center gap-3 p-4"><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 text-sm font-semibold text-white hover:bg-[#111111]"><ImagePlus size={17} /> {url ? `Cambiar ${title.toLowerCase()}` : `Elegir ${title.toLowerCase()}`}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} className="sr-only" /></label>{url && <button type="button" onClick={onRemove} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={16} /> Quitar</button>}<span className="text-xs text-[#777777]">JPG, PNG o WebP. Máximo 5 MB.</span></div></div>; }
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
