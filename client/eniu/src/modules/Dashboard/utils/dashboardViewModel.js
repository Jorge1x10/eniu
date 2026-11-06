import { currentLocale } from "../../../i18n/formats";
import i18n from "../../../i18n";
function safeDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildDashboardViewModel({ catalogues = [], selectedCatalogue = null, analytics = null, analyticsScope = "full", productCount = null, chartDays = 7, now = new Date() }) {
  const sortedMenus = [...catalogues].sort((left, right) => new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0));
  const visits = analytics?.visits_over_time || [];
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // El resumen del gratuito sólo trae 7 días: sumarlos como "este mes" daría
  // una cifra que parece del mes y no lo es.
  const isSummary = analyticsScope === "summary";
  const monthlyViews = analytics && !isSummary ? visits.filter((item) => item.date.startsWith(monthPrefix)).reduce((total, item) => total + Number(item.views || 0), 0) : null;
  const weeklyViews = analytics && isSummary ? visits.reduce((total, item) => total + Number(item.views || 0), 0) : null;
  const chart = visits.slice(-chartDays).map((item) => ({
    ...item,
    label: safeDate(item.date)?.toLocaleDateString(currentLocale(), { weekday: "short" }).replace(".", "") || item.date,
  }));
  const qr = analytics?.sources?.find((item) => item.key === "qr");
  return {
    metrics: {
      monthlyViews,
      weeklyViews,
      activeMenus: catalogues.filter((item) => item.is_published).length,
      draftMenus: catalogues.filter((item) => !item.is_published).length,
      // Los productos del menú elegido; null si la consulta no llegó.
      products: productCount ?? null,
      qrScans: analytics && !isSummary ? Number(qr?.views || 0) : null,
    },
    chart,
    chartTotal: chart.reduce((total, item) => total + Number(item.views || 0), 0),
    period: chart.length ? `${chart[0].date} — ${chart.at(-1).date}` : i18n.t("Últimos {{days}} días", { days: chartDays }),
    menus: sortedMenus.slice(0, 3).map((menu) => ({
      ...menu,
      productCount: menu.id === selectedCatalogue?.id ? productCount ?? null : null,
      views: menu.id === selectedCatalogue?.id && analytics ? analytics.summary?.menu_views?.value ?? null : null,
    })),
    selectedCatalogue,
    analyticsScope,
  };
}
