import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { X } from "lucide-react";

import darkLogo from "../../../assets/Images/eniu-logo-dark.webp";
import { DASH_ICONS } from "../../../assets/icons/navIcons";
import BusinessSelector from "../../Business/components/selectBusiness";
import CreateBusinessModal from "../../Business/components/CreateBusinessModal";
import { useBusiness } from "../../Business/services/useBusiness";
import { useAuth } from "../../auth/hooks/useAuth";
import { rememberCatalogue } from "../../Catalogue/utils/lastCatalogue";
import { useCurrentCatalogueId } from "../../Catalogue/hooks/useCurrentCatalogueId";
import { useTranslation } from "react-i18next";
import { useLiveOrdersContext } from "../../Ordering/context/LiveOrdersContext";

// `key` identifica la opción y `label` sólo se dibuja. La lógica de rutas de
// abajo se decide por la clave y nunca por el rótulo: comparar contra el texto
// visible dejaría de funcionar en cuanto la interfaz cambia de idioma.
//
// Agrupada como en el diseño: lo que se mira durante el servicio, lo que se
// edita del menú y lo del negocio. "Códigos QR" ya no tiene entrada propia:
// se llega desde el detalle del menú (publicación) y desde Mesas.
const NAV_GROUPS = [
  { key: "start", items: [
    { key: "home", label: "Inicio", path: "/dashboard", icon: DASH_ICONS.home },
  ] },
  { key: "service", title: "Servicio", items: [
    { key: "orders", label: "Pedidos", path: "/dashboard/pedidos", icon: DASH_ICONS.orders },
    { key: "tables", label: "Mesas", path: "/dashboard/mesas", icon: DASH_ICONS.tables },
  ] },
  { key: "menu", title: "Tu menú", items: [
    { key: "menus", label: "Menús", path: "/dashboard/menus", icon: DASH_ICONS.menus },
    { key: "products", label: "Productos y categorías", path: "/dashboard/productos", icon: DASH_ICONS.products },
    { key: "templates", label: "Diseño", path: "/dashboard/templates", icon: DASH_ICONS.templates },
    { key: "promotions", label: "Promociones", path: "/dashboard/promociones", icon: DASH_ICONS.promotions },
  ] },
  { key: "business", title: "Negocio", items: [
    { key: "analytics", label: "Analíticas", path: "/dashboard/analiticas", icon: DASH_ICONS.analytics },
    { key: "settings", label: "Configuración", path: "/dashboard/settings", icon: DASH_ICONS.config },
  ] },
];

// Secciones que cuelgan de un menú concreto: comparten la forma de la ruta y
// el criterio para saber si están activas. "Productos y categorías" abre los
// productos y sigue marcada en categorías.
const CATALOGUE_SECTIONS = {
  products: { path: "products", activeOn: ["products", "categories"] },
  templates: { path: "templates", activeOn: ["templates"] },
  promotions: { path: "promotions", activeOn: ["promotions"] },
  analytics: { path: "analytics", activeOn: ["analytics"] },
};

