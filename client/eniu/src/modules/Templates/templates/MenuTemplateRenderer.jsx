import { useMemo, useState } from "react";

import { Availability, CategoryNavigation, EmptyMenu, MenuCover, MenuFooter, PromoBadge } from "../components/MenuShared";
import MenuBackground from "../components/MenuBackground";
import { FONT_REGISTRY } from "../utils/themeDefaults";
import { buildSections, mainProductImage, menuCurrency } from "./menuData";
import { useTranslation } from "react-i18next";

/**
 * Un solo renderer de menú público, en vez de un componente por plantilla.
 *
 * Antes cada una de las 8 plantillas era un archivo `.jsx` separado que
 * repetía la misma cáscara (fondo, portada, header, nav, secciones) con
 * pequeñas variaciones. Migrarlas aquí no cambia una sola clase de Tailwind
 * — es la misma composición de siempre, sólo que elegida por dato
 * (`LAYOUT_FAMILY`/`ADDITIONAL_VARIANTS`) en vez de por qué archivo se
 * importó. Ver `visualRegression.test.jsx`, que congela el HTML de cada
 * plantilla para que este cambio de implementación no mueva un píxel.
 *
 * Las 8 claves son las mismas que valida el backend (`layout_keys` en
 * `billing/plans.py`) — si el backend agrega una clave nueva que esta tabla
 * no reconoce, cae a "modern" en vez de romperse.
 */
const LAYOUT_FAMILY = {
  modern: "modern",
  minimal: "minimal",
  elegant: "elegant",
  bistro: "additional",
  bold: "additional",
  natural: "additional",
  retro: "additional",
  luxury: "additional",
  chalkboard: "chalkboard",
  magazine: "magazine",
  sidebar: "sidebar",
  receipt: "receipt",
  story: "story",
};

const ADDITIONAL_VARIANTS = {
  bistro: { header: "text-left", card: "rounded-lg border-l-4", grid: "space-y-3", eyebrow: "Selección de la casa" },
  bold: { header: "text-left uppercase", card: "rounded-none border-2 shadow-[5px_5px_0_var(--menu-accent)]", grid: "grid grid-cols-2 gap-4", eyebrow: "Sabor sin límites" },
  natural: { header: "text-center", card: "rounded-[2rem] border border-current/15", grid: "space-y-4", eyebrow: "Ingredientes y origen" },
  retro: { header: "text-center uppercase tracking-wider", card: "rounded-xl border-2 border-dashed", grid: "grid grid-cols-2 gap-3", eyebrow: "Clásicos favoritos" },
  luxury: { header: "text-center font-serif", card: "border-y border-current/30", grid: "space-y-5", eyebrow: "Una experiencia especial" },
};

function MenuShell({ theme, family, children }) {
  const family_font = family === "elegant" ? undefined : FONT_REGISTRY[theme.font_key]?.family || FONT_REGISTRY.inter.family;
  return (
    <div
      className="relative min-h-full overflow-hidden"
      style={{
        "--menu-primary": theme.primary_color,
        "--menu-accent": theme.accent_color,
        backgroundColor: theme.background_color,
        color: theme.text_color,
        ...(family_font ? { fontFamily: family_font } : {}),
      }}
    >
      <MenuBackground theme={theme} />
      <div className="relative z-1">{children}</div>
    </div>
  );
}

function useSections(categories, products) {
  return useMemo(() => buildSections(categories, products), [categories, products]);
}

/**
 * Los 6 tokens que no tienen columna propia (ver `catalog.py` en el backend)
 * llegan resueltos en `theme.tokens` cuando el tema sale de la API. El
 * fallback de cada uno reproduce exactamente lo que la plantilla ya hacía
 * antes de que estos tokens existieran — por eso nadie con la paleta por
 * defecto nota el cambio al desplegar esto.
 */
