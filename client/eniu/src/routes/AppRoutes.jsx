import { lazy, Suspense } from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router";
import { useTranslation } from "react-i18next";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

const LoginPage = lazy(() => import("../modules/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("../modules/auth/pages/RegisterPage"));
const DashboardPage = lazy(() => import("../modules/Dashboard/pages/DashboardPage"));
const MenuPage = lazy(() => import("../modules/Dashboard/pages/MenuPage"));
const ProductsPage = lazy(() => import("../modules/Catalogue/pages/ProductsPage"));
const CategoriesPage = lazy(() => import("../modules/Catalogue/pages/CategoriesPage"));
const QrPage = lazy(() => import("../modules/Dashboard/pages/QrPage"));
const SettingsPage = lazy(() => import("../modules/Settings/pages/SettingsPage"));
const ForgotPasswordPage = lazy(() => import("../modules/Settings/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../modules/Settings/pages/ResetPasswordPage"));
const AnalitycsPage = lazy(() => import("../modules/Dashboard/pages/AnalitycsPage"));
const HomePage = lazy(() => import("../modules/Dashboard/pages/HomePage"));
const BusinessPage = lazy(() => import("../modules/Business/pages/BusinessPage"));
const CataloguesPage = lazy(() => import("../modules/Catalogue/pages/CataloguesPage"));
const CatalogueDetailPage = lazy(() => import("../modules/Catalogue/pages/CatalogueDetailPage"));
const TemplatesPage = lazy(() => import("../modules/Templates/pages/TemplatesPage"));
const PromotionsPage = lazy(() => import("../modules/Templates/pages/PromotionsPage"));
const PublicationPage = lazy(() => import("../modules/Publication/pages/PublicationPage"));

// Cada pantalla se descarga al visitarla. Las del dashboard esperan dentro de
// su propio `Suspense` (`MotionDiv`), así que la barra lateral no parpadea al
// cambiar de sección; éste cubre las pantallas de acceso.
function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center text-[#666666]">
      {t("Cargando…")}
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route element={<PublicRoute />}>
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />

       {/* <Route
          path="/complete-profile"
          element={<CompleteProfilePage />}
        /> */}
      </Route>

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route element={<ProtectedRoute />}>
      
        <Route 
        path="/dashboard"
        element={<DashboardPage />}>
          <Route index={<HomePage />} element={<HomePage />}/>
          <Route path="business/:businessId" element={<BusinessPage/>} />
          <Route path="menus" element={<MenuPage />} />
          <Route path="businesses/:businessId/catalogues" element={<CataloguesPage />} />
          <Route path="businesses/:businessId/catalogues/:catalogueId" element={<CatalogueDetailPage />} />
          <Route path="businesses/:businessId/catalogues/:catalogueId/products" element={<ProductsPage />} />
          <Route path="businesses/:businessId/catalogues/:catalogueId/categories" element={<CategoriesPage />} />
          <Route path="businesses/:businessId/catalogues/:catalogueId/templates" element={<TemplatesPage />} />
          <Route path="businesses/:businessId/catalogues/:catalogueId/promotions" element={<PromotionsPage />} />
          <Route path="businesses/:businessId/catalogues/:catalogueId/qr" element={<PublicationPage />} />
          <Route path="businesses/:businessId/catalogues/:catalogueId/analytics" element={<AnalitycsPage />} />
          <Route path="qr" element={<QrPage />} />
          <Route path="analiticas" element={<MenuPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="configuracion" element={<Navigate to="/dashboard/settings" replace />} />
        </Route>
        
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
    </Suspense>
  );
}
