import { useTranslation } from "react-i18next";

/** "Recibiendo pedidos" / "Pedidos en pausa": riel verde encendido, gris apagado. */
export default function OrderingSwitch({ enabled, busy, onToggle }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={busy}
      onClick={onToggle}
      className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-eniu-warm bg-eniu-surface px-3.5 text-sm font-bold disabled:cursor-wait disabled:opacity-60"
    >
      <span>{enabled ? t("Recibiendo pedidos") : t("Pedidos en pausa")}</span>
      <span aria-hidden="true" className={`relative h-7 w-[46px] shrink-0 rounded-full ${enabled ? "bg-eniu-success" : "bg-eniu-muted/40"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${enabled ? "left-[20px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
