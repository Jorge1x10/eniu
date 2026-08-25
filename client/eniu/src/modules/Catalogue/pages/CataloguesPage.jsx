import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Plus, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { useBusiness } from "../../Business/services/useBusiness";
import CatalogueCard from "../components/CatalogueCard";
import CreateCatalogueModal from "../components/CreateCatalogueModal";
import DeleteCatalogueModal from "../components/DeleteCatalogueModal";
import { forgetCatalogue } from "../utils/lastCatalogue";
import {
  getCatalogueErrorMessage,
  useCatalogueService,
} from "../services/catalogueService";

export default function CataloguesPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const {
    businesses,
    selectedBusiness,
    selectBusiness,
    isLoadingBusinesses,
  } = useBusiness();
  const { list, create, remove, publish, unpublish } = useCatalogueService(businessId);

  const [catalogues, setCatalogues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [catalogueToDelete, setCatalogueToDelete] = useState(null);
  const [processingId, setProcessingId] = useState(null);
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

  const loadCatalogues = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError("");
    const response = await list({ signal });
    if (response.aborted || !mountedRef.current) return;

    if (!response.ok) {
      setCatalogues([]);
      setLoadError(getCatalogueErrorMessage(
        response,
        "No pudimos cargar los menús. Intenta nuevamente."
      ));
      setIsLoading(false);
      return;
    }

    setCatalogues(response.data?.catalogues || []);
    setIsLoading(false);
  }, [list]);

  useEffect(() => {
    const controller = new AbortController();
    const taskId = window.setTimeout(() => {
      loadCatalogues(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(taskId);
      controller.abort();
    };
  }, [loadCatalogues]);

  const closeCreateModal = useCallback(() => setIsCreateOpen(false), []);
  const closeDeleteModal = useCallback(() => setCatalogueToDelete(null), []);

  function handleCreated(catalogue) {
    setCatalogues((current) => [catalogue, ...current]);
    setIsCreateOpen(false);
    navigate(`/dashboard/businesses/${businessId}/catalogues/${catalogue.id}`, {
      state: { catalogue },
    });
  }

  async function handleTogglePublished(catalogue) {
    if (processingId) return;
    setProcessingId(catalogue.id);
    setActionError("");
    setSuccessMessage("");

    const response = catalogue.is_published
      ? await unpublish(catalogue.id)
      : await publish(catalogue.id);
    if (!mountedRef.current) return;

    setProcessingId(null);
    if (!response.ok) {
      setActionError(getCatalogueErrorMessage(
        response,
        "No pudimos cambiar el estado del menú."
      ));
      return;
    }

    const updatedCatalogue = response.data.catalogue;
    setCatalogues((current) => current.map((item) =>
      item.id === updatedCatalogue.id ? updatedCatalogue : item
    ));
    setSuccessMessage(
      updatedCatalogue.is_published
        ? "El menú se publicó correctamente."
        : "El menú volvió a borrador."
    );
  }

  function handleDeleted(catalogueId) {
    forgetCatalogue(businessId, catalogueId);
    setCatalogues((current) => current.filter((item) => item.id !== catalogueId));
    setCatalogueToDelete(null);
    setSuccessMessage("El menú se eliminó correctamente.");
  }

  function retryLoading() {
    loadCatalogues();
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#8A7420]">
            {isLoadingBusinesses ? "Cargando negocio..." : business?.name || "Negocio"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#111111]">Menús</h1>
          <p className="mt-1 text-sm text-[#666666]">
            Administra los menús que compartes con tus clientes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          disabled={isLoading || Boolean(loadError)}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold text-[#111111] hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={18} /> Crear menú
        </button>
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

      {isLoading ? (
        <LoadingGrid />
      ) : loadError ? (
        <div className="rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center shadow-sm">
          <p role="alert" className="font-semibold text-[#111111]">{loadError}</p>
          <button
            type="button"
            onClick={retryLoading}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 py-2.5 font-semibold text-white hover:bg-[#111111]"
          >
            <RefreshCw size={17} /> Reintentar
          </button>
        </div>
      ) : catalogues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D7C990] bg-[#FFFDF5] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE05A] text-[#111111]">
            <BookOpen size={26} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-[#111111]">Todavía no tienes menús</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#666666]">
            Crea tu primer menú para comenzar a agregar categorías y productos.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold text-[#111111] hover:bg-[#E8C93D]"
          >
            <Plus size={18} /> Crear menú
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalogues.map((catalogue) => (
            <CatalogueCard
              key={catalogue.id}
              catalogue={catalogue}
              businessId={businessId}
              isProcessing={processingId === catalogue.id}
              onTogglePublished={handleTogglePublished}
              onDelete={setCatalogueToDelete}
            />
          ))}
        </div>
      )}

      {isCreateOpen && (
        <CreateCatalogueModal
          onClose={closeCreateModal}
          onCreate={create}
          onCreated={handleCreated}
        />
      )}
      {catalogueToDelete && (
        <DeleteCatalogueModal
          catalogue={catalogueToDelete}
          onClose={closeDeleteModal}
          onDelete={remove}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}

function LoadingGrid() {
  return (
    <div aria-label="Cargando menús" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-2xl border border-[#E9DDB7] bg-white p-5">
          <div className="h-6 w-24 rounded-full bg-[#E9DDB7]" />
          <div className="mt-5 h-6 w-2/3 rounded bg-[#D9D9D9]" />
          <div className="mt-3 h-4 w-full rounded bg-[#EFEFEF]" />
          <div className="mt-2 h-4 w-4/5 rounded bg-[#EFEFEF]" />
        </div>
      ))}
    </div>
  );
}
