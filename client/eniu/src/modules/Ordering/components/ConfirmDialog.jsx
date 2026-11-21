import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import AccessibleModal from "../../Catalogue/components/AccessibleModal";

/**
 * Confirmación de una acción que no se deshace, con el nombre de lo que se va
 * a tocar en el título. `onConfirm` devuelve la respuesta del servicio; si no
 * sale bien, el error se muestra aquí mismo y el diálogo sigue abierto.
 */
export default function ConfirmDialog({
  title, description, confirmLabel, tone = "danger", onConfirm, onDone, onClose, errorMessage,
}) {
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef(null);

  async function confirm() {
    if (isBusy) return;
    setIsBusy(true);
    setError("");
    const response = await onConfirm();
    setIsBusy(false);
    if (!response?.ok) {
      setError(errorMessage(response));
      return;
    }
    onDone?.(response);
  }

  const confirmClass = tone === "danger"
    ? "bg-red-700 text-white hover:bg-red-800"
    : "bg-[#FFE05A] text-[#111111] hover:bg-[#E8C93D]";

  return (
    <AccessibleModal
      labelledBy="confirm-dialog-title" describedBy="confirm-dialog-description"
      role="alertdialog" maxWidth="max-w-md" isBusy={isBusy} onClose={onClose}
      initialFocusRef={confirmRef}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="confirm-dialog-title" className="text-xl font-bold text-[#111111]">{title}</h2>
        <button type="button" onClick={onClose} disabled={isBusy} aria-label={t("Cerrar confirmación")} className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-black/5 disabled:cursor-not-allowed"><X size={20} /></button>
      </div>
      {description && <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-[#666666]">{description}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isBusy} className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold text-[#444444] hover:bg-black/5 disabled:cursor-not-allowed">{t("Volver")}</button>
        <button ref={confirmRef} type="button" onClick={confirm} disabled={isBusy} className={`cursor-pointer rounded-xl px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}>{confirmLabel}</button>
      </div>
    </AccessibleModal>
  );
}
