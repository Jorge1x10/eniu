import { currentLocale } from "../../../i18n/formats";
import i18n from "../../../i18n";
function safeDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildDashboardViewModel({ catalogues = [], selectedCatalogue = null, analytics = null, chartDays = 7, now = new Date() }) {
  const sortedMenus = [...catalogues].sort((left, right) => new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0));
  const visits = analytics?.visits_over_time || [];
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyViews = analytics ? visits.filter((item) => item.date.startsWith(monthPrefix)).reduce((total, item) => total + Number(item.views || 0), 0) : null;
  const chart = visits.slice(-chartDays).map((item) => ({
    ...item,
    label: safeDate(item.date)?.toLocaleDateString(currentLocale(), { weekday: "short" }).replace(".", "") || item.date,
  }));
  const qr = analytics?.sources?.find((item) => item.key === "qr");
  return {
    metrics: {
      monthlyViews,
      activeMenus: catalogues.filter((item) => item.is_published).length,
      draftMenus: catalogues.filter((item) => !item.is_published).length,
      products: null,
      qrScans: analytics ? Number(qr?.views || 0) : null,
    },
    chart,
    chartTotal: chart.reduce((total, item) => total + Number(item.views || 0), 0),
    period: chart.length ? `${chart[0].date} — ${chart.at(-1).date}` : i18n.t("Últimos {{days}} días", { days: chartDays }),
    menus: sortedMenus.slice(0, 3).map((menu) => ({
      ...menu,
      productCount: null,
      views: menu.id === selectedCatalogue?.id && analytics ? analytics.summary?.menu_views?.value ?? null : null,
    })),
    selectedCatalogue,
  };
}
