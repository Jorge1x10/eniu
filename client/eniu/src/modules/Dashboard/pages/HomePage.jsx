import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router";

import CreateBusinessModal from "../../Business/components/CreateBusinessModal";
import { useBusiness } from "../../Business/services/useBusiness";
import CreateCatalogueModal from "../../Catalogue/components/CreateCatalogueModal";
import { useCatalogueService } from "../../Catalogue/services/catalogueService";
import { getLastCatalogue, rememberCatalogue } from "../../Catalogue/utils/lastCatalogue";
import OrderingSwitch from "../../Ordering/components/OrderingSwitch";
import { useLiveOrdersContext } from "../../Ordering/context/LiveOrdersContext";
import { orderingErrorMessage, useOrderingService } from "../../Ordering/services/orderingService";
import { useAuth } from "../../auth/hooks/useAuth";
import { usePlan } from "../../auth/hooks/usePlan";
import { DashboardSkeleton, KpiCard, MenuViewsCard, PendingOrdersCard, ShortcutsCard, TablesNowCard } from "../components/HomeDashboardSections";
import { analyticsScopeFor, useDashboardSummaryService } from "../services/dashboardSummaryService";
import { buildDashboardViewModel } from "../utils/dashboardViewModel";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDate, formatNumber } from "../../../i18n/formats";

const number = (value) => value === null || value === undefined ? "—" : formatNumber(value);

