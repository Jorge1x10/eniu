import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  FolderOpen,
  PackageOpen,
  Palette,
  QrCode,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router";

import { useBusiness } from "../../Business/services/useBusiness";
import CatalogueStatusBadge from "../components/CatalogueStatusBadge";
import DeleteCatalogueModal from "../components/DeleteCatalogueModal";
import { forgetCatalogue, rememberCatalogue } from "../utils/lastCatalogue";
import {
  getCatalogueErrorMessage,
  useCatalogueService,
} from "../services/catalogueService";

export default function CatalogueDetailPage() {
  const { businessId, catalogueId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    businesses,
    selectedBusiness,
    selectBusiness,
  } = useBusiness();
  const { getOne, update, remove, publish, unpublish } = useCatalogueService(
    businessId,
    catalogueId
  );

  const stateCatalogue = location.state?.catalogue;
  const initialCatalogue = stateCatalogue?.id === catalogueId ? stateCatalogue : null;
  const [catalogue, setCatalogue] = useState(initialCatalogue);
  const [form, setForm] = useState({
    name: initialCatalogue?.name || "",
    description: initialCatalogue?.description || "",
  });
  const [isLoading, setIsLoading] = useState(!initialCatalogue);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const mountedRef = useRef(true);

  const business = businesses.find((item) => item.id === businessId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (business && selectedBusiness?.id !== business.id) {
      selectBusiness(business.id);
    }
  }, [business, selectedBusiness?.id, selectBusiness]);

  useEffect(() => {
    rememberCatalogue(businessId, catalogueId);
  }, [businessId, catalogueId]);

  const loadCatalogue = useCallback(async (signal) => {
    if (!initialCatalogue) setIsLoading(true);
    setLoadError("");
    const response = await getOne({ signal });
    if (response.aborted || !mountedRef.current) return;

    if (!response.ok) {
      if (response.status === 404) forgetCatalogue(businessId, catalogueId);
      setLoadError(getCatalogueErrorMessage(
        response,
        "No pudimos cargar el menú. Intenta nuevamente."
      ));
      setIsLoading(false);
      return;
    }

    const receivedCatalogue = response.data.catalogue;
    setCatalogue(receivedCatalogue);
    setForm({
      name: receivedCatalogue.name || "",
      description: receivedCatalogue.description || "",
    });
    setIsLoading(false);
  }, [businessId, catalogueId, getOne, initialCatalogue]);

  useEffect(() => {
    const controller = new AbortController();
    const taskId = window.setTimeout(() => {
      loadCatalogue(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(taskId);
      controller.abort();
    };
  }, [loadCatalogue]);

  const closeDeleteModal = useCallback(() => setShowDeleteModal(false), []);

  async function handleSave(event) {
    event.preventDefault();
    if (isSaving) return;

    const name = form.name.trim();
    const description = form.description.trim();
    if (!name) {
      setActionError("El nombre del menú es obligatorio.");
      return;
    }

    setIsSaving(true);
    setActionError("");
    setSuccessMessage("");
    const response = await update({ name, description });
    if (!mountedRef.current) return;

    setIsSaving(false);
    if (!response.ok) {
      setActionError(getCatalogueErrorMessage(
        response,
        "No pudimos guardar los cambios."
      ));
      return;
    }

    const updatedCatalogue = response.data.catalogue;
    setCatalogue(updatedCatalogue);
    setForm({
      name: updatedCatalogue.name || "",
      description: updatedCatalogue.description || "",
    });
    setSuccessMessage("La información del menú se actualizó correctamente.");
  }

  async function handleTogglePublished() {
    if (isPublishing) return;
    setIsPublishing(true);
    setActionError("");
    setSuccessMessage("");

    const response = catalogue.is_published
      ? await unpublish()
      : await publish();
    if (!mountedRef.current) return;

    setIsPublishing(false);
    if (!response.ok) {
      setActionError(getCatalogueErrorMessage(
        response,
        "No pudimos cambiar el estado del menú."
      ));
      return;
    }

    setCatalogue(response.data.catalogue);
    setSuccessMessage(
      response.data.catalogue.is_published
        ? "El menú se publicó correctamente."
        : "El menú volvió a borrador."
    );
  }

  function handleDeleted() {
    forgetCatalogue(businessId, catalogueId);
    navigate(`/dashboard/businesses/${businessId}/catalogues`, { replace: true });
  }

  if (isLoading && !catalogue) {
    return <DetailLoading />;
  }

  if (loadError || !catalogue) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#111111]">No pudimos abrir este menú</h1>
        <p role="alert" className="mt-2 text-[#666666]">{loadError}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/dashboard/businesses/${businessId}/catalogues`}
            className="cursor-pointer rounded-xl border border-[#D9D9D9] px-4 py-2.5 font-semibold text-[#2A2A2A]"
          >
            Volver a Menús
          </Link>
          <button
            type="button"
            onClick={() => loadCatalogue()}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-4 py-2.5 font-semibold text-[#111111] hover:bg-[#E8C93D]"
          >
            <RefreshCw size={17} /> Reintentar
          </button>
        </div>
      </section>
    );
  }

  const hasChanges = (
    form.name.trim() !== catalogue.name
    || form.description.trim() !== (catalogue.description || "")
  );

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <Link
        to={`/dashboard/businesses/${businessId}/catalogues`}
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111]"
      >
        <ArrowLeft size={17} /> Volver a Menús
      </Link>

      <header className="rounded-2xl border border-[#E9DDB7] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#8A7420]">{business?.name || "Negocio"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="truncate text-3xl font-bold text-[#111111]">{catalogue.name}</h1>
              <CatalogueStatusBadge isPublished={catalogue.is_published} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTogglePublished}
              disabled={isPublishing || isSaving}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-4 py-2.5 font-semibold text-[#111111] hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {catalogue.is_published ? <Undo2 size={17} /> : <Send size={17} />}
              {isPublishing
                ? "Procesando..."
                : catalogue.is_published ? "Despublicar" : "Publicar"}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isPublishing || isSaving}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={17} /> Eliminar
            </button>
          </div>
        </div>
      </header>

      {successMessage && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <form onSubmit={handleSave} className="rounded-2xl border border-[#E9DDB7] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#111111]">Información general</h2>
            <p className="mt-1 text-sm text-[#666666]">Edita el nombre y la descripción del menú.</p>
          </div>
          <button
            type="submit"
            disabled={isSaving || !hasChanges || !form.name.trim()}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2A2A2A] px-4 py-2.5 font-semibold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={17} /> {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="mt-6 grid gap-5">
          <label>
            <span className="mb-2 block text-sm font-semibold text-[#2A2A2A]">Nombre del menú</span>
            <input
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({ ...current, name: event.target.value }));
                setActionError("");
              }}
              maxLength={64}
              disabled={isSaving}
              required
              className="w-full rounded-xl border border-[#D9D9D9] bg-[#FFFDF5] px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40 disabled:opacity-60"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-[#2A2A2A]">Descripción</span>
            <textarea
              value={form.description}
              onChange={(event) => {
                setForm((current) => ({ ...current, description: event.target.value }));
                setActionError("");
              }}
              rows={4}
              disabled={isSaving}
              className="w-full resize-y rounded-xl border border-[#D9D9D9] bg-[#FFFDF5] px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40 disabled:opacity-60"
              placeholder="Agrega una descripción opcional"
            />
          </label>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}/categories`}
          className="group cursor-pointer rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E8C93D]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE05A] text-[#111111]"><FolderOpen size={21} /></div>
            <div><h2 className="font-bold text-[#111111]">Categorías</h2><p className="mt-1 text-sm text-[#666666]">Organiza los productos de este menú.</p><span className="mt-3 inline-block text-sm font-semibold text-[#8A7420] group-hover:underline">Administrar categorías</span></div>
          </div>
        </Link>
        <Link
          to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}/products`}
          className="group cursor-pointer rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E8C93D]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE05A] text-[#111111]"><PackageOpen size={21} /></div>
            <div><h2 className="font-bold text-[#111111]">Productos</h2><p className="mt-1 text-sm text-[#666666]">Crea productos con o sin categoría.</p><span className="mt-3 inline-block text-sm font-semibold text-[#8A7420] group-hover:underline">Administrar productos</span></div>
          </div>
        </Link>
        <Link
          to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}/templates`}
          className="group cursor-pointer rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E8C93D]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE05A] text-[#111111]"><Palette size={21} /></div>
            <div><h2 className="font-bold text-[#111111]">Plantillas</h2><p className="mt-1 text-sm text-[#666666]">Elige el diseño y personaliza la identidad del menú.</p><span className="mt-3 inline-block text-sm font-semibold text-[#8A7420] group-hover:underline">Personalizar plantilla</span></div>
          </div>
        </Link>
        <Link
          to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}/qr`}
          className="group cursor-pointer rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E8C93D]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE05A] text-[#111111]"><QrCode size={21} /></div>
            <div><h2 className="font-bold text-[#111111]">URL y código QR</h2><p className="mt-1 text-sm text-[#666666]">Publica y comparte este menú con tus clientes.</p><span className="mt-3 inline-block text-sm font-semibold text-[#8A7420] group-hover:underline">Administrar publicación</span></div>
          </div>
        </Link>
        <Link
          to={`/dashboard/businesses/${businessId}/catalogues/${catalogueId}/analytics`}
          className="group cursor-pointer rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E8C93D]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE05A] text-[#111111]"><BarChart3 size={21} /></div>
            <div><h2 className="font-bold text-[#111111]">Analíticas</h2><p className="mt-1 text-sm text-[#666666]">Consulta visitas, interés, dispositivos y fuentes de acceso.</p><span className="mt-3 inline-block text-sm font-semibold text-[#8A7420] group-hover:underline">Ver analíticas</span></div>
          </div>
        </Link>
      </div>

      {showDeleteModal && (
        <DeleteCatalogueModal
          catalogue={catalogue}
          onClose={closeDeleteModal}
          onDelete={remove}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}

function DetailLoading() {
  return (
    <div aria-label="Cargando menú" className="mx-auto max-w-7xl animate-pulse space-y-6">
      <div className="h-6 w-32 rounded bg-[#D9D9D9]" />
      <div className="h-36 rounded-2xl border border-[#E9DDB7] bg-white" />
      <div className="h-72 rounded-2xl border border-[#E9DDB7] bg-white" />
    </div>
  );
}
