import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import AccessibleModal from "../../Catalogue/components/AccessibleModal";
import { orderingErrorMessage } from "../services/orderingService";

/** Tope de mesas por alta en bloque: cada una es una petición. */
const MAX_BULK_TABLES = 50;

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/60";

/**
 * Alta y edición de mesas.
 *
 * Al crear se puede dar de alta una sola o un rango ("de la 1 a la 12"), que
 * es como un restaurante las tiene en realidad. El rango se crea una por una
 * y al final se dice cuáles ya existían.
 */
export default function TableFormModal({ table, catalogues, suggestedNumber, onCreate, onUpdate, onClose, onSaved }) {
  const { t } = useTranslation();
  const isEditing = Boolean(table);
  const [mode, setMode] = useState("single");
  const [number, setNumber] = useState(String(table?.number ?? suggestedNumber ?? 1));
  const [from, setFrom] = useState(String(suggestedNumber ?? 1));
  const [to, setTo] = useState(String((suggestedNumber ?? 1) + 9));
  const [name, setName] = useState(table?.name || "");
  const [catalogueId, setCatalogueId] = useState(table?.catalogue_id || catalogues[0]?.id || "");
  const [isActive, setIsActive] = useState(table?.is_active ?? true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const firstFieldRef = useRef(null);

  function parseNumber(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 9999 ? parsed : null;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!catalogueId) {
      setError(t("Elige qué menú abre el QR de la mesa."));
      return;
    }

    if (isEditing || mode === "single") {
      const parsed = parseNumber(number);
      if (!parsed) {
        setError(t("El número de mesa debe ser de 1 a 9999."));
        return;
      }
      const data = { number: parsed, name: name.trim() || null, catalogue_id: catalogueId };
      if (isEditing) data.is_active = isActive;
      setIsSaving(true);
      const response = isEditing ? await onUpdate(table.id, data) : await onCreate(data);
      setIsSaving(false);
      if (!response.ok) {
        setError(orderingErrorMessage(response, t("No pudimos guardar la mesa.")));
        return;
      }
      onSaved({ created: isEditing ? 0 : 1, skipped: [] });
      return;
    }

    const first = parseNumber(from);
    const last = parseNumber(to);
    if (!first || !last || last < first) {
      setError(t("Revisa el rango: la primera mesa no puede ser mayor que la última."));
      return;
    }
    if (last - first + 1 > MAX_BULK_TABLES) {
      setError(t("Puedes crear hasta {{limit}} mesas a la vez.", { limit: MAX_BULK_TABLES }));
      return;
    }
    setIsSaving(true);
    let created = 0;
    const skipped = [];
    for (let current = first; current <= last; current += 1) {
      const response = await onCreate({ number: current, catalogue_id: catalogueId });
      if (response.ok) {
        created += 1;
      } else if (response.data?.code === "duplicate_number") {
        skipped.push(current);
      } else {
        setIsSaving(false);
        setError(orderingErrorMessage(response, t("No pudimos crear la mesa {{number}}.", { number: current })));
        if (created) onSaved({ created, skipped, keepOpen: true });
        return;
      }
    }
    setIsSaving(false);
    onSaved({ created, skipped });
  }

  return (
    <AccessibleModal labelledBy="table-form-title" isBusy={isSaving} onClose={onClose} initialFocusRef={firstFieldRef}>
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4">
          <h2 id="table-form-title" className="text-xl font-bold text-[#111111]">
            {isEditing ? t("Editar mesa {{number}}", { number: table.number }) : t("Agregar mesas")}
          </h2>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={t("Cerrar")} className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-black/5 disabled:cursor-not-allowed"><X size={20} /></button>
        </div>

        {!isEditing && (
          <div role="radiogroup" aria-label={t("Cuántas mesas")} className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-[#F2EBD8] p-1">
            {[["single", t("Una mesa")], ["range", t("Varias mesas")]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={`min-h-10 cursor-pointer rounded-lg text-sm font-semibold ${mode === value ? "bg-white text-[#111111] shadow-sm" : "text-[#666666]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {isEditing || mode === "single" ? (
            <>
              <label className="block text-sm font-semibold">
                {t("Número de mesa")}
                <input ref={firstFieldRef} type="number" inputMode="numeric" min="1" max="9999" value={number} onChange={(event) => setNumber(event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm font-semibold">
                {t("Nombre (opcional)")}
                <input type="text" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Ej. Terraza")} className={inputClass} />
              </label>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">
                {t("Desde la mesa")}
                <input ref={firstFieldRef} type="number" inputMode="numeric" min="1" max="9999" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm font-semibold">
                {t("Hasta la mesa")}
                <input type="number" inputMode="numeric" min="1" max="9999" value={to} onChange={(event) => setTo(event.target.value)} className={inputClass} />
              </label>
            </div>
          )}

          <label className="block text-sm font-semibold">
            {t("Menú que abre el QR")}
            <select value={catalogueId} onChange={(event) => setCatalogueId(event.target.value)} className={`${inputClass} cursor-pointer`}>
              {catalogues.map((catalogue) => <option key={catalogue.id} value={catalogue.id}>{catalogue.name}</option>)}
            </select>
          </label>

          {isEditing && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-5 w-5 cursor-pointer accent-[#E8C93D]" />
              {t("Mesa activa (su QR funciona)")}
            </label>
          )}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold text-[#444444] hover:bg-black/5 disabled:cursor-not-allowed">{t("Volver")}</button>
          <button type="submit" disabled={isSaving} className="cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold text-[#111111] hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? t("Guardando…") : isEditing ? t("Guardar mesa") : mode === "single" ? t("Crear mesa") : t("Crear mesas")}
          </button>
        </div>
      </form>
    </AccessibleModal>
  );
}