export default function HomePage() {
  const { t } = useTranslation();

  const { user } = useAuth();
  const { limits } = usePlan();
  const analyticsScope = analyticsScopeFor(limits);
  const { selectedBusiness, isLoadingBusinesses } = useBusiness();
  const businessId = selectedBusiness?.id || null;
  const loadSummary = useDashboardSummaryService(businessId, selectedBusiness?.timezone, analyticsScope);
  const { create } = useCatalogueService(businessId);
  const { listTables, setOrdering, setOrderStatus } = useOrderingService(businessId);
  const { accounts, ordering, refresh: refreshOrders } = useLiveOrdersContext();
  const navigate = useNavigate();
  const [rawData, setRawData] = useState(null);
  const [tables, setTables] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isToggling, setIsToggling] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (signal) => {
    if (!businessId) { setRawData(null); setIsLoading(false); setError(""); return; }
    setIsLoading(true); setError("");
    const response = await loadSummary({ preferredCatalogueId: getLastCatalogue(businessId), signal });
    if (response.aborted || !mountedRef.current) return;
    if (!response.ok) { setError(t("No pudimos cargar el resumen de tu negocio.")); setIsLoading(false); return; }
    if (response.data.selectedCatalogue) rememberCatalogue(businessId, response.data.selectedCatalogue.id);
    setRawData(response.data); setIsLoading(false);
  }, [businessId, loadSummary, t]);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => load(controller.signal), 0);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [load]);

  // Las mesas sólo alimentan "Mesas ahora" y "de N mesas": si fallan, Inicio
  // sigue en pie con esas dos piezas vacías.
  useEffect(() => {
    if (!businessId) return undefined;
    const controller = new AbortController();
    listTables({ signal: controller.signal }).then((response) => {
      if (response.aborted || !mountedRef.current) return;
      setTables(response.ok ? response.data?.tables || [] : []);
    });
    return () => controller.abort();
  }, [businessId, listTables]);

  const viewModel = useMemo(() => buildDashboardViewModel({ ...(rawData || {}), chartDays: 7 }), [rawData]);
  const visibleName = user?.name || user?.username || t("bienvenido");
  const catalogue = viewModel.selectedCatalogue;
  const currency = selectedBusiness?.currency || "MXN";

  const activeOrders = accounts.reduce((sum, account) => sum + account.orders.filter((order) => order.status !== "cancelled").length, 0);
  const pendingOrders = accounts.reduce((sum, account) => sum + (account.pending_orders || 0), 0);
  const toCollect = accounts.reduce((sum, account) => sum + Number(account.total || 0), 0);
  const activeTables = tables ? tables.filter((table) => table.is_active).length : null;
  const productLimit = limits?.max_products_per_catalogue;

  async function toggleOrdering() {
    setIsToggling(true); setActionError("");
    const response = await setOrdering(!ordering?.enabled);
    setIsToggling(false);
    if (!response.ok) { setActionError(orderingErrorMessage(response, t("No pudimos cambiar el estado de los pedidos."))); return; }
    refreshOrders({ force: true });
  }

  async function acceptOrder(order) {
    setActionError("");
    const response = await setOrderStatus(order.id, "received");
    if (!response.ok) setActionError(orderingErrorMessage(response, t("No pudimos actualizar el pedido.")));
    await refreshOrders({ force: true });
  }

  function handleCreated(created) {
    setIsCreateMenuOpen(false);
    rememberCatalogue(businessId, created.id);
    navigate(`/dashboard/businesses/${businessId}/catalogues/${created.id}`, { state: { catalogue: created } });
  }

  if (isLoadingBusinesses || isLoading) return <DashboardSkeleton />;

  if (!selectedBusiness) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center p-4 text-center">
        <div className="max-w-lg rounded-3xl border border-eniu-warm bg-eniu-surface p-8">
          <h1 className="text-2xl font-black">{t("Selecciona un negocio")}</h1>
          <p className="mt-3 text-sm text-eniu-muted">{t("Selecciona un negocio desde la barra lateral o crea uno para comenzar a administrar tus menús.")}</p>
          <button type="button" onClick={() => setIsCreateBusinessOpen(true)} className="mt-6 min-h-11 cursor-pointer rounded-xl bg-eniu-yellow px-5 font-bold text-eniu-ink">{t("Crear negocio")}</button>
          <CreateBusinessModal isOpen={isCreateBusinessOpen} onClose={() => setIsCreateBusinessOpen(false)} />
        </div>
      </section>
    );
  }

  const today = formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" });
  const publicPath = catalogue?.is_published && catalogue?.public_slug ? `/m/${catalogue.public_slug}` : null;

  return (
    <section className="mx-auto w-full max-w-[1400px] min-w-0 space-y-5 text-eniu-text">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{today}</p>
          <h1 className="mt-1 text-[34px] font-black leading-tight tracking-[-1.2px]">{t("Hola, {{name}}", { name: visibleName })}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ordering && ordering.reason !== "plan" && (
            <OrderingSwitch enabled={ordering.enabled} busy={isToggling} onToggle={toggleOrdering} />
          )}
          {publicPath ? (
            <a href={publicPath} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-eniu-hero px-4 font-bold text-eniu-cream hover:bg-eniu-hero-hover">
              {t("Ver menú como cliente")} <ExternalLink size={16} aria-hidden="true" />
            </a>
          ) : catalogue ? (
            <Link to={`/dashboard/businesses/${businessId}/catalogues/${catalogue.id}/qr`} className="inline-flex min-h-11 items-center rounded-xl bg-eniu-hero px-4 font-bold text-eniu-cream hover:bg-eniu-hero-hover">
              {t("Publicar menú")}
            </Link>
          ) : (
            <button type="button" onClick={() => setIsCreateMenuOpen(true)} className="min-h-11 cursor-pointer rounded-xl bg-eniu-hero px-4 font-bold text-eniu-cream hover:bg-eniu-hero-hover">
              {t("Crea tu primer menú")}
            </button>
          )}
        </div>
      </header>

      {actionError && <p role="alert" className="rounded-xl bg-eniu-danger-soft px-4 py-3 text-sm font-semibold text-eniu-danger">{actionError}</p>}

      {error ? (
        <div className="rounded-3xl border border-eniu-warm bg-eniu-surface p-8 text-center">
          <p role="alert" className="font-semibold">{t("No pudimos cargar el resumen de tu negocio.")}</p>
          <button type="button" onClick={() => load()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-eniu-hero px-4 font-bold text-eniu-cream"><RefreshCw aria-hidden="true" size={17} /> {t("Reintentar")}</button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {/* TODO(diseño): el diseño pide "Pedidos hoy", pero el backend sólo
                entrega las cuentas abiertas; se muestran los pedidos en curso. */}
            <KpiCard
              title={t("Pedidos en curso")}
              value={number(activeOrders)}
              detail={pendingOrders ? t("{{count}} por aceptar", { count: pendingOrders }) : t("Ninguno por aceptar")}
            />
            <KpiCard
              title={t("Cuentas abiertas")}
              value={number(accounts.length)}
              accessory={activeTables !== null ? t("de {{count}} mesas", { count: activeTables }) : null}
              detail={t("{{amount}} por cobrar", { amount: formatCurrency(toCollect, currency) })}
            />
            <KpiCard
              title={t("Vistas en 7 días")}
              value={number(rawData?.analytics ? viewModel.chartTotal : null)}
              detail={rawData?.analytics ? t("Menú {{name}}", { name: catalogue?.name }) : t("Sin información disponible")}
            />
            <KpiCard
              title={t("Productos")}
              value={number(viewModel.metrics.products)}
              accessory={productLimit && viewModel.metrics.products !== null ? t("de {{count}}", { count: productLimit }) : null}
              detail={productLimit ? t("Límite por menú de tu plan") : catalogue ? t("Menú {{name}}", { name: catalogue.name }) : t("Sin información disponible")}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <PendingOrdersCard accounts={accounts} ordering={ordering} onAccept={acceptOrder} />
            <TablesNowCard tables={tables} accounts={accounts} />
          </div>

          <div className="flex flex-wrap gap-4">
            <MenuViewsCard points={viewModel.chart} total={viewModel.chartTotal} hasData={Boolean(rawData?.analytics)} />
            <ShortcutsCard businessId={businessId} catalogueId={catalogue?.id} />
          </div>
        </>
      )}
      {isCreateMenuOpen && <CreateCatalogueModal onClose={() => setIsCreateMenuOpen(false)} onCreate={create} onCreated={handleCreated} />}
    </section>
  );
}
