import { useEffect, useRef, useState } from "react";
import { BookOpen, X } from "lucide-react";

import { getCatalogueErrorMessage } from "../services/catalogueService";

export default function CreateCatalogueModal({ onClose, onCreate, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    nameInputRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !submittingRef.current) {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const focusable = dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    if (!normalizedName) {
      setFieldError("Escribe el nombre del menú.");
      nameInputRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setFieldError("");
    setRequestError("");

    const response = await onCreate({
      name: normalizedName,
      description: normalizedDescription,
    });

    submittingRef.current = false;
    setIsSubmitting(false);
    if (!response.ok) {
      setRequestError(getCatalogueErrorMessage(
        response,
        "No pudimos crear el menú. Intenta nuevamente."
      ));
      return;
    }

    onCreated(response.data.catalogue);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-catalogue-title"
        className="w-full max-w-lg rounded-2xl bg-[#FFFDF5] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE05A] text-[#111111]">
              <BookOpen size={21} />
            </div>
            <div>
              <h2 id="create-catalogue-title" className="text-xl font-bold text-[#111111]">
                Crear menú
              </h2>
              <p className="mt-1 text-sm text-[#666666]">
                Comienza con la información principal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-[#E9DDB7]/50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="catalogue-name" className="block text-sm font-semibold text-[#2A2A2A]">
            Nombre del menú
          </label>
          <input
            ref={nameInputRef}
            id="catalogue-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFieldError("");
              setRequestError("");
            }}
            maxLength={64}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "catalogue-name-error" : undefined}
            className="mt-2 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40 disabled:opacity-60"
            placeholder="Ej. Menú principal"
          />
          {fieldError && (
            <p id="catalogue-name-error" className="mt-2 text-sm text-red-700">
              {fieldError}
            </p>
          )}

          <label htmlFor="catalogue-description" className="mt-5 block text-sm font-semibold text-[#2A2A2A]">
            Descripción <span className="font-normal text-[#777777]">(opcional)</span>
          </label>
          <textarea
            id="catalogue-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setRequestError("");
            }}
            disabled={isSubmitting}
            rows={4}
            className="mt-2 w-full resize-y rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40 disabled:opacity-60"
            placeholder="Nuestro menú general"
          />

          {requestError && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {requestError}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold text-[#2A2A2A] hover:bg-[#E9DDB7]/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold text-[#111111] hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creando..." : "Crear menú"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
