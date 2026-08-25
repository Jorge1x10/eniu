import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, FolderOpen, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router";

import { useBusiness } from "../../Business/services/useBusiness";
import CategoryFormModal from "../components/CategoryFormModal";
import DeleteContentModal from "../components/DeleteContentModal";
import { getCategoryErrorMessage, useCategoryService } from "../services/categoryService";
import { useCatalogueService } from "../services/catalogueService";

export default function CategoriesPage() {
  const { businessId, catalogueId } = useParams();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  const { list, create, update, remove } = useCategoryService(businessId, catalogueId);
  const { getOne } = useCatalogueService(businessId, catalogueId);
  const [categories, setCategories] = useState([]);
  const [catalogue, setCatalogue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const business = businesses.find((item) => item.id === businessId);
    if (business && selectedBusiness?.id !== businessId) selectBusiness(businessId);
  }, [businessId, businesses, selectBusiness, selectedBusiness?.id]);

  const loadData = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError("");
    const [categoryResponse, catalogueResponse] = await Promise.all([
      list({ signal }),
      getOne({ signal }),
    ]);
    if (categoryResponse.aborted || catalogueResponse.aborted || !mountedRef.current) return;
    if (!categoryResponse.ok) {
      setLoadError(getCategoryErrorMessage(categoryResponse, "No pudimos cargar las categorías. Intenta nuevamente."));
      setIsLoading(false);
      return;
    }
    setCategories(categoryResponse.data?.categories || []);
    if (catalogueResponse.ok) setCatalogue(catalogueResponse.data?.catalogue || null);
    setIsLoading(false);
  }, [getOne, list]);

  useEffect(() => {
    const controller = new AbortController();
    const taskId = window.setTimeout(() => loadData(controller.signal), 0);
    return () => { window.clearTimeout(taskId); controller.abort(); };
  }, [loadData]);

  function savedCategory(category, wasEditing) {
    setCategories((current) => wasEditing
      ? current.map((item) => item.id === category.id ? category : item)
      : [...current, category]);
    setEditing(null);
    setIsCreating(false);
    setSuccess(wasEditing ? "La categoría se actualizó correctamente." : "La categoría se creó correctamente.");
  }

  function deletedCategory(categoryId) {
    setCategories((current) => current.filter((item) => item.id !== categoryId));
    setDeleting(null);
    setSuccess("La categoría se eliminó. Sus productos ahora están sin categoría.");
  }

  const cataloguePath = `/dashboard/businesses/${businessId}/catalogues/${catalogueId}`;
  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={cataloguePath} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111]"><ArrowLeft size={17} /> Volver al menú</Link>
        <Link to={`${cataloguePath}/products`} className="cursor-pointer rounded-xl border border-[#D9D9D9] px-4 py-2 text-sm font-semibold hover:bg-white">Ver productos</Link>
      </div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#8A7420]">{catalogue?.name || "Menú"}</p>
          <h1 className="mt-1 text-3xl font-bold text-[#111111]">Categorías</h1>
          <p className="mt-1 text-sm text-[#666666]">Organiza los productos de este menú.</p>
        </div>
        <button type="button" onClick={() => setIsCreating(true)} disabled={isLoading || Boolean(loadError)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={18} /> Crear categoría</button>
      </header>
      {success && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}

      {isLoading ? <LoadingGrid label="Cargando categorías" /> : loadError ? (
        <ErrorState message={loadError} onRetry={() => loadData()} />
      ) : categories.length === 0 ? (
        <EmptyState icon={<FolderOpen size={26} />} title="Todavía no tienes categorías" description="Crea categorías para organizar los productos de este menú." action="Crear categoría" onAction={() => setIsCreating(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="flex min-h-44 flex-col rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="truncate text-lg font-bold text-[#111111]">{category.name}</h2><span className="mt-2 inline-block rounded-full bg-[#F8E8AE] px-2.5 py-1 text-xs font-semibold text-[#5E501A]">Visible</span></div>
              </div>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#666666]">{category.description || "Sin descripción"}</p>
              <div className="mt-4 flex gap-2 border-t border-[#EFE8D1] pt-4">
                <button type="button" onClick={() => setEditing(category)} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2A2A2A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#111111]"><Pencil size={15} /> Editar</button>
                <button type="button" onClick={() => setDeleting(category)} aria-label={`Eliminar ${category.name}`} className="cursor-pointer rounded-xl border border-red-200 p-2.5 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(isCreating || editing) && <CategoryFormModal category={editing} onClose={() => { setIsCreating(false); setEditing(null); }} onSave={(data) => editing ? update(editing.id, data) : create(data)} onSaved={(category) => savedCategory(category, Boolean(editing))} />}
      {deleting && <DeleteContentModal item={deleting} type="category" onClose={() => setDeleting(null)} onDelete={remove} onDeleted={deletedCategory} getErrorMessage={getCategoryErrorMessage} />}
    </section>
  );
}

function LoadingGrid({ label }) {
  return <div aria-label={label} className="grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-44 rounded-2xl border border-[#E9DDB7] bg-white" />)}</div>;
}

function ErrorState({ message, onRetry }) {
  return <div className="rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center"><p role="alert" className="font-semibold">{message}</p><button type="button" onClick={onRetry} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 py-2.5 font-semibold text-white"><RefreshCw size={17} /> Reintentar</button></div>;
}

function EmptyState({ icon, title, description, action, onAction }) {
  return <div className="rounded-2xl border border-dashed border-[#D7C990] bg-[#FFFDF5] px-6 py-14 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE05A]">{icon}</span><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-[#666666]">{description}</p><button type="button" onClick={onAction} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D]"><Plus size={18} /> {action}</button></div>;
}
