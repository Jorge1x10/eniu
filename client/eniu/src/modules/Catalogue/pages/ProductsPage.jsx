import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Image, PackageOpen, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router";

import PlanBadge from "../../auth/components/PlanBadge";
import { usePlan } from "../../auth/hooks/usePlan";
import { useBusiness } from "../../Business/services/useBusiness";
import DeleteContentModal from "../components/DeleteContentModal";
import ProductFormModal from "../components/ProductFormModal";
import { useCategoryService } from "../services/categoryService";
import { useCatalogueService } from "../services/catalogueService";
import { getProductErrorMessage, useProductService } from "../services/productService";

const ALL = "all";
const UNCATEGORIZED = "uncategorized";
const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export default function ProductsPage() {
  const { businessId, catalogueId } = useParams();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  const {
    list: listProducts,
    create: createProduct,
    update: updateProduct,
    remove: removeProduct,
  } = useProductService(businessId, catalogueId);
  const { list: listCategories } = useCategoryService(businessId, catalogueId);
  const { getOne } = useCatalogueService(businessId, catalogueId);
  const [products, setProducts] = useState([]);
  const { limits, isWithin } = usePlan();
  const atProductLimit = !isWithin(products.length, limits.max_products_per_catalogue);
  const [categories, setCategories] = useState([]);
  const [catalogue, setCatalogue] = useState(null);
  const [filter, setFilter] = useState(ALL);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
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
    const [productResponse, categoryResponse, catalogueResponse] = await Promise.all([
      listProducts({ signal }),
      listCategories({ signal }),
      getOne({ signal }),
    ]);
    if (productResponse.aborted || categoryResponse.aborted || catalogueResponse.aborted || !mountedRef.current) return;
    if (!productResponse.ok) {
      setLoadError(getProductErrorMessage(productResponse, "No pudimos cargar los productos. Intenta nuevamente."));
      setIsLoading(false);
      return;
    }
    if (!categoryResponse.ok) {
      setLoadError("No pudimos cargar las categorías de este menú. Intenta nuevamente.");
      setIsLoading(false);
      return;
    }
    setProducts(productResponse.data?.products || []);
    setCategories(categoryResponse.data?.categories || []);
    if (catalogueResponse.ok) setCatalogue(catalogueResponse.data?.catalogue || null);
    setIsLoading(false);
  }, [getOne, listCategories, listProducts]);

  useEffect(() => {
    const controller = new AbortController();
    const taskId = window.setTimeout(() => loadData(controller.signal), 0);
    return () => { window.clearTimeout(taskId); controller.abort(); };
  }, [loadData]);

  const categoryNames = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const visibleProducts = useMemo(() => products.filter((product) => {
    if (filter === ALL) return true;
    if (filter === UNCATEGORIZED) return product.category_id === null;
    return product.category_id === filter;
  }), [filter, products]);

  function savedProduct(product, wasEditing) {
    setProducts((current) => wasEditing
      ? current.map((item) => item.id === product.id ? product : item)
      : [...current, product]);
    setEditing(null);
    setIsCreating(false);
    setSuccess(wasEditing ? "El producto se actualizó correctamente." : "El producto se creó correctamente.");
  }

  function deletedProduct(productId) {
    setProducts((current) => current.filter((item) => item.id !== productId));
    setDeleting(null);
    setSuccess("El producto se eliminó correctamente.");
  }

  const cataloguePath = `/dashboard/businesses/${businessId}/catalogues/${catalogueId}`;
  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={cataloguePath} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111]"><ArrowLeft size={17} /> Volver al menú</Link>
        <Link to={`${cataloguePath}/categories`} className="cursor-pointer rounded-xl border border-[#D9D9D9] px-4 py-2 text-sm font-semibold hover:bg-white">Administrar categorías</Link>
      </div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-[#8A7420]">{catalogue?.name || "Menú"}</p><h1 className="mt-1 text-3xl font-bold">Productos</h1><p className="mt-1 text-sm text-[#666666]">Administra todos los productos del menú.</p></div>
        <div className="flex flex-wrap items-center gap-2">{atProductLimit && <PlanBadge label="Productos ilimitados en Esencial" />}<button type="button" onClick={() => setIsCreating(true)} disabled={isLoading || Boolean(loadError) || atProductLimit} title={atProductLimit ? `Tu plan actual permite hasta ${limits.max_products_per_catalogue} productos por menú.` : undefined} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={18} /> Crear producto</button></div>
      </header>
      {success && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}

      {!isLoading && !loadError && products.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-[#E9DDB7] bg-white p-4 sm:flex-row sm:items-center">
          <label htmlFor="product-filter" className="text-sm font-semibold text-[#2A2A2A]">Filtrar por categoría</label>
          <select id="product-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="cursor-pointer rounded-xl border border-[#D9D9D9] bg-[#FFFDF5] px-4 py-2.5 outline-none sm:ml-auto sm:min-w-60">
            <option value={ALL}>Todos</option><option value={UNCATEGORIZED}>Sin categoría</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
      )}

      {isLoading ? <LoadingGrid /> : loadError ? <ErrorState message={loadError} onRetry={() => loadData()} /> : products.length === 0 ? (
        <EmptyState onAction={() => setIsCreating(true)} />
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D7C990] bg-[#FFFDF5] p-10 text-center"><h2 className="text-lg font-bold">No hay productos en esta categoría.</h2><button type="button" onClick={() => setFilter(ALL)} className="mt-4 cursor-pointer font-semibold text-[#8A7420] underline">Ver todos</button></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => <ProductCard key={product.id} product={product} categoryName={categoryNames.get(product.category_id)} onEdit={setEditing} onDelete={setDeleting} />)}
        </div>
      )}

      {(isCreating || editing) && <ProductFormModal product={editing} categories={categories} categoriesPath={`${cataloguePath}/categories`} onClose={() => { setIsCreating(false); setEditing(null); }} onSave={(data) => editing ? updateProduct(editing.id, data) : createProduct(data)} onSaved={(product) => savedProduct(product, Boolean(editing))} />}
      {deleting && <DeleteContentModal item={deleting} type="product" onClose={() => setDeleting(null)} onDelete={removeProduct} onDeleted={deletedProduct} getErrorMessage={getProductErrorMessage} />}
    </section>
  );
}

