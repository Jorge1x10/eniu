import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Box, Plus, QrCode, RefreshCw, ScanLine } from "lucide-react";
import { useNavigate } from "react-router";

import CreateBusinessModal from "../../Business/components/CreateBusinessModal";
import { useBusiness } from "../../Business/services/useBusiness";
import CreateCatalogueModal from "../../Catalogue/components/CreateCatalogueModal";
import { useCatalogueService } from "../../Catalogue/services/catalogueService";
import { getLastCatalogue, rememberCatalogue } from "../../Catalogue/utils/lastCatalogue";
import { useAuth } from "../../auth/hooks/useAuth";
import { ActiveMenus, DashboardSkeleton, MenuViewsChart, MetricCard, QuickActions, RecentActivity } from "../components/HomeDashboardSections";
import { useDashboardSummaryService } from "../services/dashboardSummaryService";
import { buildDashboardViewModel } from "../utils/dashboardViewModel";
import { useTranslation } from "react-i18next";

const metricDefinitions = [
  { key: "monthlyViews", title: "Vistas este mes", icon: ScanLine, tone: "yellow" },
  { key: "activeMenus", title: "Menús activos", icon: BookOpen, tone: "cream" },
  { key: "products", title: "Productos", icon: Box, tone: "sand" },
  { key: "qrScans", title: "Escaneos QR", icon: QrCode, tone: "yellow", titleHint: "Atribución aproximada basada en enlaces con origen QR." },
];

export default function HomePage() {
  const { t } = useTranslation();

  const { user } = useAuth();
  const { selectedBusiness, isLoadingBusinesses } = useBusiness();
  const businessId = selectedBusiness?.id || null;
  const loadSummary = useDashboardSummaryService(businessId);
  const { create } = useCatalogueService(businessId);
  const navigate = useNavigate();
  const [rawData, setRawData] = useState(null);
  const [chartDays, setChartDays] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
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
  }, [businessId, loadSummary]);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => load(controller.signal), 0);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [load]);

  const viewModel = useMemo(() => buildDashboardViewModel({ ...(rawData || {}), chartDays }), [chartDays, rawData]);
  const visibleName = user?.name || user?.username || "bienvenido";
  const metricDetails = {
    monthlyViews: rawData?.analytics ? t("Menú seleccionado: {{name}}", { name: viewModel.selectedCatalogue?.name }) : t("Sin información disponible"),
    activeMenus: t("{{count}} en borrador", { count: viewModel.metrics.draftMenus }),
    products: t("Sin resumen agregado disponible"),
    qrScans: rawData?.analytics ? t("Atribución aproximada en el periodo") : t("Sin información disponible"),
  };

  function openCreateMenu() {
    if (businessId) setIsCreateMenuOpen(true);
  }

  function handleCreated(catalogue) {
    setIsCreateMenuOpen(false);
    rememberCatalogue(businessId, catalogue.id);
    navigate(`/dashboard/businesses/${businessId}/catalogues/${catalogue.id}`, { state: { catalogue } });
  }

  if (isLoadingBusinesses || isLoading) return <div className="p-2 sm:p-4"><DashboardSkeleton /></div>;

  if (!selectedBusiness) {
    return <section className="flex min-h-[70vh] items-center justify-center p-4 text-center"><div className="max-w-lg rounded-[18px] border border-[#E9DDB7] bg-[#FFFDF5] p-8"><h1 className="text-2xl font-extrabold">{t("Selecciona un negocio")}</h1><p className="mt-3 text-sm text-[#666666]">{t("Selecciona un negocio desde la barra lateral o crea uno para comenzar a administrar tus menús.")}</p><button type="button" onClick={() => setIsCreateBusinessOpen(true)} className="mt-6 min-h-11 cursor-pointer rounded-xl bg-[#FFE05A] px-5 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]">{t("Crear negocio")}</button><CreateBusinessModal isOpen={isCreateBusinessOpen} onClose={() => setIsCreateBusinessOpen(false)} /></div></section>;
  }

  return <section className="min-w-0 space-y-6 overflow-x-hidden p-2 text-[#111111] font-['Manrope',ui-sans-serif,system-ui] sm:p-4">
    <header className="flex flex-col gap-3 rounded-xl bg-white sm:flex-row sm:items-start sm:justify-between sm:gap-5 p-3 items-center justify-center sm:h-20"><div><h1 className="text-[25px] font-extrabold leading-tight">{t("Hola,")} {visibleName} 👋</h1><p className="mt-1 text-xs text-[#2A2A2A]">{t("Así se están comportando tus menús hoy.")}</p></div><button type="button" onClick={openCreateMenu} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFE05A] px-4.5 text-sm font-bold hover:bg-[#E8C93D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111] sm:w-auto"><Plus aria-hidden="true" size={18} /> {t("Crear menú")}</button></header>
    {error ? <div className="rounded-2xl border border-red-200 bg-white p-8 text-center"><p role="alert" className="font-semibold">{t("No pudimos cargar el resumen de tu negocio.")}</p><button type="button" onClick={() => load()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#2A2A2A] px-4 font-bold text-white"><RefreshCw aria-hidden="true" size={17} /> {t("Reintentar")}</button></div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricDefinitions.map((metric) => <MetricCard key={metric.key} {...metric} value={viewModel.metrics[metric.key]} detail={metricDetails[metric.key]} />)}</div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,376px)]"><MenuViewsChart points={viewModel.chart} total={viewModel.chartTotal} period={viewModel.period} days={chartDays} onDaysChange={setChartDays} /><QuickActions businessId={businessId} catalogueId={viewModel.selectedCatalogue?.id} onCreateMenu={openCreateMenu} /></div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,376px)]"><ActiveMenus menus={viewModel.menus} businessId={businessId} onCreateMenu={openCreateMenu} /><RecentActivity /></div>
    </>}
    {isCreateMenuOpen && <CreateCatalogueModal onClose={() => setIsCreateMenuOpen(false)} onCreate={create} onCreated={handleCreated} />}
  </section>;
}