function resolveTokens(theme) {
  return {
    surface: theme.background_color,
    price: theme.text_color,
    category_title: theme.text_color,
    nav_chip_bg: theme.primary_color,
    nav_chip_text: theme.text_color,
    ...theme.tokens,
  };
}

// --- Moderna --------------------------------------------------------------

function ModernProductCard({ product, theme, tokens }) {
  const { t } = useTranslation();
  const image = mainProductImage(product);
  return (
    <article
      data-analytics-product-key={product.tracking_key || undefined}
      className={`overflow-hidden rounded-2xl border border-black/10 shadow-sm ${product.is_available ? "" : "opacity-65"}`}
      style={{ backgroundColor: tokens.surface }}
    >
      {theme.show_product_images && (
        <div className="h-28 bg-black/5">
          {image ? <img src={image} alt={t("Imagen de {{name}}", { name: product.name })} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs opacity-45">{t("Sin imagen")}</div>}
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-extrabold leading-tight">{product.name}</h3><Availability available={product.is_available} /></div>
        {product.promo_label && <div className="mt-1"><PromoBadge label={product.promo_label} /></div>}
        {product.description && <p className="mt-1 line-clamp-2 text-xs opacity-65">{product.description}</p>}
        <p className="mt-3 font-black" style={{ color: tokens.price }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</p>
      </div>
    </article>
  );
}

function ModernLayout({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const { t } = useTranslation();
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  return (
    <MenuShell theme={theme} family="modern">
      <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} placeholderColor={tokens.nav_chip_text} />
      <header className="px-5 pb-3 pt-5"><p className="text-xs font-bold uppercase tracking-widest opacity-60">{business?.name || t("Negocio")}</p><h1 className="mt-1 text-3xl font-black leading-tight">{catalogue.name}</h1>{catalogue.description && <p className="mt-2 text-sm opacity-70">{catalogue.description}</p>}</header>
      <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} activeBackground={tokens.nav_chip_bg} activeColor={tokens.nav_chip_text} />
      {!products.length ? <EmptyMenu /> : <main className="space-y-7 px-4 pb-4">{visible.map((section) => <section key={section.id}><h2 className="mb-3 text-xl font-extrabold" style={{ color: tokens.category_title }}>{section.name}</h2><div className="grid grid-cols-1 gap-3 min-[370px]:grid-cols-2">{section.products.map((product) => <ModernProductCard key={product.id} product={product} theme={theme} tokens={tokens} />)}</div></section>)}</main>}
      <MenuFooter show={showEniuBadge} />
    </MenuShell>
  );
}

// --- Minimalista ------------------------------------------------------------

function MinimalProductRow({ product, theme, tokens }) {
  const { t } = useTranslation();
  const image = mainProductImage(product);
  return (
    <article data-analytics-product-key={product.tracking_key || undefined} className={`flex gap-3 border-b border-current/15 py-4 ${product.is_available ? "" : "opacity-60"}`}>
      {theme.show_product_images && image && <img src={image} alt={t("Imagen de {{name}}", { name: product.name })} className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{product.name}</h3><strong className="shrink-0 text-sm" style={{ color: tokens.price }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</strong></div>
        {product.description && <p className="mt-1 text-xs leading-5 opacity-60">{product.description}</p>}
        <div className="mt-1 flex items-center gap-2"><Availability available={product.is_available} /><PromoBadge label={product.promo_label} /></div>
      </div>
    </article>
  );
}

function MinimalLayout({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  return (
    <MenuShell theme={theme} family="minimal">
      <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} compact placeholderColor={tokens.nav_chip_text} />
      <header className="border-b border-current/15 px-5 py-5"><div className="flex items-baseline justify-between gap-3"><h1 className="text-2xl font-semibold">{catalogue.name}</h1><span className="text-[10px] uppercase tracking-widest opacity-55">{business?.name}</span></div>{catalogue.description && <p className="mt-2 text-xs leading-5 opacity-65">{catalogue.description}</p>}</header>
      <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} rounded={false} activeBackground={tokens.nav_chip_bg} activeColor={tokens.nav_chip_text} />
      {!products.length ? <EmptyMenu /> : <main className="px-5">{visible.map((section) => <section key={section.id} className="py-4"><h2 className="mb-2 border-l-2 pl-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ borderColor: "var(--menu-accent)", color: tokens.category_title }}>{section.name}</h2><div>{section.products.map((product) => <MinimalProductRow key={product.id} product={product} theme={theme} tokens={tokens} />)}</div></section>)}</main>}
      <MenuFooter show={showEniuBadge} />
    </MenuShell>
  );
}

// --- Elegante ---------------------------------------------------------------

function ElegantProductCard({ product, theme, tokens }) {
  const { t } = useTranslation();
  const image = mainProductImage(product);
  return (
    <article data-analytics-product-key={product.tracking_key || undefined} className={`border p-3 ${product.is_available ? "" : "opacity-60"}`} style={{ borderColor: "var(--menu-accent)" }}>
      {theme.show_product_images && image && <img src={image} alt={t("Imagen de {{name}}", { name: product.name })} className="mb-4 h-40 w-full object-cover" />}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1"><h3 className="text-lg italic">{product.name}</h3>{product.description && <p className="mt-2 text-xs leading-5 opacity-65">{product.description}</p>}<div className="mt-2 flex items-center gap-2"><Availability available={product.is_available} /><PromoBadge label={product.promo_label} /></div></div>
        <strong className="shrink-0 border-b pb-1 text-sm" style={{ borderColor: "var(--menu-accent)", color: tokens.price }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</strong>
      </div>
    </article>
  );
}

function ElegantLayout({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  const family = theme.font_key === "inter" ? FONT_REGISTRY.playfair.family : FONT_REGISTRY[theme.font_key]?.family;
  return (
    <div className="relative min-h-full overflow-hidden" style={{ "--menu-primary": theme.primary_color, "--menu-accent": theme.accent_color, backgroundColor: theme.background_color, color: theme.text_color, fontFamily: family }}>
      <MenuBackground theme={theme} />
      <div className="relative z-1">
        <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} placeholderColor={tokens.nav_chip_text} />
        <header className="px-7 py-7 text-center"><p className="text-[10px] uppercase tracking-[0.3em] opacity-60">{business?.name}</p><div className="mx-auto my-3 h-px w-12" style={{ backgroundColor: "var(--menu-accent)" }} /><h1 className="text-3xl italic">{catalogue.name}</h1>{catalogue.description && <p className="mx-auto mt-3 max-w-xs text-xs leading-5 opacity-65">{catalogue.description}</p>}</header>
        <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} rounded={false} activeBackground={tokens.nav_chip_bg} activeColor={tokens.nav_chip_text} />
        {!products.length ? <EmptyMenu /> : <main className="space-y-10 px-6 py-5">{visible.map((section) => <section key={section.id}><div className="mb-5 flex items-center gap-3"><span className="h-px flex-1 bg-current opacity-20" /><h2 className="text-center text-xl italic" style={{ color: tokens.category_title }}>{section.name}</h2><span className="h-px flex-1 bg-current opacity-20" /></div><div className="space-y-5">{section.products.map((product) => <ElegantProductCard key={product.id} product={product} theme={theme} tokens={tokens} />)}</div></section>)}</main>}
        <MenuFooter show={showEniuBadge} />
      </div>
    </div>
  );
}

// --- Bistró / Impactante / Natural / Retro / Lujo ---------------------------

function AdditionalProductCard({ product, theme, tokens, className, variant }) {
  const { t } = useTranslation();
  const image = mainProductImage(product);
  return (
    <article data-analytics-product-key={product.tracking_key || undefined} className={`overflow-hidden p-3 ${className} ${product.is_available ? "" : "opacity-60"}`} style={{ borderColor: "var(--menu-accent)", backgroundColor: `${tokens.surface}E8` }}>
      {theme.show_product_images && image && <img src={image} alt={t("Imagen de {{name}}", { name: product.name })} className={`mb-3 w-full object-cover ${variant === "luxury" ? "h-36" : "h-24"}`} />}
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold">{product.name}</h3>{product.description && <p className="mt-1 text-xs leading-5 opacity-65">{product.description}</p>}<div className="flex items-center gap-2"><Availability available={product.is_available} /><PromoBadge label={product.promo_label} /></div></div><strong className="shrink-0 text-sm" style={{ color: tokens.price }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</strong></div>
    </article>
  );
}

function AdditionalLayout({ variant, business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const { t } = useTranslation();
  const style = ADDITIONAL_VARIANTS[variant];
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  function choose(value) {
    setActive(value);
    if (value !== "all") onCategorySelect?.(sections.find((section) => section.id === value)?.tracking_key);
  }
  return (
    <div className="relative min-h-full overflow-hidden" style={{ "--menu-primary": theme.primary_color, "--menu-accent": theme.accent_color, backgroundColor: theme.background_color, color: theme.text_color, fontFamily: FONT_REGISTRY[theme.font_key]?.family || FONT_REGISTRY.inter.family }}>
      <MenuBackground theme={theme} />
      <div className="relative z-1">
        <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} compact={variant === "minimal"} placeholderColor={tokens.nav_chip_text} />
        <header className={`px-6 py-7 ${style.header}`}><p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">{t(style.eyebrow)}</p><h1 className="mt-2 text-3xl font-black">{catalogue.name}</h1><p className="mt-2 text-xs opacity-70">{catalogue.description || business?.name}</p></header>
        <CategoryNavigation sections={sections} active={active} onSelect={choose} rounded={variant !== "luxury"} activeBackground={tokens.nav_chip_bg} activeColor={tokens.nav_chip_text} />
        {!products.length ? <EmptyMenu /> : <main className="space-y-8 px-5 py-6">{visible.map((section) => <section key={section.id}><h2 className="mb-4 text-xl font-black" style={{ color: tokens.category_title }}>{section.name}</h2><div className={style.grid}>{section.products.map((product) => <AdditionalProductCard key={product.id} product={product} theme={theme} tokens={tokens} className={style.card} variant={variant} />)}</div></section>)}</main>}
        <MenuFooter show={showEniuBadge} />
      </div>
    </div>
  );
}

// --- Pizarra ------------------------------------------------------------

function ChalkboardProductCard({ product, tokens }) {
  return (
    <article
      data-analytics-product-key={product.tracking_key || undefined}
      className={`rounded-xl border-[3px] border-dashed p-4 ${product.is_available ? "" : "opacity-60"}`}
      style={{ borderColor: "var(--menu-accent)", backgroundColor: `${tokens.surface}CC` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black italic">{product.name}</h3>
          {product.description && <p className="mt-1 text-xs italic leading-5 opacity-70">{product.description}</p>}
          <div className="flex items-center gap-2"><Availability available={product.is_available} /><PromoBadge label={product.promo_label} /></div>
        </div>
        <span className="shrink-0 rounded-full border-2 border-dashed px-3 py-1 text-sm font-black italic" style={{ borderColor: "var(--menu-accent)", color: tokens.price }}>
          {product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}
        </span>
      </div>
    </article>
  );
}

function ChalkboardLayout({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const { t } = useTranslation();
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  return (
    <MenuShell theme={theme} family="chalkboard">
      <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} compact placeholderColor={tokens.nav_chip_text} />
      <header className="border-b-[3px] border-dashed px-6 py-6 text-center" style={{ borderColor: "var(--menu-accent)" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">{business?.name || t("Negocio")}</p>
        <h1 className="mt-2 -rotate-1 text-3xl font-black italic">{catalogue.name}</h1>
        {catalogue.description && <p className="mt-2 text-xs italic opacity-70">{catalogue.description}</p>}
      </header>
      <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} activeBackground={tokens.nav_chip_bg} activeColor={tokens.nav_chip_text} />
      {!products.length ? <EmptyMenu /> : <main className="space-y-7 px-4 pb-6">{visible.map((section) => <section key={section.id}><h2 className="mb-3 text-center text-xl font-black italic" style={{ color: tokens.category_title }}>{section.name}</h2><div className="space-y-3">{section.products.map((product) => <ChalkboardProductCard key={product.id} product={product} tokens={tokens} />)}</div></section>)}</main>}
      <MenuFooter show={showEniuBadge} />
    </MenuShell>
  );
}

// --- Revista --------------------------------------------------------------

function MagazineProductCard({ product, theme, tokens, featured }) {
  const { t } = useTranslation();
  const image = mainProductImage(product);
  return (
    <article
      data-analytics-product-key={product.tracking_key || undefined}
      className={`overflow-hidden rounded-2xl shadow-sm ${featured ? "col-span-2" : ""} ${product.is_available ? "" : "opacity-65"}`}
      style={{ backgroundColor: tokens.surface }}
    >
      {theme.show_product_images && (
        <div className={featured ? "h-56 bg-black/5" : "h-28 bg-black/5"}>
          {image ? <img src={image} alt={t("Imagen de {{name}}", { name: product.name })} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs opacity-45">{t("Sin imagen")}</div>}
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2"><h3 className={`font-black leading-tight ${featured ? "text-xl" : "text-sm"}`}>{product.name}</h3><Availability available={product.is_available} /></div>
        {product.promo_label && <div className="mt-1"><PromoBadge label={product.promo_label} /></div>}
        {product.description && <p className={`mt-1 opacity-65 ${featured ? "text-sm" : "line-clamp-2 text-xs"}`}>{product.description}</p>}
        <p className="mt-3 font-black" style={{ color: tokens.price }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</p>
      </div>
    </article>
  );
}

function MagazineLayout({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const { t } = useTranslation();
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  return (
    <MenuShell theme={theme} family="magazine">
      <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} placeholderColor={tokens.nav_chip_text} />
      <header className="px-5 pb-3 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest opacity-60">{t("Edición del chef")}</p>
        <h1 className="mt-1 text-4xl font-black uppercase leading-none tracking-tight">{catalogue.name}</h1>
        {catalogue.description && <p className="mt-2 text-sm opacity-70">{catalogue.description}</p>}
      </header>
      <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} activeBackground={tokens.nav_chip_bg} activeColor={tokens.nav_chip_text} />
      {!products.length ? <EmptyMenu /> : <main className="space-y-7 px-4 pb-4">{visible.map((section) => <section key={section.id}><h2 className="mb-3 text-xl font-extrabold" style={{ color: tokens.category_title }}>{section.name}</h2><div className="grid grid-cols-2 gap-3">{section.products.map((product, index) => <MagazineProductCard key={product.id} product={product} theme={theme} tokens={tokens} featured={index === 0} />)}</div></section>)}</main>}
      <MenuFooter show={showEniuBadge} />
    </MenuShell>
  );
}

// --- Columnas ---------------------------------------------------------------

function SidebarProductRow({ product, theme, tokens }) {
  const { t } = useTranslation();
  const image = mainProductImage(product);
  return (
    <article data-analytics-product-key={product.tracking_key || undefined} className={`flex gap-3 border-b border-current/15 py-3 ${product.is_available ? "" : "opacity-60"}`}>
      {theme.show_product_images && image && <img src={image} alt={t("Imagen de {{name}}", { name: product.name })} className="h-14 w-14 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{product.name}</h3><strong className="shrink-0 text-sm" style={{ color: tokens.price }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</strong></div>
        {product.description && <p className="mt-1 text-xs leading-5 opacity-60">{product.description}</p>}
        <div className="mt-1 flex items-center gap-2"><Availability available={product.is_available} /><PromoBadge label={product.promo_label} /></div>
      </div>
    </article>
  );
}

function SidebarLayout({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const { t } = useTranslation();
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  const [active, setActive] = useState("all");
  const visible = sections.filter((section) => active === "all" || section.id === active);
  function choose(id) {
    setActive(id);
    if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key);
  }
  return (
    <MenuShell theme={theme} family="sidebar">
      <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} compact placeholderColor={tokens.nav_chip_text} />
      <header className="px-5 pb-3 pt-4"><p className="text-xs font-bold uppercase tracking-widest opacity-60">{business?.name || t("Negocio")}</p><h1 className="mt-1 text-2xl font-semibold">{catalogue.name}</h1></header>
      {!products.length ? <EmptyMenu /> : (
        <div className="flex px-4 pb-4">
          {sections.length > 0 && (
            <nav aria-label={t("Categorías del menú")} className="flex w-20 shrink-0 flex-col gap-1 border-r border-current/15 pr-2 sm:w-28">
              <button type="button" onClick={() => choose("all")} aria-pressed={active === "all"} className="min-h-11 rounded-lg px-2 py-2 text-left text-[11px] font-bold" style={{ backgroundColor: active === "all" ? tokens.nav_chip_bg : "transparent", color: active === "all" ? tokens.nav_chip_text : "inherit" }}>{t("Todo")}</button>
              {sections.map((section) => (
                <button key={section.id} type="button" onClick={() => choose(section.id)} aria-pressed={active === section.id} className="min-h-11 rounded-lg px-2 py-2 text-left text-[11px] font-bold" style={{ backgroundColor: active === section.id ? tokens.nav_chip_bg : "transparent", color: active === section.id ? tokens.nav_chip_text : "inherit" }}>{section.name}</button>
              ))}
            </nav>
          )}
          <main className="min-w-0 flex-1 pl-4">{visible.map((section) => <section key={section.id} className="pb-4"><h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: tokens.category_title }}>{section.name}</h2><div>{section.products.map((product) => <SidebarProductRow key={product.id} product={product} theme={theme} tokens={tokens} />)}</div></section>)}</main>
        </div>
      )}
      <MenuFooter show={showEniuBadge} />
    </MenuShell>
  );
}

// --- Recibo -----------------------------------------------------------------

function ReceiptProductRow({ product, tokens }) {
  return (
    <li data-analytics-product-key={product.tracking_key || undefined} className={`flex items-baseline gap-2 py-2 font-mono text-sm ${product.is_available ? "" : "opacity-50"}`}>
      <span className="shrink-0">{product.name}</span>
      <PromoBadge label={product.promo_label} />
      <span aria-hidden="true" className="min-w-0 flex-1 border-b border-dotted border-current/40" />
      <span className="shrink-0 font-bold" style={{ color: tokens.price }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</span>
      <Availability available={product.is_available} />
    </li>
  );
}

function ReceiptLayout({ business, catalogue, categories, products, theme, coverUrl, showEniuBadge = false }) {
  const { t } = useTranslation();
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  return (
    <MenuShell theme={theme} family="receipt">
      <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} compact placeholderColor={tokens.nav_chip_text} />
      <header className="border-b-2 border-dashed px-6 py-5 text-left font-mono" style={{ borderColor: "var(--menu-accent)" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">{t("Ticket del día")}</p>
        <h1 className="mt-1 text-2xl font-semibold">{catalogue.name}</h1>
        <p className="mt-1 text-xs opacity-70">{business?.name}</p>
      </header>
      {!products.length ? <EmptyMenu /> : <main className="space-y-6 px-5 py-5">{sections.map((section) => <section key={section.id}><h2 className="mb-1 font-mono text-xs font-bold uppercase tracking-widest" style={{ color: tokens.category_title }}>{section.name}</h2><ul>{section.products.map((product) => <ReceiptProductRow key={product.id} product={product} tokens={tokens} />)}</ul></section>)}</main>}
      <MenuFooter show={showEniuBadge} />
    </MenuShell>
  );
}

// --- Historia -----------------------------------------------------------

function StoryProductCard({ product, theme, tokens }) {
  const { t } = useTranslation();
  const image = mainProductImage(product);
  return (
    <article data-analytics-product-key={product.tracking_key || undefined} className={`flex gap-4 py-6 ${product.is_available ? "" : "opacity-60"}`}>
      {theme.show_product_images && image && <img src={image} alt={t("Imagen de {{name}}", { name: product.name })} className="h-28 w-28 shrink-0 rounded-2xl object-cover" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg italic">{product.name}</h3>
          <strong className="shrink-0 border px-2 py-0.5 text-sm" style={{ borderColor: "var(--menu-accent)", color: tokens.price }}>{product.price === null ? "Consultar" : menuCurrency.format(Number(product.price))}</strong>
        </div>
        {product.description && <p className="mt-2 text-sm italic leading-6 opacity-70">{product.description}</p>}
        <div className="mt-2 flex items-center gap-2"><Availability available={product.is_available} /><PromoBadge label={product.promo_label} /></div>
      </div>
    </article>
  );
}

function StoryLayout({ business, catalogue, categories, products, theme, coverUrl, onCategorySelect, showEniuBadge = false }) {
  const { t } = useTranslation();
  const sections = useSections(categories, products);
  const tokens = useMemo(() => resolveTokens(theme), [theme]);
  const [active, setActive] = useState("all");
  const visible = active === "all" ? sections : sections.filter((section) => section.id === active);
  return (
    <MenuShell theme={theme} family="story">
      <MenuCover business={business} catalogue={catalogue} theme={theme} coverUrl={coverUrl} placeholderColor={tokens.nav_chip_text} />
      <header className="px-7 py-7 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] opacity-60">{t("Nuestra historia")}</p>
        <h1 className="mt-3 text-3xl italic">{catalogue.name}</h1>
        {catalogue.description && <p className="mx-auto mt-3 max-w-xs text-xs leading-5 opacity-65">{catalogue.description}</p>}
      </header>
      <CategoryNavigation sections={sections} active={active} onSelect={(id) => { setActive(id); if (id !== "all") onCategorySelect?.(sections.find((section) => section.id === id)?.tracking_key); }} rounded={false} activeBackground={tokens.nav_chip_bg} activeColor={tokens.nav_chip_text} />
      {!products.length ? <EmptyMenu /> : <main className="divide-y divide-current/10 px-6 pb-4">{visible.map((section) => <section key={section.id} className="py-2"><h2 className="mb-1 text-center text-lg italic" style={{ color: tokens.category_title }}>{section.name}</h2><div className="divide-y divide-current/10">{section.products.map((product) => <StoryProductCard key={product.id} product={product} theme={theme} tokens={tokens} />)}</div></section>)}</main>}
      <MenuFooter show={showEniuBadge} />
    </MenuShell>
  );
}

const LAYOUT_COMPONENTS = {
  modern: ModernLayout,
  minimal: MinimalLayout,
  elegant: ElegantLayout,
  chalkboard: ChalkboardLayout,
  magazine: MagazineLayout,
  sidebar: SidebarLayout,
  receipt: ReceiptLayout,
  story: StoryLayout,
};

export default function MenuTemplateRenderer({ layoutKey, ...props }) {
  const family = LAYOUT_FAMILY[layoutKey] || "modern";
  if (family === "additional") return <AdditionalLayout {...props} variant={layoutKey} />;
  const Layout = LAYOUT_COMPONENTS[family] || ModernLayout;
  return <Layout {...props} />;
}
