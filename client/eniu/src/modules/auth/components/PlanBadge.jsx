import { Lock } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

/**
 * Distintivo para una función que el plan actual no incluye.
 *
 * En el dashboard web sí puede llevar a contratar, a diferencia de la app
 * móvil: las reglas de Apple prohíben ofrecer la compra dentro de la app,
 * pero aquí no aplican.
 */
export default function PlanBadge({ label }) {
  const { t } = useTranslation();
  // El valor por defecto se resuelve aquí y no en la firma: un parámetro por
  // omisión se evalúa antes de que exista `t`.
  const text = label ?? t("Incluido en Esencial");

  return (
    <Link
      to="/dashboard/settings?tab=billing"
      className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#E9DDB7] bg-[#FFF8DE] px-3 text-[11px] font-bold text-[#8A7420] transition hover:border-[#D7C36A] hover:bg-[#FFE05A] hover:text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#E8C93D]"
    >
      <Lock size={11} aria-hidden="true" />
      {text}
    </Link>
  );
}
