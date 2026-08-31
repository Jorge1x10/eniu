import { Image as ImageIcon } from "lucide-react";

import { resolveAssetUrl } from "../templates/menuData";
import { useTranslation } from "react-i18next";

export function MenuCover({ business, catalogue, theme, coverUrl, compact = false }) {
  const { t } = useTranslation();

  if (!theme.show_cover) return null;
  return coverUrl ? (
    <div className={`relative overflow-hidden ${compact ? "h-20" : "h-44"}`}><img src={resolveAssetUrl(coverUrl)} alt={t("Portada de {{name}}", { name: catalogue.name })} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-black/25" /></div>
  ) : (
    <div className={`flex items-center justify-center opacity-70 ${compact ? "h-16" : "h-28"}`} style={{ backgroundColor: theme.primary_color }}><ImageIcon size={28} /><span className="ml-2 text-sm font-semibold">{business?.name || t("Tu negocio")}</span></div>
  );
}

export function CategoryNavigation({ sections, active, onSelect, rounded = true }) {
  const { t } = useTranslation();

  if (!sections.length) return null;
  const choices = [{ id: "all", name: t("Todo") }, ...sections];
  return <nav aria-label={t("Categorías del menú")} className="flex gap-2 overflow-x-auto px-4 py-3">{choices.map((section) => <button key={section.id} type="button" onClick={() => onSelect(section.id)} aria-pressed={active === section.id} className={`min-h-11 shrink-0 cursor-pointer px-4 text-xs font-bold ${rounded ? "rounded-full" : "border-b-2"}`} style={{ backgroundColor: active === section.id ? "var(--menu-primary)" : "transparent", borderColor: "var(--menu-accent)" }}>{section.name}</button>)}</nav>;
}

export function Availability({ available }) {
  const { t } = useTranslation();

  return available ? null : <span className="inline-block rounded-full border border-current px-2 py-0.5 text-[10px] font-bold">{t("Agotado")}</span>;
}

/**
 * Marca de Eniu al pie del menú público.
 *
 * Sólo aparece en el plan gratuito. El valor por defecto es `false` a
 * propósito: si algún día una plantilla nueva olvidara pasar la bandera, es
 * preferible perder la marca que mostrársela a alguien que pagó por quitarla.
 */
export function MenuFooter({ show = false }) {
  const { t } = useTranslation();

  if (!show) return null;
  return <footer className="py-7 text-center text-[10px] opacity-60">{t("Menú creado con ENIU")}</footer>;
}

export function EmptyMenu() {
  const { t } = useTranslation();

  return <div className="mx-5 my-10 rounded-xl border border-dashed border-current p-6 text-center text-sm opacity-70">{t("Los productos aparecerán aquí cuando los agregues.")}</div>;
}
