import { useRef, useState } from "react";
import { FolderPlus, X } from "lucide-react";

import { getCategoryErrorMessage } from "../services/categoryService";
import AccessibleModal from "./AccessibleModal";
import { useTranslation } from "react-i18next";

export default function CategoryFormModal({ category, onClose, onSave, onSaved }) {
  const { t } = useTranslation();

  const isEditing = Boolean(category);
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [fieldError, setFieldError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef(null);
  const submittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    if (!normalizedName) {
      setFieldError(t("Escribe el nombre de la categoría."));
      nameRef.current?.focus();
      return;
    }
    if (normalizedName.length > 64) {
      setFieldError(t("El nombre no puede superar 64 caracteres."));
      nameRef.current?.focus();
      return;
    }

    const payload = isEditing ? {} : {
      name: normalizedName,
      description: normalizedDescription,
    };
    if (isEditing && normalizedName !== category.name) payload.name = normalizedName;
    if (isEditing && normalizedDescription !== (category.description || "")) {
      payload.description = normalizedDescription;
    }
    if (isEditing && Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setRequestError("");
    const response = await onSave(payload);
    submittingRef.current = false;
    setIsSubmitting(false);
    if (!response.ok) {
      setRequestError(getCategoryErrorMessage(response, t("No pudimos guardar la categoría.")));
      return;
    }
    onSaved(response.data.category);
  }

  return (
    <AccessibleModal
      labelledBy="category-form-title"
      isBusy={isSubmitting}
      onClose={onClose}
      initialFocusRef={nameRef}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE05A]"><FolderPlus size={21} /></span>
          <div>
            <h2 id="category-form-title" className="text-xl font-bold text-[#111111]">
              {isEditing ? t("Editar categoría") : t("Crear categoría")}
            </h2>
            <p className="mt-1 text-sm text-[#666666]">{t("Organiza los productos de este menú.")}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label={t("Cerrar modal")} className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-black/5 disabled:cursor-not-allowed"><X size={20} /></button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6">
        <label htmlFor="category-name" className="text-sm font-semibold text-[#2A2A2A]">{t("Nombre")}</label>
        <input
          ref={nameRef} id="category-name" value={name} maxLength={64} disabled={isSubmitting}
          onChange={(event) => { setName(event.target.value); setFieldError(""); setRequestError(""); }}
          aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "category-name-error" : undefined}
          className="mt-2 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40"
          placeholder={t("Ej. Bebidas")}
        />
        {fieldError && <p id="category-name-error" className="mt-2 text-sm text-red-700">{fieldError}</p>}

        <label htmlFor="category-description" className="mt-5 block text-sm font-semibold text-[#2A2A2A]">{t("Descripción")} <span className="font-normal text-[#777777]">{t("(opcional)")}</span></label>
        <textarea
          id="category-description" value={description} rows={4} disabled={isSubmitting}
          onChange={(event) => { setDescription(event.target.value); setRequestError(""); }}
          className="mt-2 w-full resize-y rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40"
          placeholder={t("Refrescos, aguas y bebidas preparadas")}
        />
        {requestError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold hover:bg-black/5 disabled:cursor-not-allowed">{t("Cancelar")}</button>
          <button type="submit" disabled={isSubmitting || !name.trim()} className="cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Guardando..." : isEditing ? t("Guardar cambios") : t("Crear categoría")}</button>
        </div>
      </form>
    </AccessibleModal>
  );
}