function ProductCard({ product, categoryName, onEdit, onDelete }) {
  const numericPrice = product.price === null ? null : Number(product.price);
  const pictures = Array.isArray(product.pictures) ? product.pictures : [];
  const mainPicture = pictures.find((picture) => picture.is_default) || pictures[0];
  let imageUrl = mainPicture?.url || null;
  if (imageUrl && !imageUrl.startsWith("http")) {
    try {
      imageUrl = `${new URL(import.meta.env.VITE_API_URL).origin}${imageUrl}`;
    } catch {
      imageUrl = mainPicture?.url || null;
    }
  }
  return (
    <article className="flex min-h-64 flex-col overflow-hidden rounded-2xl border border-[#E9DDB7] bg-white shadow-sm">
      <div className="flex h-28 items-center justify-center bg-[#F8E8AE]/60 text-[#8A7420]">{imageUrl ? <img src={imageUrl} alt={`Imagen de ${product.name}`} className="h-full w-full object-cover" /> : <Image size={28} aria-hidden="true" />}</div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 truncate text-lg font-bold">{product.name}</h2><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_available ? "bg-green-50 text-green-700" : "bg-[#EFEFEF] text-[#666666]"}`}>{product.is_available ? "Disponible" : "No disponible"}</span></div>
        <p className="mt-2 line-clamp-2 text-sm text-[#666666]">{product.description || "Sin descripción"}</p>
        <div className="mt-4 flex items-center justify-between gap-3"><span className="rounded-full bg-[#F8E8AE] px-2.5 py-1 text-xs font-semibold text-[#5E501A]">{categoryName || "Sin categoría"}</span><strong>{numericPrice === null ? "Sin precio" : currency.format(numericPrice)}</strong></div>
        {product.updated_at && <p className="mt-3 text-xs text-[#777777]">Actualizado {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(product.updated_at))}</p>}
        <div className="mt-4 flex gap-2 border-t border-[#EFE8D1] pt-4"><button type="button" onClick={() => onEdit(product)} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2A2A2A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#111111]"><Pencil size={15} /> Editar</button><button type="button" onClick={() => onDelete(product)} aria-label={`Eliminar ${product.name}`} className="cursor-pointer rounded-xl border border-red-200 p-2.5 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button></div>
      </div>
    </article>
  );
}

function LoadingGrid() { return <div aria-label="Cargando productos" className="grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-64 rounded-2xl border border-[#E9DDB7] bg-white" />)}</div>; }
function ErrorState({ message, onRetry }) { return <div className="rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center"><p role="alert" className="font-semibold">{message}</p><button type="button" onClick={onRetry} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 py-2.5 font-semibold text-white"><RefreshCw size={17} /> Reintentar</button></div>; }
function EmptyState({ onAction }) { return <div className="rounded-2xl border border-dashed border-[#D7C990] bg-[#FFFDF5] px-6 py-14 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE05A]"><PackageOpen size={26} /></span><h2 className="mt-5 text-xl font-bold">Todavía no tienes productos</h2><p className="mt-2 text-sm text-[#666666]">Crea tu primer producto para comenzar a construir este menú.</p><button type="button" onClick={onAction} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D]"><Plus size={18} /> Crear producto</button></div>; }
