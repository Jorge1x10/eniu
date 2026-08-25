import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clipboard, Download, ExternalLink, QrCode, RefreshCw, Send, Undo2 } from "lucide-react";
import QRCode from "qrcode";
import { Link, useParams } from "react-router";

import { useBusiness } from "../../Business/services/useBusiness";
import MobilePreviewFrame from "../../Templates/components/MobilePreviewFrame";
import { resolveTemplate } from "../../Templates/templates/templateRegistry";
import { adaptPublicMenu } from "../utils/publicMenuAdapter";
import { publicationErrorMessage, usePublicationService } from "../services/publicationService";

function sourceUrl(url, source) {
  if (!url) return null;
  const value = new URL(url);
  value.searchParams.set("src", source);
  return value.toString();
}

export default function PublicationPage() {
  const { businessId, catalogueId } = useParams();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  const { getPublication, updatePublication, getPreview } = usePublicationService(businessId, catalogueId);
  const [publication, setPublication] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = useRef(null);
  const mountedRef = useRef(true);
  const updatingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const business = businesses.find((item) => item.id === businessId);
    if (business && selectedBusiness?.id !== businessId) selectBusiness(businessId);
  }, [businessId, businesses, selectBusiness, selectedBusiness?.id]);

  const loadData = useCallback(async (signal) => {
    setIsLoading(true); setLoadError("");
    const [publicationResponse, previewResponse] = await Promise.all([
      getPublication({ signal }), getPreview({ signal }),
    ]);
    if (publicationResponse.aborted || previewResponse.aborted || !mountedRef.current) return;
    const failed = !publicationResponse.ok ? publicationResponse : !previewResponse.ok ? previewResponse : null;
    if (failed) {
      setLoadError(publicationErrorMessage(failed, "No pudimos cargar la información de publicación."));
      setIsLoading(false); return;
    }
    setPublication(publicationResponse.data?.publication || null);
    setPreview(adaptPublicMenu(previewResponse.data?.menu));
    setIsLoading(false);
  }, [getPreview, getPublication]);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => loadData(controller.signal), 0);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [loadData]);

  useEffect(() => {
    if (!publication?.public_url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, sourceUrl(publication.public_url, "qr"), {
      errorCorrectionLevel: "M", margin: 4, width: 280,
      color: { dark: "#111111", light: "#FFFFFF" },
    }).catch(() => setActionError("No pudimos generar el código QR."));
  }, [publication?.public_url]);

  async function togglePublication() {
    if (updatingRef.current) return;
    updatingRef.current = true; setIsUpdating(true); setActionError(""); setMessage("");
    const response = await updatePublication(!publication.is_published);
    if (!mountedRef.current) return;
    if (!response.ok) {
      updatingRef.current = false; setIsUpdating(false);
      setActionError(publicationErrorMessage(response, "No pudimos cambiar el estado del menú.")); return;
    }
    const updated = response.data.publication;
    setPublication(updated);
    const previewResponse = await getPreview();
    if (mountedRef.current && previewResponse.ok) setPreview(adaptPublicMenu(previewResponse.data?.menu));
    updatingRef.current = false; setIsUpdating(false);
    setMessage(updated.is_published ? "El menú se publicó correctamente." : "El menú dejó de estar disponible públicamente.");
  }

  async function copyUrl() {
    if (!publication?.public_url) return;
    setActionError(""); setMessage("");
    try {
      const copiedUrl = sourceUrl(publication.public_url, "copy");
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(copiedUrl);
      else {
        const input = document.createElement("textarea");
        input.value = copiedUrl; input.setAttribute("readonly", "");
        input.style.position = "fixed"; input.style.opacity = "0";
        document.body.appendChild(input); input.select();
        const copied = document.execCommand("copy"); input.remove();
        if (!copied) throw new Error("copy failed");
      }
      setMessage("URL copiada al portapapeles.");
    } catch {
      setActionError("No pudimos copiar la URL. Selecciónala manualmente.");
    }
  }

  async function downloadQr() {
    if (!publication?.public_url || isDownloading) return;
    setIsDownloading(true); setActionError("");
    try {
      const dataUrl = await QRCode.toDataURL(sourceUrl(publication.public_url, "qr"), {
        errorCorrectionLevel: "M", margin: 4, width: 1024,
        color: { dark: "#111111", light: "#FFFFFF" },
      });
      const anchor = document.createElement("a");
      const safeSlug = publication.public_slug.replace(/[^a-z0-9-]/g, "");
      anchor.download = `qr-${safeSlug}.png`; anchor.href = dataUrl;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } catch {
      setActionError("No pudimos descargar el código QR.");
    } finally { setIsDownloading(false); }
  }

  if (isLoading) return <div aria-label="Cargando publicación" className="h-96 animate-pulse rounded-2xl bg-white" />;
  if (loadError || !publication || !preview) return <div className="rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center"><p role="alert" className="font-semibold">{loadError}</p><button type="button" onClick={() => loadData()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 font-semibold text-white"><RefreshCw size={17} /> Reintentar</button></div>;

  return <section className="mx-auto w-full max-w-7xl space-y-6">
    <Link to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[#666666]"><ArrowLeft size={17} /> Volver al menú</Link>
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#8A7420]">Publicación</p><h1 className="mt-1 text-3xl font-bold">URL y código QR</h1><p className="mt-1 text-sm text-[#666666]">Comparte este menú con tus clientes.</p></div><button type="button" onClick={togglePublication} disabled={isUpdating} className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${publication.is_published ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-[#FFE05A] hover:bg-[#E8C93D]"}`}>{publication.is_published ? <Undo2 size={17} /> : <Send size={17} />}{isUpdating ? "Procesando..." : publication.is_published ? "Despublicar" : "Publicar menú"}</button></header>
    {message && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
    {actionError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <article className="rounded-2xl border border-[#E9DDB7] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-full ${publication.is_published ? "bg-green-100 text-green-700" : "bg-[#EFEFEF] text-[#666666]"}`}>{publication.is_published ? <Check size={19} /> : <QrCode size={19} />}</span><div><h2 className="font-bold">{publication.is_published ? "Menú publicado" : "Menú no publicado"}</h2><p className="text-sm text-[#666666]">{publication.is_published ? "El enlace está disponible para cualquier visitante." : "Puedes revisar la vista previa antes de publicarlo."}</p></div></div>{publication.public_url && <div className="mt-5"><label htmlFor="public-menu-url" className="text-sm font-semibold">URL pública</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id="public-menu-url" readOnly value={publication.public_url} onFocus={(event) => event.target.select()} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#D9D9D9] bg-[#FFFDF5] px-4 text-sm" /><button type="button" onClick={copyUrl} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2A2A2A] px-4 font-semibold text-white"><Clipboard size={16} /> Copiar URL</button></div></div>}</article>
        <article className="rounded-2xl border border-[#E9DDB7] bg-white p-6 text-center shadow-sm"><h2 className="font-bold">Código QR</h2>{publication.public_url ? <><div className="mx-auto mt-4 w-fit rounded-2xl border border-[#D9D9D9] bg-white p-3"><canvas ref={canvasRef} role="img" aria-label="Código QR de la URL pública del menú" className="block h-auto max-w-full" /></div><div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={downloadQr} disabled={isDownloading} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-4 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed"><Download size={17} /> {isDownloading ? "Preparando..." : "Descargar QR"}</button>{publication.is_published && <a href={sourceUrl(publication.public_url, "dashboard")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#D9D9D9] px-4 font-semibold"><ExternalLink size={17} /> Abrir menú</a>}</div></> : <p className="mt-4 text-sm text-[#666666]">Publica el menú para generar su URL y código QR.</p>}</article>
      </div>
      <aside className="rounded-2xl border border-[#E9DDB7] bg-[#F8E8AE]/35 p-4 lg:sticky lg:top-4"><h2 className="mb-4 font-bold">Vista previa</h2><MobilePreviewFrame>{createElement(resolveTemplate(preview.templateKey), { business: preview.business, catalogue: preview.catalogue, categories: preview.categories, products: preview.products, theme: preview.theme, coverUrl: preview.coverUrl })}</MobilePreviewFrame></aside>
    </div>
  </section>;
}
