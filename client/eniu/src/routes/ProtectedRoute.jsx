import { Navigate, Outlet } from "react-router";

import { useAuth } from "../modules/auth/hooks/useAuth";
import { useTranslation } from "react-i18next";

export default function ProtectedRoute() {
  const { t } = useTranslation();

  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
       {t("Verificando sesión...")}
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}