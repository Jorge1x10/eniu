import { useEffect,useState } from 'react';
import { useApi } from '../../auth/services/useApi';
import { useBusiness } from '../services/useBusiness';
import { Building2, X } from "lucide-react";



export default function CreateBusinessModal({ isOpen, onClose }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { post } = useApi("businesses");
  const { addBusiness } = useBusiness();

  useEffect(() => {
    if (!isOpen) return;

    function closeWithEscape(event) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", closeWithEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeWithEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, isSubmitting, onClose]);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      setError("Escribe el nombre de tu negocio");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const response = await post({
      name: normalizedName,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError(
        response.data?.message ||
          "No fue posible crear el negocio"
      );
      return;
    }

    addBusiness(response.data.business);
    setName("");
    onClose();
  }

  function handleClose() {
    if (isSubmitting) return;

    setName("");
    setError("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-business-title"
        className="w-full max-w-md rounded-2xl bg-[#FFFDF5] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE05A] text-[#111111]">
              <Building2 size={21} />
            </div>

            <div>
              <h2
                id="create-business-title"
                className="text-xl font-bold text-[#111111]"
              >
                Crea tu negocio
              </h2>

              <p className="mt-1 text-sm text-[#666666]">
                Después podrás completar su información y personalización.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-[#666666] transition hover:bg-[#E9DDB7]/50 hover:text-[#111111] disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="business-name"
            className="mb-2 block text-sm font-semibold text-[#2A2A2A]"
          >
            Nombre del negocio
          </label>

          <input
            id="business-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            maxLength={120}
            autoFocus
            disabled={isSubmitting}
            placeholder="Ej. La Pizzería Santa Anita"
            className="w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 text-[#111111] outline-none transition placeholder:text-[#999999] focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 font-semibold text-[#2A2A2A] transition hover:bg-[#E9DDB7]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold text-[#111111] transition hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creando..." : "Crear negocio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
