import { CalendarDays, Pencil, Send, Trash2, Undo2 } from "lucide-react";
import { Link } from "react-router";

import CatalogueStatusBadge from "./CatalogueStatusBadge";
import { useTranslation } from "react-i18next";
import { currentLocale } from "../../../i18n/formats";

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function CatalogueCard({
  catalogue,
  businessId,
  isProcessing,
  onTogglePublished,
  onDelete,
}) {
  const { t } = useTranslation();

  const updatedAt = formatDate(catalogue.updated_at);

  return (
    <article className="rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <CatalogueStatusBadge isPublished={catalogue.is_published} />
          <h2 className="mt-3 truncate text-xl font-bold text-[#111111]">
            {catalogue.name}
          </h2>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#666666]">
            {catalogue.description || t("Sin descripción")}
          </p>
        </div>
      </div>

      {updatedAt && (
        <p className="mt-4 flex items-center gap-2 text-xs text-[#777777]">
          <CalendarDays size={14} /> {t("Actualizado el")} {updatedAt}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#F0E8D2] pt-4">
        <Link
          to={`/dashboard/businesses/${businessId}/catalogues/${catalogue.id}`}
          state={{ catalogue }}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-3.5 py-2 text-sm font-semibold text-[#111111] hover:bg-[#E8C93D]"
        >
          <Pencil size={15} /> {t("Administrar")}
        </Link>
        <button
          type="button"
          onClick={() => onTogglePublished(catalogue)}
          disabled={isProcessing}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#D9D9D9] px-3.5 py-2 text-sm font-semibold text-[#2A2A2A] hover:bg-[#F8E8AE]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {catalogue.is_published ? <Undo2 size={15} /> : <Send size={15} />}
          {catalogue.is_published ? "Despublicar" : "Publicar"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(catalogue)}
          disabled={isProcessing}
          aria-label={`Eliminar ${catalogue.name}`}
          className="ml-auto cursor-pointer rounded-xl p-2 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  );
}
