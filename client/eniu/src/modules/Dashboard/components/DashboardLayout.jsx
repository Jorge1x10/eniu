import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { X } from "lucide-react";

import darkLogo from "../../../assets/Images/eniu-DarkBannerNoBack.svg";
import { DASH_ICONS } from "../../../assets/icons/navIcons";
import BusinessSelector from "../../Business/components/selectBusiness";
import CreateBusinessModal from "../../Business/components/CreateBusinessModal";
import { useBusiness } from "../../Business/services/useBusiness";
import { useAuth } from "../../auth/hooks/useAuth";
import { getLastCatalogue, rememberCatalogue } from "../../Catalogue/utils/lastCatalogue";

const dashboardOptions = [
  { label: "Inicio", path: "/dashboard", icon: DASH_ICONS.home },
  { label: "Menús", path: "/dashboard/menus", icon: DASH_ICONS.menus },
  { label: "Productos", path: "/dashboard/productos", icon: DASH_ICONS.products },
  { label: "Categorías", path: "/dashboard/categorias", icon: DASH_ICONS.categories },
  { label: "Plantillas", path: "/dashboard/templates", icon: DASH_ICONS.templates },
  { label: "Códigos QR", path: "/dashboard/qr", icon: DASH_ICONS.qrcodes },
  { label: "Analíticas", path: "/dashboard/analiticas", icon: DASH_ICONS.analytics },
  { label: "Configuración", path: "/dashboard/configuracion", icon: DASH_ICONS.config },
];

export default function DashboardNav({ isOpen = false, onClose = () => {} }) {
  const { user, isLoading } = useAuth();
  const { selectedBusiness } = useBusiness();
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

  if (isLoading) return <p>Cargando usuario</p>;
  if (!user) return <p>No se encontraron datos del usuario</p>;

  const rawName = user.name || user.username || user.email || "Usuario";
  const displayUser = rawName[0]?.toUpperCase() + rawName.slice(1);
  const initial = displayUser.charAt(0).toUpperCase();

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
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[80vw] shrink-0 flex-col justify-between overflow-hidden rounded-br-xl rounded-tr-xl bg-[#111111] transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:w-1/5 lg:max-w-none lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-[#FFFDF5] hover:bg-[#2A2A2A] lg:hidden"
        >
          <X size={20} />
        </button>

      <div className="flex items-center gap-3 px-5 py-10">
        {user.profile_picture ? (
          <img
            src={user.profile_picture}
            alt={`Foto de ${displayUser}`}
            referrerPolicy="no-referrer"
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE05A] font-bold text-[#111111]">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#FFFDF5]">{displayUser}</p>
          <p className="text-xs text-[#FFE05A]">{user.plan?.name || "Plan gratuito"}</p>
        </div>
      </div>

      <div className="mb-3 flex h-15 w-full flex-col items-center">
        <div className="flex h-full w-7/8 rounded-2xl bg-[#2A2A2A]">
          <BusinessSelector onCreateBusiness={() => setIsCreateModalOpen(true)} />
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {dashboardOptions.map(({ label, path, icon: Icon }) => {
          const activeBusinessId = routeBusinessId || selectedBusiness?.id;
          const activeCatalogueId = routeCatalogueId || getLastCatalogue(activeBusinessId);
          const catalogueBase = activeBusinessId && activeCatalogueId
            ? `/dashboard/businesses/${activeBusinessId}/catalogues/${activeCatalogueId}`
            : null;
          let destination = path;
          if (path === "/dashboard/configuracion") {
            destination = "/dashboard/settings";
          }
          if (label === "Menús" && selectedBusiness) {
            destination = `/dashboard/businesses/${selectedBusiness.id}/catalogues`;
          }
          if (label === "Productos") {
            destination = catalogueBase
              ? `${catalogueBase}/products`
              : selectedBusiness ? `/dashboard/businesses/${selectedBusiness.id}/catalogues` : "/dashboard/menus";
          }
          if (label === "Categorías") {
            destination = catalogueBase
              ? `${catalogueBase}/categories`
              : selectedBusiness ? `/dashboard/businesses/${selectedBusiness.id}/catalogues` : "/dashboard/menus";
          }
          if (label === "Plantillas") {
            destination = catalogueBase
              ? `${catalogueBase}/templates`
              : selectedBusiness ? `/dashboard/businesses/${selectedBusiness.id}/catalogues` : "/dashboard/menus";
          }
          if (label === "Códigos QR") {
            destination = catalogueBase
              ? `${catalogueBase}/qr`
              : selectedBusiness ? `/dashboard/businesses/${selectedBusiness.id}/catalogues` : "/dashboard/menus";
          }
          if (label === "Analíticas") {
            destination = catalogueBase
              ? `${catalogueBase}/analytics`
              : selectedBusiness ? `/dashboard/businesses/${selectedBusiness.id}/catalogues` : "/dashboard/menus";
          }

          return (
            <NavLink
              key={path}
              to={destination}
              end={path === "/dashboard" || ["Menús", "Productos", "Categorías", "Plantillas", "Códigos QR", "Analíticas"].includes(label)}
              onClick={onClose}
              className={({ isActive }) => {
                const isOptionActive = label === "Productos"
                  ? location.pathname.endsWith("/products")
                  : label === "Categorías"
                    ? location.pathname.endsWith("/categories")
                    : label === "Plantillas"
                      ? location.pathname.endsWith("/templates")
                      : label === "Códigos QR"
                        ? location.pathname.endsWith("/qr")
                        : label === "Analíticas"
                          ? location.pathname.endsWith("/analytics")
                        : isActive;

                return `flex items-center gap-3 rounded-r-4xl px-2 py-2 transition-colors ${
                  isOptionActive
                    ? "bg-[#FFE05A] text-[#111111]"
                    : "text-[#FFFDF5] hover:bg-[#2A2A2A]"
                }`;
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-3">
        <img src={darkLogo} alt="ENIU" className="h-20" />
      </div>

      <CreateBusinessModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      </aside>
    </>
  );
}
