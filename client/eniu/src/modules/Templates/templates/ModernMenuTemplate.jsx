import { useState } from "react";

import { Availability, CategoryNavigation, EmptyMenu, MenuCover, MenuFooter } from "../components/MenuShared";
import MenuBackground from "../components/MenuBackground";
import { FONT_REGISTRY } from "../utils/themeDefaults";
import { buildSections, mainProductImage, menuCurrency } from "./menuData";

export default function ModernMenuTemplate({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect }) {
  const sections = buildSections(categories, products);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  return <MenuShell theme={theme}>
    <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} />
    <header className="px-5 pb-3 pt-5"><p className="text-xs font-bold uppercase tracking-widest opacity-60">{business?.name || "Negocio"}</p><h1 className="mt-1 text-3xl font-black leading-tight">{catalogue.name}</h1>{catalogue.description && <p className="mt-2 text-sm opacity-70">{catalogue.description}</p>}</header>
    <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} />
    {!products.length ? <EmptyMenu /> : <main className="space-y-7 px-4 pb-4">{visible.map((section) => <section key={section.id}><h2 className="mb-3 text-xl font-extrabold">{section.name}</h2><div className="grid grid-cols-1 gap-3 min-[370px]:grid-cols-2">{section.products.map((product) => <ModernProductCard key={product.id} product={product} theme={theme} />)}</div></section>)}</main>}
    <MenuFooter />
  </MenuShell>;
}

function ModernProductCard({ product, theme }) {
  const image = mainProductImage(product);
  return <article data-analytics-product-key={product.tracking_key || undefined} className={`overflow-hidden rounded-2xl border border-black/10 shadow-sm ${product.is_available ? "" : "opacity-65"}`} style={{ backgroundColor: theme.background_color }}>{theme.show_product_images && <div className="h-28 bg-black/5">{image ? <img src={image} alt={`Imagen de ${product.name}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs opacity-45">Sin imagen</div>}</div>}<div className="p-3"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-extrabold leading-tight">{product.name}</h3><Availability available={product.is_available} /></div>{product.description && <p className="mt-1 line-clamp-2 text-xs opacity-65">{product.description}</p>}<p className="mt-3 font-black">{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</p></div></article>;
}

function MenuShell({ theme, children }) {
  return <div className="relative min-h-full overflow-hidden" style={{ "--menu-primary": theme.primary_color, "--menu-accent": theme.accent_color, backgroundColor: theme.background_color, color: theme.text_color, fontFamily: FONT_REGISTRY[theme.font_key]?.family || FONT_REGISTRY.inter.family }}><MenuBackground theme={theme} /><div className="relative z-1">{children}</div></div>;
}
