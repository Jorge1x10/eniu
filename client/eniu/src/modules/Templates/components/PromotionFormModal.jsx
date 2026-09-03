import { useRef, useState } from "react";
import { Megaphone, X } from "lucide-react";

import { getPromotionErrorMessage } from "../services/promotionService";
import AccessibleModal from "../../Catalogue/components/AccessibleModal";
import { useTranslation } from "react-i18next";

const DAY_KEYS = [
  { value: 0, label: "Lun" },
  { value: 1, label: "Mar" },
  { value: 2, label: "Mié" },
  { value: 3, label: "Jue" },
  { value: 4, label: "Vie" },
  { value: 5, label: "Sáb" },
  { value: 6, label: "Dom" },
];

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value].sort((a, b) => a - b);
}

export default function PromotionFormModal({ promotion, categories, products, onClose, onSave, onSaved }) {
  const { t } = useTranslation();

  const isEditing = Boolean(promotion);
  const [name, setName] = useState(promotion?.name || "");
  const [badgeLabel, setBadgeLabel] = useState(promotion?.badge_label || "");
  const [isActive, setIsActive] = useState(promotion?.is_active ?? true);
  const [daysOfWeek, setDaysOfWeek] = useState(promotion?.days_of_week || []);
  const [startDate, setStartDate] = useState(promotion?.start_date || "");
  const [endDate, setEndDate] = useState(promotion?.end_date || "");
  const [categoryIds, setCategoryIds] = useState(promotion?.category_ids || []);
  const [productIds, setProductIds] = useState(promotion?.product_ids || []);
  const [fieldError, setFieldError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef(null);
  const submittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    const normalizedName = name.trim();
    if (!normalizedName) {
      setFieldError(t("Escribe el nombre de la promoción."));
      nameRef.current?.focus();
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setFieldError(t("La fecha de inicio no puede ser posterior a la de fin."));
      return;
    }

    const payload = {
      name: normalizedName,
      badge_label: badgeLabel.trim() || null,
      is_active: isActive,
      days_of_week: daysOfWeek,
      start_date: startDate || null,
      end_date: endDate || null,
      category_ids: categoryIds,
      product_ids: productIds,
    };

    submittingRef.current = true;
    setIsSubmitting(true);
    setRequestError("");
    const response = await onSave(payload);
    submittingRef.current = false;
    setIsSubmitting(false);
    if (!response.ok) {
      setRequestError(getPromotionErrorMessage(response, t("No pudimos guardar la promoción.")));
      return;
    }
    onSaved(response.data.promotion);
  }

  return (
    <AccessibleModal
      labelledBy="promotion-form-title"
      isBusy={isSubmitting}
      onClose={onClose}
      initialFocusRef={nameRef}
      maxWidth="max-w-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE05A]"><Megaphone size={21} /></span>
          <div>
            <h2 id="promotion-form-title" className="text-xl font-bold text-[#111111]">
              {isEditing ? t("Editar promoción") : t("Crear promoción")}
            </h2>
            <p className="mt-1 text-sm text-[#666666]">{t("Resalta productos en el menú durante días específicos.")}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label={t("Cerrar modal")} className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-black/5 disabled:cursor-not-allowed"><X size={20} /></button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="promotion-name" className="text-sm font-semibold text-[#2A2A2A]">{t("Nombre")}</label>
          <input
            ref={nameRef} id="promotion-name" value={name} maxLength={64} disabled={isSubmitting}
            onChange={(event) => { setName(event.target.value); setFieldError(""); setRequestError(""); }}
            aria-invalid={Boolean(fieldError)}
            className="mt-2 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40"
            placeholder={t("Ej. Martes de tacos")}
          />
        </div>

        <div>
          <label htmlFor="promotion-badge" className="text-sm font-semibold text-[#2A2A2A]">{t("Etiqueta")} <span className="font-normal text-[#777777]">{t("(opcional)")}</span></label>
          <input
            id="promotion-badge" value={badgeLabel} maxLength={24} disabled={isSubmitting}
            onChange={(event) => { setBadgeLabel(event.target.value); setRequestError(""); }}
            className="mt-2 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40"
            placeholder={t("Ej. Promo")}
          />
          <p className="mt-1 text-xs text-[#777777]">{t("Si la dejas vacía, usamos el nombre de la promoción.")}</p>
        </div>

        <div>
          <span className="text-sm font-semibold text-[#2A2A2A]">{t("Días de la promoción")}</span>
          <p className="mt-1 text-xs text-[#777777]">{t("Sin días marcados, aplica todos los días.")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAY_KEYS.map((day) => {
              const selected = daysOfWeek.includes(day.value);
              return (
                <button
                  key={day.value} type="button" disabled={isSubmitting}
                  onClick={() => setDaysOfWeek((current) => toggleValue(current, day.value))}
                  aria-pressed={selected}
                  className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-semibold ${selected ? "border-[#E8C93D] bg-[#FFF8DE]" : "border-[#D9D9D9] bg-white hover:border-[#D7C36A]"}`}
                >
                  {t(day.label)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="promotion-start" className="text-sm font-semibold text-[#2A2A2A]">{t("Desde")} <span className="font-normal text-[#777777]">{t("(opcional)")}</span></label>
            <input
              type="date" id="promotion-start" value={startDate} disabled={isSubmitting}
              onChange={(event) => { setStartDate(event.target.value); setFieldError(""); }}
              className="mt-2 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40"
            />
          </div>
          <div>
            <label htmlFor="promotion-end" className="text-sm font-semibold text-[#2A2A2A]">{t("Hasta")} <span className="font-normal text-[#777777]">{t("(opcional)")}</span></label>
            <input
              type="date" id="promotion-end" value={endDate} disabled={isSubmitting}
              onChange={(event) => { setEndDate(event.target.value); setFieldError(""); }}
              className="mt-2 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={isActive} disabled={isSubmitting} onChange={(event) => setIsActive(event.target.checked)} className="h-5 w-5 rounded border-[#D9D9D9] accent-[#FFE05A]" />
          <span className="text-sm font-semibold text-[#2A2A2A]">{t("Promoción activa")}</span>
        </label>

        <div>
          <span className="text-sm font-semibold text-[#2A2A2A]">{t("Categorías incluidas")}</span>
          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white p-3">
            {categories.length === 0 && <p className="text-sm text-[#777777]">{t("Todavía no tienes categorías.")}</p>}
            {categories.map((category) => (
              <label key={category.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox" checked={categoryIds.includes(category.id)} disabled={isSubmitting}
                  onChange={() => setCategoryIds((current) => toggleValue(current, category.id))}
                  className="h-4 w-4 rounded border-[#D9D9D9] accent-[#FFE05A]"
                />
                {category.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold text-[#2A2A2A]">{t("Productos incluidos")}</span>
          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white p-3">
            {products.length === 0 && <p className="text-sm text-[#777777]">{t("Todavía no tienes productos.")}</p>}
            {products.map((product) => (
              <label key={product.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox" checked={productIds.includes(product.id)} disabled={isSubmitting}
                  onChange={() => setProductIds((current) => toggleValue(current, product.id))}
                  className="h-4 w-4 rounded border-[#D9D9D9] accent-[#FFE05A]"
                />
                {product.name}
              </label>
            ))}
          </div>
        </div>

        {fieldError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{fieldError}</p>}
        {requestError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold hover:bg-black/5 disabled:cursor-not-allowed">{t("Cancelar")}</button>
          <button type="submit" disabled={isSubmitting || !name.trim()} className="cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? t("Guardando...") : isEditing ? t("Guardar cambios") : t("Crear promoción")}</button>
        </div>
      </form>
    </AccessibleModal>
  );
}