export default function DashboardNav({ isOpen = false, onClose = () => {} }) {
  const { t } = useTranslation();

  const { user, isLoading } = useAuth();
  const { selectedBusiness } = useBusiness();
  const { pendingCount } = useLiveOrdersContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const location = useLocation();
  const catalogueMatch = location.pathname.match(
    /^\/dashboard\/businesses\/([^/]+)\/catalogues\/([^/]+)/
  );
  const routeBusinessId = catalogueMatch?.[1] || null;
  const routeCatalogueId = catalogueMatch?.[2] || null;

  useEffect(() => {
    if (routeBusinessId && routeCatalogueId) {
      rememberCatalogue(routeBusinessId, routeCatalogueId);
    }
  }, [routeBusinessId, routeCatalogueId]);

  // Sin menú en la ruta, las secciones de menú abren el recordado o, si no
  // hay, el primero del negocio. Sólo se cae a la lista cuando no tiene menús.
  const activeBusinessId = routeBusinessId || selectedBusiness?.id || null;
  const currentCatalogueId = useCurrentCatalogueId(activeBusinessId, { skip: Boolean(routeCatalogueId) });

  if (isLoading) return <p>{t("Cargando usuario")}</p>;
  if (!user) return <p>{t("No se encontraron datos del usuario")}</p>;

  const rawName = user.name || user.username || user.email || "Usuario";
  const displayUser = rawName[0]?.toUpperCase() + rawName.slice(1);
  const initial = displayUser.charAt(0).toUpperCase();

  const activeCatalogueId = routeCatalogueId || currentCatalogueId;
  const catalogueBase = activeBusinessId && activeCatalogueId
    ? `/dashboard/businesses/${activeBusinessId}/catalogues/${activeCatalogueId}`
    : null;
  const businessFallback = selectedBusiness
    ? `/dashboard/businesses/${selectedBusiness.id}/catalogues`
    : "/dashboard/menus";

  function destinationFor(key, path) {
    if (key === "menus" && selectedBusiness) return `/dashboard/businesses/${selectedBusiness.id}/catalogues`;
    const section = CATALOGUE_SECTIONS[key];
    if (section) return catalogueBase ? `${catalogueBase}/${section.path}` : businessFallback;
    return path;
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] shrink-0 flex-col bg-eniu-ink text-eniu-cream transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-6">
          <img src={darkLogo} alt="ENIU" className="h-9 w-auto" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Cerrar menú")}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-eniu-cream hover:bg-eniu-ink-soft lg:hidden"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mx-4 mb-4 h-15 rounded-2xl bg-eniu-ink-soft">
          <BusinessSelector onCreateBusiness={() => setIsCreateModalOpen(true)} />
        </div>

        <nav aria-label={t("Navegación del panel")} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.key} className={group.title ? "mt-5" : ""}>
              {group.title && (
                <p className="mb-1.5 px-3 text-[11px] font-extrabold uppercase tracking-[1.2px] text-eniu-hero-muted">{t(group.title)}</p>
              )}
              <ul className="space-y-0.5">
                {group.items.map(({ key, label, path, icon: Icon }) => {
                  const section = CATALOGUE_SECTIONS[key];
                  const badge = key === "orders" && pendingCount > 0 ? pendingCount : null;
                  return (
                    <li key={key}>
                      <NavLink
                        to={destinationFor(key, path)}
                        end={key !== "settings"}
                        onClick={onClose}
                        aria-label={badge ? t("{{label}}, {{count}} por aceptar", { label: t(label), count: badge }) : undefined}
                        className={({ isActive }) => {
                          const active = section
                            ? section.activeOn.some((name) => location.pathname.endsWith(`/${name}`))
                            : isActive;
                          return `flex min-h-11 items-center gap-3 rounded-full px-3 text-[15px] font-semibold transition-colors ${
                            active
                              ? "bg-eniu-yellow text-eniu-ink"
                              : "text-eniu-cream hover:bg-eniu-ink-soft"
                          }`;
                        }}
                      >
                        <Icon size={19} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{t(label)}</span>
                        {badge && (
                          <span aria-hidden="true" className="min-w-6 rounded-full bg-eniu-yellow px-2 py-0.5 text-center text-xs font-black tabular-nums text-eniu-ink ring-2 ring-eniu-ink">
                            {badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-2xl bg-eniu-ink-soft p-3">
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={t("Foto de {{name}}", { name: displayUser })}
              referrerPolicy="no-referrer"
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-eniu-yellow font-black text-eniu-ink">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-eniu-cream">{displayUser}</p>
            <p className="truncate text-xs font-semibold text-eniu-yellow">{user.plan?.name || t("Plan gratuito")}</p>
          </div>
        </div>

        <CreateBusinessModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </aside>
    </>
  );
}
