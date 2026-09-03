import {
  Navigate,
  Route,
  Routes,
} from "react-router";


import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/RegisterPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import DashboardPage from "../modules/Dashboard/pages/DashboardPage";
 //rutas dentro del dashboard
import MenuPage from "../modules/Dashboard/pages/MenuPage";
import ProductsPage from "../modules/Catalogue/pages/ProductsPage";
import CategoriesPage from "../modules/Catalogue/pages/CategoriesPage";
import QrPage from "../modules/Dashboard/pages/QrPage";
import SettingsPage from "../modules/Settings/pages/SettingsPage";
import ForgotPasswordPage from "../modules/Settings/pages/ForgotPasswordPage";
import ResetPasswordPage from "../modules/Settings/pages/ResetPasswordPage";
import AnalitycsPage from "../modules/Dashboard/pages/AnalitycsPage";
import HomePage from "../modules/Dashboard/pages/HomePage";
import BusinessPage from "../modules/Business/pages/BusinessPage";
import CataloguesPage from "../modules/Catalogue/pages/CataloguesPage";
import CatalogueDetailPage from "../modules/Catalogue/pages/CatalogueDetailPage";
import TemplatesPage from "../modules/Templates/pages/TemplatesPage";
import PromotionsPage from "../modules/Templates/pages/PromotionsPage";
import PublicMenuPage from "../modules/Publication/pages/PublicMenuPage";
import PublicationPage from "../modules/Publication/pages/PublicationPage";

export default function AppRoutes() {
  return (
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

      <Route path="/m/:publicSlug" element={<PublicMenuPage />} />

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
  );
}
