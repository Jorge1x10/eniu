import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";

import { getCatalogueErrorMessage } from "../services/catalogueService";

export default function DeleteCatalogueModal({ catalogue, onClose, onDelete, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const deletingRef = useRef(false);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    confirmRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !deletingRef.current) {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = dialog.querySelectorAll("button:not([disabled])");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocus?.focus?.();
    };
  }, [onClose]);

  async function confirmDelete() {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    setError("");

    const response = await onDelete(catalogue.id);

    deletingRef.current = false;
    setIsDeleting(false);
    if (!response.ok) {
      setError(getCatalogueErrorMessage(
        response,
        "No pudimos eliminar el menú. Intenta nuevamente."
      ));
      return;
    }

    onDeleted(catalogue.id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-catalogue-title"
        aria-describedby="delete-catalogue-description"
        className="w-full max-w-md rounded-2xl bg-[#FFFDF5] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <Trash2 size={20} />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Cerrar confirmación"
            className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-black/5 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        <h2 id="delete-catalogue-title" className="mt-5 text-xl font-bold text-[#111111]">
          ¿Eliminar este menú?
        </h2>
        <p id="delete-catalogue-description" className="mt-2 text-sm leading-6 text-[#666666]">
          Se eliminará <strong className="text-[#111111]">{catalogue.name}</strong> y todo su contenido. No podrás recuperarlo.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold text-[#2A2A2A] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={confirmDelete}
            disabled={isDeleting}
            className="cursor-pointer rounded-xl bg-[#DC2626] px-4 py-2.5 font-semibold text-white hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Eliminando..." : "Eliminar menú"}
          </button>
        </div>
      </div>
    </div>
  );
}
