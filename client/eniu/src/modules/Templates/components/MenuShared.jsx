import { Image as ImageIcon, Minus, Plus } from "lucide-react";

import { resolveAssetUrl, useMenuOrdering } from "../templates/menuData";
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

/**
 * "Agregar" y, ya en el pedido, "− 2 +". Sólo aparece con el QR de una mesa,
 * con los pedidos activos y en productos que se pueden pedir (disponibles y
 * con precio); fuera de eso no dibuja nada y la plantilla queda intacta.
 *
 * Toma los colores del chip activo de la plantilla (`nav_chip_bg` y
 * `nav_chip_text`), que ya están pensados para leerse juntos: el botón se ve
 * de la misma carta y no como un elemento ajeno.
 */
export function OrderControl({ product, className = "mt-3", block = false }) {
  const { t } = useTranslation();
  const ordering = useMenuOrdering();
  if (!ordering?.canOrder || !ordering.isOrderable(product)) return null;
  const quantity = ordering.quantityOf(product.tracking_key);
  const { background, text } = ordering.colors;

  if (!quantity) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => ordering.add(product)}
          aria-label={t("Agregar {{name}} al pedido", { name: product.name })}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold ${block ? "w-full" : ""}`}
          style={{ backgroundColor: background, color: text }}
        >
          <Plus size={16} aria-hidden="true" /> {t("Agregar")}
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div role="group" aria-label={t("{{name}} en tu pedido", { name: product.name })} className={`inline-flex items-center gap-1 rounded-full border-2 p-0.5 ${block ? "w-full justify-between" : ""}`} style={{ borderColor: background }}>
        <button
          type="button"
          onClick={() => ordering.decrement(product.tracking_key)}
          aria-label={t("Quitar uno de {{name}}", { name: product.name })}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <span aria-live="polite" className="min-w-6 text-center text-sm font-black tabular-nums">
          {quantity}<span className="sr-only"> {t("en tu pedido")}</span>
        </span>
        <button
          type="button"
          onClick={() => ordering.add(product)}
          aria-label={t("Agregar otro {{name}}", { name: product.name })}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
          style={{ backgroundColor: background, color: text }}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function Availability({ available }) {
  const { t } = useTranslation();

  return available ? null : <span className="inline-block rounded-full border border-current px-2 py-0.5 text-[10px] font-bold">{t("Agotado")}</span>;
}

/**
 * Pie del menú público: el aviso de alérgenos y, según el plan, la marca.
 *
 * El aviso sale siempre, en las trece plantillas y en todos los planes. No es
 * decoración: en la Unión Europea y el Reino Unido la información sobre
 * alérgenos de la comida no envasada es obligatoria, y la norma admite darla
 * de viva voz sólo si existe una indicación visible de que puede pedirse
 * —esta— y el local la tiene documentada por escrito. Por eso se dibuja algo
 * más grande y menos apagada que la marca: un aviso que hay que buscar con
 * lupa no cumple el requisito de ser accesible.
 *
 * No sustituye a declarar los alérgenos plato por plato, que es hacia donde
 * debería ir el producto; es el mínimo que deja de ser un problema.
 *
 * La marca de Eniu, en cambio, sólo aparece en el plan gratuito. `show` vale
 * `false` por defecto a propósito: si algún día una plantilla nueva olvidara
 * pasar la bandera, es preferible perder la marca que mostrársela a alguien
 * que pagó por quitarla.
 *
 * La marca enlaza al sitio con parámetros de campaña: cada menú gratuito en
 * una mesa es una vitrina para otros restaurantes, y sin `utm_*` esas visitas
 * se contaban como tráfico directo.
 */
function eniuBadgeUrl(language) {
  const site = language?.startsWith("en") ? "https://eniu.app/en" : "https://eniu.app/";
  return `${site}?utm_source=eniu_menu&utm_medium=badge&utm_campaign=free_plan`;
}

export function MenuFooter({ show = false }) {
  const { t, i18n } = useTranslation();

  return (
    <footer className="space-y-1.5 py-7 text-center">
      <p className="text-[11px] opacity-75">{t("Consulta al personal sobre alérgenos.")}</p>
      {/* El relleno con margen negativo agranda la zona táctil a unos 48 px sin
          mover el pie: el texto mide 10 px y en el celular costaba atinarle. */}
      {show && <p className="text-[10px] opacity-60"><a href={eniuBadgeUrl(i18n.language)} target="_blank" rel="noopener" className="-my-[17px] inline-block px-2 py-[17px] underline-offset-2 hover:underline">{t("Menú creado con ENIU")}</a></p>}
    </footer>
  );
}

export function EmptyMenu() {
  const { t } = useTranslation();

  return <div className="mx-5 my-10 rounded-xl border border-dashed border-current p-6 text-center text-sm opacity-70">{t("Los productos aparecerán aquí cuando los agregues.")}</div>;
}
