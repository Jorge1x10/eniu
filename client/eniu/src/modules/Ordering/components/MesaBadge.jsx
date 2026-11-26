import { ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";

const TONES = {
  // Sobre la página (claro u oscuro).
  surface: { box: "bg-eniu-surface-alt text-eniu-text", label: "text-eniu-muted" },
  // Sobre la tarjeta negra de Inicio.
  dark: { box: "bg-eniu-badge-dark text-eniu-cream", label: "text-eniu-hero-muted" },
  // Sobre el papel de la comanda, que es crema en los dos temas.
  paper: { box: "bg-eniu-ticket-alt text-eniu-ink", label: "text-eniu-ticket-muted" },
};

/**
 * "MESA 4" en un cuadro, siempre del mismo color: el estado lo dice el chip.
 * `as="h2"` lo usa como título de la tarjeta de una mesa. Con `takeaway`,
 * una bolsa y "LLEVAR" en lugar del número.
 */
export default function MesaBadge({ number, takeaway = false, size = 46, tone = "surface", as: Tag = "div" }) {
  const { t } = useTranslation();
  const colors = TONES[tone] || TONES.surface;
  if (takeaway) {
    return (
      <Tag
        aria-label={t("Para llevar")}
        style={{ width: size, height: size }}
        className={`flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl ${colors.box}`}
      >
        <span aria-hidden="true" className={`text-[8px] font-extrabold tracking-[1px] ${colors.label}`}>{t("LLEVAR")}</span>
        <ShoppingBag aria-hidden="true" size={size >= 50 ? 20 : 18} strokeWidth={2.5} />
      </Tag>
    );
  }
  return (
    <Tag
      aria-label={t("Mesa {{number}}", { number })}
      style={{ width: size, height: size }}
      className={`flex shrink-0 flex-col items-center justify-center rounded-xl ${colors.box}`}
    >
      <span aria-hidden="true" className={`text-[8px] font-extrabold tracking-[1px] ${colors.label}`}>{t("MESA")}</span>
      <span aria-hidden="true" className={`${size >= 50 ? "text-[22px]" : "text-[19px]"} font-black leading-none tabular-nums`}>{number}</span>
    </Tag>
  );
}
