import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, ShoppingBag } from "lucide-react";
import { Link, useLocation, useParams } from "react-router";

import { getPublicMenu } from "../services/publicMenuService";
import { adaptPublicMenu } from "../utils/publicMenuAdapter";
import { resolveTemplate } from "../../Templates/templates/templateRegistry";
import MenuSplash from "../components/MenuSplash";
import { usePublicAnalytics } from "../analytics/publicAnalytics";
import { useTranslation } from "react-i18next";
import { MenuCurrencyContext, MenuOrderingContext, resolveTokens } from "../../Templates/templates/menuData";
import { FONT_REGISTRY } from "../../Templates/utils/themeDefaults";
import TableOrderingLayer from "../ordering/TableOrderingLayer";
import { isOrderable, useTableOrdering } from "../ordering/useTableOrdering";

export default function PublicMenuPage({ takeaway = false, delivery = false }) {
  const { t } = useTranslation();

  // `qrToken` llega cuando el menú se abre con el QR de una mesa
  // (`/m/<slug>/mesa/<qr>`): entonces se puede pedir desde la plantilla.
  // `takeaway` (`/m/<slug>/para-llevar`): se pide para llevar, sin mesa.
  const { publicSlug, qrToken } = useParams();
  const location = useLocation();
  const [menu, setMenu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // Reintentar sirve cuando la carga fallo por algo pasajero, no cuando el
  // menu no existe. Se guarda aparte y no se deduce del texto del error:
  // ese texto cambia con el idioma.
  const [canRetry, setCanRetry] = useState(false);
  const mountedRef = useRef(true);
  const menuRootRef = useRef(null);
  const onCategorySelect = usePublicAnalytics(publicSlug, menuRootRef, Boolean(menu), location.search);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadMenu = useCallback(async (signal) => {
    setIsLoading(true); setError(""); setCanRetry(false);
    const response = await getPublicMenu(publicSlug, { signal });
    if (response.aborted || !mountedRef.current) return;
    if (!response.ok) {
      setMenu(null);
      const missing = response.status === 404;
      setError(missing
        ? t("Este menú no está disponible.")
        : t("No pudimos cargar el menú. Intenta nuevamente."));
      setCanRetry(!missing);
      setIsLoading(false);
      return;
    }
    setMenu(adaptPublicMenu(response.data?.menu));
    setIsLoading(false);
  }, [publicSlug, t]);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => loadMenu(controller.signal), 0);
    return () => {
      window.clearTimeout(task);
      controller.abort();
    };
  }, [loadMenu]);

  const remote = (takeaway || delivery) && !qrToken;
  const ordering = useTableOrdering(qrToken, menu?.products, remote ? publicSlug : null, delivery);
  const tokens = useMemo(() => (menu ? resolveTokens(menu.theme) : null), [menu]);
  const orderingContext = useMemo(() => (ordering.active && tokens ? {
    canOrder: ordering.canBrowseOrder,
    isOrderable,
    quantityOf: ordering.quantityOf,
    add: ordering.add,
    decrement: ordering.decrement,
    colors: { background: tokens.nav_chip_bg, text: tokens.nav_chip_text },
  } : null), [ordering.active, ordering.canBrowseOrder, ordering.quantityOf, ordering.add, ordering.decrement, tokens]);
  const palette = useMemo(() => (menu && tokens ? {
    background: menu.theme.background_color,
    text: menu.theme.text_color,
    button: tokens.nav_chip_bg,
    buttonText: tokens.nav_chip_text,
    rule: "rgba(127,127,127,0.25)",
    font: FONT_REGISTRY[menu.theme.font_key]?.family || FONT_REGISTRY.inter.family,
  } : null), [menu, tokens]);

  if (isLoading) return <div className="flex min-h-dvh items-center justify-center bg-[#FFFDF5] px-5 text-center"><p aria-live="polite" className="font-semibold text-[#2A2A2A]">{t("Cargando menú...")}</p></div>;
  if (error || !menu) return <div className="flex min-h-dvh items-center justify-center bg-[#FFFDF5] p-5"><div className="w-full max-w-md rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold text-[#111111]">{error}</h1>{canRetry && <button type="button" onClick={() => loadMenu()} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-4 font-semibold text-white"><RefreshCw size={17} /> {t("Reintentar")}</button>}</div></div>;

  const template = createElement(resolveTemplate(menu.templateKey), { business: menu.business, catalogue: menu.catalogue, categories: menu.categories, products: menu.products, theme: menu.theme, coverUrl: menu.coverUrl, onCategorySelect, showEniuBadge: menu.showEniuBadge });
  return <main ref={menuRootRef} className="min-h-dvh w-full overflow-x-hidden bg-white">
    {ordering.active ? <MenuOrderingContext.Provider value={orderingContext}>{template}</MenuOrderingContext.Provider> : template}
    {ordering.active && <>
      {/* Hueco para que la barra de la mesa no tape el pie del menú. */}
      <div aria-hidden="true" className="h-28" style={{ backgroundColor: menu.theme.background_color }} />
      <MenuCurrencyContext.Provider value={menu.business?.currency || "MXN"}>
        <TableOrderingLayer ordering={ordering} palette={palette} />
      </MenuCurrencyContext.Provider>
    </>}
    {/* El menú sin mesa invita a pedir para llevar si el negocio lo ofrece. */}
    {!ordering.active && (menu.takeaway || menu.delivery) && palette && <div aria-hidden="true" className="h-24" style={{ backgroundColor: menu.theme.background_color }} />}
    {!ordering.active && (menu.takeaway || menu.delivery) && palette && (
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Link
          to={`/m/${publicSlug}/${menu.takeaway ? "para-llevar" : "a-domicilio"}${location.search}`}
          className="flex min-h-[54px] items-center gap-2 rounded-full px-6 font-extrabold shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
          style={{ backgroundColor: palette.button, color: palette.buttonText, fontFamily: palette.font }}
        >
          <ShoppingBag size={18} aria-hidden="true" />
          {menu.takeaway && menu.delivery ? t("Pedir para llevar o a domicilio") : menu.delivery ? t("Pedir a domicilio") : t("Pedir para llevar")}
        </Link>
      </div>
    )}
    {menu.splash?.enabled && <MenuSplash splash={menu.splash} theme={menu.theme} businessName={menu.business?.name} />}
  </main>;
}
