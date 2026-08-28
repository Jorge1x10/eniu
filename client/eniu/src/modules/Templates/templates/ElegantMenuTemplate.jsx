import { useState } from "react";

import { Availability, CategoryNavigation, EmptyMenu, MenuCover, MenuFooter } from "../components/MenuShared";
import MenuBackground from "../components/MenuBackground";
import { FONT_REGISTRY } from "../utils/themeDefaults";
import { buildSections, mainProductImage, menuCurrency } from "./menuData";

export default function ElegantMenuTemplate({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const sections = buildSections(categories, products);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  const family = theme.font_key === "inter" ? FONT_REGISTRY.playfair.family : FONT_REGISTRY[theme.font_key]?.family;
  return <div className="relative min-h-full overflow-hidden" style={{ "--menu-primary": theme.primary_color, "--menu-accent": theme.accent_color, backgroundColor: theme.background_color, color: theme.text_color, fontFamily: family }}><MenuBackground theme={theme} /><div className="relative z-1">
    <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} />
    <header className="px-7 py-7 text-center"><p className="text-[10px] uppercase tracking-[0.3em] opacity-60">{business?.name}</p><div className="mx-auto my-3 h-px w-12" style={{ backgroundColor: "var(--menu-accent)" }} /><h1 className="text-3xl italic">{catalogue.name}</h1>{catalogue.description && <p className="mx-auto mt-3 max-w-xs text-xs leading-5 opacity-65">{catalogue.description}</p>}</header>
    <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} rounded={false} />
    {!products.length ? <EmptyMenu /> : <main className="space-y-10 px-6 py-5">{visible.map((section) => <section key={section.id}><div className="mb-5 flex items-center gap-3"><span className="h-px flex-1 bg-current opacity-20" /><h2 className="text-center text-xl italic">{section.name}</h2><span className="h-px flex-1 bg-current opacity-20" /></div><div className="space-y-5">{section.products.map((product) => <ElegantProductCard key={product.id} product={product} theme={theme} />)}</div></section>)}</main>}
    <MenuFooter show={showEniuBadge} />
  </div></div>;
}

function ElegantProductCard({ product, theme }) {
  const image = mainProductImage(product);
  return <article data-analytics-product-key={product.tracking_key || undefined} className={`border p-3 ${product.is_available ? "" : "opacity-60"}`} style={{ borderColor: "var(--menu-accent)" }}>{theme.show_product_images && image && <img src={image} alt={`Imagen de ${product.name}`} className="mb-4 h-40 w-full object-cover" />}<div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h3 className="text-lg italic">{product.name}</h3>{product.description && <p className="mt-2 text-xs leading-5 opacity-65">{product.description}</p>}<div className="mt-2"><Availability available={product.is_available} /></div></div><strong className="shrink-0 border-b pb-1 text-sm" style={{ borderColor: "var(--menu-accent)" }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</strong></div></article>;
}
