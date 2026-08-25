import { useRef, useState } from "react";
import { Trash2, X } from "lucide-react";

import AccessibleModal from "./AccessibleModal";

export default function DeleteContentModal({ item, type, onClose, onDelete, onDeleted, getErrorMessage }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef(null);
  const deletingRef = useRef(false);
  const isCategory = type === "category";
  const label = isCategory ? "categoría" : "producto";

  async function confirmDelete() {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    setError("");
    const response = await onDelete(item.id);
    deletingRef.current = false;
    setIsDeleting(false);
    if (!response.ok) {
      setError(getErrorMessage(response, `No pudimos eliminar ${isCategory ? "la categoría" : "el producto"}.`));
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
        <button type="button" onClick={onClose} disabled={isDeleting} aria-label="Cerrar confirmación" className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-black/5 disabled:cursor-not-allowed"><X size={20} /></button>
      </div>
      <h2 id="delete-content-title" className="mt-5 text-xl font-bold text-[#111111]">¿Eliminar {label} “{item.name}”?</h2>
      <p id="delete-content-description" className="mt-2 text-sm leading-6 text-[#666666]">
        {isCategory
          ? "Sus productos no se eliminarán; quedarán disponibles en “Sin categoría”."
          : "Esta acción no se puede deshacer."}
      </p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isDeleting} className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold hover:bg-black/5 disabled:cursor-not-allowed">Cancelar</button>
        <button ref={confirmRef} type="button" onClick={confirmDelete} disabled={isDeleting} className="cursor-pointer rounded-xl bg-[#DC2626] px-4 py-2.5 font-semibold text-white hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50">{isDeleting ? "Eliminando..." : `Eliminar ${label}`}</button>
      </div>
    </AccessibleModal>
  );
}
