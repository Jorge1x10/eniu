import { useTranslation } from "react-i18next";

const STYLES = {
  pending: { label: "Por aceptar", className: "bg-eniu-yellow text-eniu-ink" },
  received: { label: "Recibido", className: "bg-eniu-ticket-alt text-eniu-ink" },
  preparing: { label: "Preparando", className: "bg-eniu-ticket-alt text-eniu-ink" },
  ready: { label: "Listo", className: "bg-eniu-ticket-success/12 text-eniu-ticket-success" },
  on_the_way: { label: "En camino", className: "bg-eniu-ticket-success/12 text-eniu-ticket-success" },
  cancelled: { label: "Rechazado", className: "bg-eniu-ticket-danger/10 text-eniu-ticket-danger" },
};

/** Vive sobre la comanda, así que usa sus colores fijos. Un color, un significado: amarillo falta atender, verde listo, rojo rechazado. */
export default function StatusChip({ status }) {
  const { t } = useTranslation();
  const style = STYLES[status] || STYLES.pending;
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${style.className}`}>{t(style.label)}</span>;
}
