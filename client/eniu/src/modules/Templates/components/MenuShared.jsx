import { Image as ImageIcon } from "lucide-react";

import { resolveAssetUrl } from "../templates/menuData";
import { useTranslation } from "react-i18next";

export function MenuCover({ business, catalogue, theme, coverUrl, compact = false, placeholderColor }) {
  const { t } = useTranslation();

  if (!theme.show_cover) return null;
  // Punto focal (0-1, 0.5/0.5 = centrado): qué parte de la imagen queda
  // visible dentro del recuadro fijo, elegido en el editor arrastrando sobre
  // la propia foto — nunca recorta el archivo original.
  const focalX = Number.isFinite(theme.cover_focal_x) ? theme.cover_focal_x : 0.5;
  const focalY = Number.isFinite(theme.cover_focal_y) ? theme.cover_focal_y : 0.5;
  return coverUrl ? (
    <div className={`relative overflow-hidden ${compact ? "h-20" : "h-44"}`}><img src={resolveAssetUrl(coverUrl)} alt={t("Portada de {{name}}", { name: catalogue.name })} className="h-full w-full object-cover" style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }} /><div className="absolute inset-0 bg-black/25" /></div>
  ) : (
    // El color de texto es aparte del general (`placeholderColor`, el mismo
    // token que usa el chip activo): ambos son texto sobre `primary_color`,
    // y una paleta puede elegir un color de fondo que no contraste con el
    // texto general pero sí con uno pensado para ir sobre el color principal.
    <div className={`flex items-center justify-center opacity-70 ${compact ? "h-16" : "h-28"}`} style={{ backgroundColor: theme.primary_color, color: placeholderColor }}><ImageIcon size={28} /><span className="ml-2 text-sm font-semibold">{business?.name || t("Tu negocio")}</span></div>
  );
}

export function CategoryNavigation({ sections, active, onSelect, rounded = true, activeBackground = "var(--menu-primary)", activeColor }) {
  const { t } = useTranslation();

  if (!sections.length) return null;
  const choices = [{ id: "all", name: t("Todo") }, ...sections];
  return <nav aria-label={t("Categorías del menú")} className="flex gap-2 overflow-x-auto px-4 py-3">{choices.map((section) => {
    const isActive = active === section.id;
    return <button key={section.id} type="button" onClick={() => onSelect(section.id)} aria-pressed={isActive} className={`min-h-11 shrink-0 cursor-pointer px-4 text-xs font-bold ${rounded ? "rounded-full" : "border-b-2"}`} style={{ backgroundColor: isActive ? activeBackground : "transparent", borderColor: "var(--menu-accent)", ...(isActive && activeColor ? { color: activeColor } : {}) }}>{section.name}</button>;
  })}</nav>;
}

/**
 * Etiqueta de promoción del día (ver `promotion/services.py`, que decide qué
 * productos la traen hoy). Sólo el texto que ya resolvió el backend — este
 * componente no sabe de días ni de fechas, sólo pinta si hay algo que pintar.
 */
export function PromoBadge({ label }) {
  if (!label) return null;
  return <span className="inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: "var(--menu-accent)", color: "#111111" }}>{label}</span>;
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
