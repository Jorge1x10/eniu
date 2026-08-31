import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLocation, useParams } from "react-router";

import { getPublicMenu } from "../services/publicMenuService";
import { adaptPublicMenu } from "../utils/publicMenuAdapter";
import { resolveTemplate } from "../../Templates/templates/templateRegistry";
import MenuSplash from "../components/MenuSplash";
import { usePublicAnalytics } from "../analytics/publicAnalytics";
import { useTranslation } from "react-i18next";

export default function PublicMenuPage() {
  const { t } = useTranslation();

  const { publicSlug } = useParams();
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
  }, [publicSlug]);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => loadMenu(controller.signal), 0);
    return () => {
      window.clearTimeout(task);
      controller.abort();
    };
  }, [loadMenu]);

  if (isLoading) return <div className="flex min-h-dvh items-center justify-center bg-[#FFFDF5] px-5 text-center"><p aria-live="polite" className="font-semibold text-[#2A2A2A]">{t("Cargando menú...")}</p></div>;
  if (error || !menu) return <div className="flex min-h-dvh items-center justify-center bg-[#FFFDF5] p-5"><div className="w-full max-w-md rounded-2xl border border-[#E9DDB7] bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold text-[#111111]">{error}</h1>{canRetry && <button type="button" onClick={() => loadMenu()} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-4 font-semibold text-white"><RefreshCw size={17} /> {t("Reintentar")}</button>}</div></div>;

  return <main ref={menuRootRef} className="min-h-dvh w-full overflow-x-hidden bg-white">{createElement(resolveTemplate(menu.templateKey), { business: menu.business, catalogue: menu.catalogue, categories: menu.categories, products: menu.products, theme: menu.theme, coverUrl: menu.coverUrl, onCategorySelect, showEniuBadge: menu.showEniuBadge })}{menu.splash?.enabled && <MenuSplash splash={menu.splash} theme={menu.theme} businessName={menu.business?.name} />}</main>;
}
