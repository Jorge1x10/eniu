import { useState } from "react";
import { Printer, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import AccessibleModal from "../../Catalogue/components/AccessibleModal";
import { PAPER_WIDTHS, loadPrintSettings, savePrintSettings } from "../printing/printSettings";
import { printOrderTicket } from "../printing/printTicket";

/** Un pedido de ejemplo para la impresión de prueba. */
function sampleOrder(t) {
  const now = new Date().toISOString();
  return {
    id: "prueba",
    diner_name: t("Prueba"),
    created_at: now,
    received_at: now,
    items: [
      { name: t("Café americano"), quantity: 2, notes: t("Uno sin azúcar"), is_cancelled: false },
      { name: t("Pan dulce"), quantity: 1, notes: null, is_cancelled: false },
    ],
  };
}

/**
 * Impresión de comandas en **este dispositivo**: si imprime al aceptar y en
 * qué papel. Se guarda en el navegador, no en el negocio, para que sólo el
 * equipo que tiene la impresora imprima.
 */
export default function PrintSettingsDialog({ businessName, onClose, onChange }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(loadPrintSettings);

  function update(change) {
    savePrintSettings(change);
    const next = loadPrintSettings();
    setSettings(next);
    onChange?.(next);
  }

  return (
    <AccessibleModal labelledBy="print-settings-title" describedBy="print-settings-description" onClose={onClose} maxWidth="max-w-md">
      <div className="text-eniu-text">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="print-settings-title" className="text-xl font-black">{t("Impresión de comandas")}</h2>
            <p id="print-settings-description" className="mt-1 text-sm text-eniu-muted">{t("Se guarda en este dispositivo. Actívalo sólo en el equipo que tiene la impresora conectada.")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Cerrar")} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-eniu-surface-alt">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={settings.autoPrint}
          onClick={() => update({ autoPrint: !settings.autoPrint })}
          className="mt-5 flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-eniu-warm px-4 text-left"
        >
          <span>
            <span className="block font-bold">{t("Imprimir la comanda al aceptar un pedido")}</span>
            <span className="block text-xs text-eniu-muted">{t("También cuando lo acepta otro dispositivo o la app.")}</span>
          </span>
          <span aria-hidden="true" className={`relative h-7 w-[46px] shrink-0 rounded-full ${settings.autoPrint ? "bg-eniu-success" : "bg-eniu-muted/40"}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${settings.autoPrint ? "left-[20px]" : "left-0.5"}`} />
          </span>
        </button>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold">{t("Ancho del papel")}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PAPER_WIDTHS.map((width) => (
              <label key={width} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 font-bold ${settings.paper === width ? "border-eniu-text" : "border-eniu-warm"}`}>
                <input type="radio" name="paper" value={width} checked={settings.paper === width} onChange={() => update({ paper: width })} className="sr-only" />
                {t("{{width}} mm", { width })}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={() => printOrderTicket({ order: sampleOrder(t), table: { number: 1, name: null }, businessName })}
          className="mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover"
        >
          <Printer size={18} aria-hidden="true" /> {t("Imprimir una prueba")}
        </button>

        <p className="mt-4 rounded-xl bg-eniu-surface-alt p-3 text-xs leading-5 text-eniu-muted">
          {t("Para que imprima sin preguntar cada vez: elige la impresora de tickets como predeterminada y abre Chrome con la opción")}{" "}
          <code className="whitespace-nowrap font-mono font-bold text-eniu-text">--kiosk-printing</code>.{" "}
          {t("Funciona con cualquier impresora de tickets instalada en el equipo (USB o de red).")}
        </p>
      </div>
    </AccessibleModal>
  );
}
