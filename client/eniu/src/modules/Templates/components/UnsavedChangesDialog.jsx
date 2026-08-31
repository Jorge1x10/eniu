import { AlertTriangle } from "lucide-react";

import AccessibleModal from "../../Catalogue/components/AccessibleModal";
import { useTranslation } from "react-i18next";

export default function UnsavedChangesDialog({ onCancel, onConfirm }) {
  const { t } = useTranslation();

  return <AccessibleModal labelledBy="unsaved-title" describedBy="unsaved-description" onClose={onCancel} maxWidth="max-w-md"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><AlertTriangle size={21} /></div><h2 id="unsaved-title" className="mt-4 text-xl font-bold">{t("Tienes cambios sin guardar")}</h2><p id="unsaved-description" className="mt-2 text-sm leading-6 text-[#666666]">{t("Si sales ahora, perderás los cambios realizados en la plantilla.")}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="min-h-11 cursor-pointer rounded-xl px-4 font-semibold hover:bg-black/5">{t("Seguir editando")}</button><button type="button" onClick={onConfirm} className="min-h-11 cursor-pointer rounded-xl bg-[#DC2626] px-4 font-semibold text-white hover:bg-[#B91C1C]">{t("Salir sin guardar")}</button></div></AccessibleModal>;
}
