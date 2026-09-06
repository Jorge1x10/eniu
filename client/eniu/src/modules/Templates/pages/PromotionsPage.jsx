import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Megaphone, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router";

import { useBusiness } from "../../Business/services/useBusiness";
import { useCategoryService } from "../../Catalogue/services/categoryService";
import { useProductService } from "../../Catalogue/services/productService";
import DeleteContentModal from "../../Catalogue/components/DeleteContentModal";
import PromotionFormModal from "../components/PromotionFormModal";
import { getPromotionErrorMessage, usePromotionService } from "../services/promotionService";
import { useTranslation } from "react-i18next";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function describeDays(t, daysOfWeek) {
  if (!daysOfWeek || daysOfWeek.length === 0) return t("Todos los días");
  return daysOfWeek.map((day) => t(DAY_LABELS[day])).join(", ");
}

export default function PromotionsPage() {
  const { t } = useTranslation();

  const { businessId, catalogueId } = useParams();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  const { list, create, update, remove } = usePromotionService(businessId, catalogueId);
  const { list: listCategories } = useCategoryService(businessId, catalogueId);
  const { list: listProducts } = useProductService(businessId, catalogueId);
  const [promotions, setPromotions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
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
    const [promotionResponse, categoryResponse, productResponse] = await Promise.all([
      list({ signal }),
      listCategories({ signal }),
      listProducts({ signal }),
    ]);
    if (promotionResponse.aborted || categoryResponse.aborted || productResponse.aborted || !mountedRef.current) return;
    if (!promotionResponse.ok) {
      setLoadError(getPromotionErrorMessage(promotionResponse, t("No pudimos cargar las promociones. Intenta nuevamente.")));
      setIsLoading(false);
      return;
    }
    setPromotions(promotionResponse.data?.promotions || []);
    if (categoryResponse.ok) setCategories(categoryResponse.data?.categories || []);
    if (productResponse.ok) setProducts(productResponse.data?.products || []);
    setIsLoading(false);
  }, [list, listCategories, listProducts]);

  useEffect(() => {
    const controller = new AbortController();
    const taskId = window.setTimeout(() => loadData(controller.signal), 0);
    return () => { window.clearTimeout(taskId); controller.abort(); };
  }, [loadData]);

  function savedPromotion(promotion, wasEditing) {
    setPromotions((current) => wasEditing
      ? current.map((item) => item.id === promotion.id ? promotion : item)
      : [...current, promotion]);
    setEditing(null);
    setIsCreating(false);
    setSuccess(wasEditing ? t("La promoción se actualizó correctamente.") : t("La promoción se creó correctamente."));
  }

  function deletedPromotion(promotionId) {
    setPromotions((current) => current.filter((item) => item.id !== promotionId));
    setDeleting(null);
    setSuccess(t("La promoción se eliminó."));
  }

  const cataloguePath = `/dashboard/businesses/${businessId}/catalogues/${catalogueId}`;
  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={cataloguePath} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111]"><ArrowLeft size={17} /> {t("Volver al menú")}</Link>
      </div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-bold text-[#111111]">{t("Promociones")}</h1>
          <p className="mt-1 text-sm text-[#666666]">{t("Resalta productos en el menú durante días específicos, sin cambiar precios.")}</p>
        </div>
        <button type="button" onClick={() => setIsCreating(true)} disabled={isLoading || Boolean(loadError)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={18} /> {t("Crear promoción")}</button>
      </header>
      {success && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}

      {isLoading ? <LoadingGrid label={t("Cargando promociones")} /> : loadError ? (
        <ErrorState message={loadError} onRetry={() => loadData()} />
      ) : promotions.length === 0 ? (
        <EmptyState icon={<Megaphone size={26} />} title={t("Todavía no tienes promociones")} description={t("Crea una promoción para resaltar productos en días específicos.")} action={t("Crear promoción")} onAction={() => setIsCreating(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promotion) => (
            <article key={promotion.id} className="flex min-h-44 flex-col rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-[#111111]">{promotion.name}</h2>
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${promotion.is_active ? "bg-[#F8E8AE] text-[#5E501A]" : "bg-[#EFEFEF] text-[#666666]"}`}>
                    {promotion.is_active ? t("Activa") : t("Inactiva")}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#666666]">{t("Etiqueta")}: {promotion.badge_label || promotion.name}</p>
              <p className="mt-1 flex-1 text-sm leading-6 text-[#666666]">{describeDays(t, promotion.days_of_week)}</p>
              <div className="mt-4 flex gap-2 border-t border-[#EFE8D1] pt-4">
                <button type="button" onClick={() => setEditing(promotion)} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2A2A2A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#111111]"><Pencil size={15} /> {t("Editar")}</button>
                <button type="button" onClick={() => setDeleting(promotion)} aria-label={t("Eliminar {{name}}", { name: promotion.name })} className="cursor-pointer rounded-xl border border-red-200 p-2.5 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(isCreating || editing) && (
        <PromotionFormModal
          promotion={editing}
          categories={categories}
          products={products}
          onClose={() => { setIsCreating(false); setEditing(null); }}
          onSave={(data) => editing ? update(editing.id, data) : create(data)}
          onSaved={(promotion) => savedPromotion(promotion, Boolean(editing))}
        />
      )}
      {deleting && <DeleteContentModal item={deleting} type="promotion" onClose={() => setDeleting(null)} onDelete={remove} onDeleted={deletedPromotion} getErrorMessage={getPromotionErrorMessage} />}
    </section>
  );
}

function LoadingGrid({ label }) {
  return <div aria-label={label} className="grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-44 rounded-2xl border border-[#E9DDB7] bg-white" />)}</div>;
}

function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();

  return <div className="rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center"><p role="alert" className="font-semibold">{message}</p><button type="button" onClick={onRetry} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 py-2.5 font-semibold text-white"><RefreshCw size={17} /> {t("Reintentar")}</button></div>;
}

function EmptyState({ icon, title, description, action, onAction }) {
  return <div className="rounded-2xl border border-dashed border-[#D7C990] bg-[#FFFDF5] px-6 py-14 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE05A]">{icon}</span><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-[#666666]">{description}</p><button type="button" onClick={onAction} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D]"><Plus size={18} /> {action}</button></div>;
}
