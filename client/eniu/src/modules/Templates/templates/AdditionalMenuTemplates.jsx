import { useMemo, useState } from "react";

import MenuBackground from "../components/MenuBackground";
import { Availability, CategoryNavigation, EmptyMenu, MenuCover, MenuFooter } from "../components/MenuShared";
import { FONT_REGISTRY } from "../utils/themeDefaults";
import { buildSections, mainProductImage, menuCurrency } from "./menuData";

const VARIANTS = {
  bistro: { header: "text-left", card: "rounded-lg border-l-4", grid: "space-y-3", eyebrow: "Selección de la casa" },
  bold: { header: "text-left uppercase", card: "rounded-none border-2 shadow-[5px_5px_0_var(--menu-accent)]", grid: "grid grid-cols-2 gap-4", eyebrow: "Sabor sin límites" },
  natural: { header: "text-center", card: "rounded-[2rem] border border-current/15", grid: "space-y-4", eyebrow: "Ingredientes y origen" },
  retro: { header: "text-center uppercase tracking-wider", card: "rounded-xl border-2 border-dashed", grid: "grid grid-cols-2 gap-3", eyebrow: "Clásicos favoritos" },
  luxury: { header: "text-center font-serif", card: "border-y border-current/30", grid: "space-y-5", eyebrow: "Una experiencia especial" },
};

function AdditionalTemplate({ variant, business, catalogue, categories, products, theme, coverUrl, onCategorySelect }) {
  const style = VARIANTS[variant];
  const sections = useMemo(() => buildSections(categories, products), [categories, products]);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  function choose(value) {
    setActive(value);
    if (value !== "all") {
      onCategorySelect?.(sections.find((section) => section.id === value)?.tracking_key);
    }
  }

  return <div className="relative min-h-full overflow-hidden" style={{ "--menu-primary": theme.primary_color, "--menu-accent": theme.accent_color, backgroundColor: theme.background_color, color: theme.text_color, fontFamily: FONT_REGISTRY[theme.font_key]?.family || FONT_REGISTRY.inter.family }}>
    <MenuBackground theme={theme} />
    <div className="relative z-1">
      <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} compact={variant === "minimal"} />
      <header className={`px-6 py-7 ${style.header}`}><p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">{style.eyebrow}</p><h1 className="mt-2 text-3xl font-black">{catalogue.name}</h1><p className="mt-2 text-xs opacity-70">{catalogue.description || business?.name}</p></header>
      <CategoryNavigation sections={sections} active={active} onSelect={choose} rounded={variant !== "luxury"} />
      {!products.length ? <EmptyMenu /> : <main className="space-y-8 px-5 py-6">{visible.map((section) => <section key={section.id}><h2 className="mb-4 text-xl font-black">{section.name}</h2><div className={style.grid}>{section.products.map((product) => <ProductCard key={product.id} product={product} theme={theme} className={style.card} variant={variant} />)}</div></section>)}</main>}
      <MenuFooter />
    </div>
  </div>;
}

function ProductCard({ product, theme, className, variant }) {
  const image = mainProductImage(product);
  return <article data-analytics-product-key={product.tracking_key || undefined} className={`overflow-hidden p-3 ${className} ${product.is_available ? "" : "opacity-60"}`} style={{ borderColor: "var(--menu-accent)", backgroundColor: `${theme.background_color}E8` }}>
    {theme.show_product_images && image && <img src={image} alt={`Imagen de ${product.name}`} className={`mb-3 w-full object-cover ${variant === "luxury" ? "h-36" : "h-24"}`} />}
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold">{product.name}</h3>{product.description && <p className="mt-1 text-xs leading-5 opacity-65">{product.description}</p>}<Availability available={product.is_available} /></div><strong className="shrink-0 text-sm">{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</strong></div>
  </article>;
}

export const BistroMenuTemplate = (props) => <AdditionalTemplate {...props} variant="bistro" />;
export const BoldMenuTemplate = (props) => <AdditionalTemplate {...props} variant="bold" />;
export const NaturalMenuTemplate = (props) => <AdditionalTemplate {...props} variant="natural" />;
export const RetroMenuTemplate = (props) => <AdditionalTemplate {...props} variant="retro" />;
export const LuxuryMenuTemplate = (props) => <AdditionalTemplate {...props} variant="luxury" />;
