import { useState } from "react";

import { Availability, CategoryNavigation, EmptyMenu, MenuCover, MenuFooter } from "../components/MenuShared";
import MenuBackground from "../components/MenuBackground";
import { FONT_REGISTRY } from "../utils/themeDefaults";
import { buildSections, mainProductImage, menuCurrency } from "./menuData";

export default function MinimalMenuTemplate({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect }) {
  const sections = buildSections(categories, products);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  return <div className="relative min-h-full overflow-hidden" style={{ "--menu-primary": theme.primary_color, "--menu-accent": theme.accent_color, backgroundColor: theme.background_color, color: theme.text_color, fontFamily: FONT_REGISTRY[theme.font_key]?.family || FONT_REGISTRY.inter.family }}><MenuBackground theme={theme} /><div className="relative z-1">
    <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} compact />
    <header className="border-b border-current/15 px-5 py-5"><div className="flex items-baseline justify-between gap-3"><h1 className="text-2xl font-semibold">{catalogue.name}</h1><span className="text-[10px] uppercase tracking-widest opacity-55">{business?.name}</span></div>{catalogue.description && <p className="mt-2 text-xs leading-5 opacity-65">{catalogue.description}</p>}</header>
    <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} rounded={false} />
    {!products.length ? <EmptyMenu /> : <main className="px-5">{visible.map((section) => <section key={section.id} className="py-4"><h2 className="mb-2 border-l-2 pl-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ borderColor: "var(--menu-accent)" }}>{section.name}</h2><div>{section.products.map((product) => <MinimalProductRow key={product.id} product={product} theme={theme} />)}</div></section>)}</main>}
    <MenuFooter />
  </div></div>;
}

function MinimalProductRow({ product, theme }) {
  const image = mainProductImage(product);
  return <article data-analytics-product-key={product.tracking_key || undefined} className={`flex gap-3 border-b border-current/15 py-4 ${product.is_available ? "" : "opacity-60"}`}>{theme.show_product_images && image && <img src={image} alt={`Imagen de ${product.name}`} className="h-16 w-16 shrink-0 rounded-lg object-cover" />}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{product.name}</h3><strong className="shrink-0 text-sm">{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</strong></div>{product.description && <p className="mt-1 text-xs leading-5 opacity-60">{product.description}</p>}<div className="mt-1"><Availability available={product.is_available} /></div></div></article>;
}
