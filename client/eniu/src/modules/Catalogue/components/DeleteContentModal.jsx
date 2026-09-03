import { useRef, useState } from "react";
import { Trash2, X } from "lucide-react";

import AccessibleModal from "./AccessibleModal";
import { useTranslation } from "react-i18next";

export default function DeleteContentModal({ item, type, onClose, onDelete, onDeleted, getErrorMessage }) {
  const { t } = useTranslation();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef(null);
  const deletingRef = useRef(false);
  const isCategory = type === "category";
  const isPromotion = type === "promotion";

  async function confirmDelete() {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    setError("");
    const response = await onDelete(item.id);
    deletingRef.current = false;
    setIsDeleting(false);
    if (!response.ok) {
      // Frases completas y no trozos concatenados: el orden de las palabras y
      // el artículo cambian de un idioma a otro, y armarlas por piezas produce
      // traducciones que suenan a máquina.
      setError(getErrorMessage(response, isCategory
        ? t("No pudimos eliminar la categoría.")
        : isPromotion
          ? t("No pudimos eliminar la promoción.")
          : t("No pudimos eliminar el producto.")));
      return;
    }
    onDeleted(item.id);
  }

  return (
    <AccessibleModal
      labelledBy="delete-content-title" describedBy="delete-content-description"
      role="alertdialog" maxWidth="max-w-md" isBusy={isDeleting} onClose={onClose}
      initialFocusRef={confirmRef}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-700"><Trash2 size={20} /></span>
        <button type="button" onClick={onClose} disabled={isDeleting} aria-label={t("Cerrar confirmación")} className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-black/5 disabled:cursor-not-allowed"><X size={20} /></button>
      </div>
      <h2 id="delete-content-title" className="mt-5 text-xl font-bold text-[#111111]">{isCategory
        ? t("¿Eliminar la categoría “{{name}}”?", { name: item.name })
        : isPromotion
          ? t("¿Eliminar la promoción “{{name}}”?", { name: item.name })
          : t("¿Eliminar el producto “{{name}}”?", { name: item.name })}</h2>
      <p id="delete-content-description" className="mt-2 text-sm leading-6 text-[#666666]">
        {isCategory
          ? t("Sus productos no se eliminarán; quedarán disponibles en “Sin categoría”.")
          : t("Esta acción no se puede deshacer.")}
      </p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isDeleting} className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold hover:bg-black/5 disabled:cursor-not-allowed">{t("Cancelar")}</button>
        <button ref={confirmRef} type="button" onClick={confirmDelete} disabled={isDeleting} className="cursor-pointer rounded-xl bg-[#DC2626] px-4 py-2.5 font-semibold text-white hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50">{isDeleting ? t("Eliminando...") : isCategory ? t("Eliminar categoría") : isPromotion ? t("Eliminar promoción") : t("Eliminar producto")}</button>
      </div>
    </AccessibleModal>
  );
}
