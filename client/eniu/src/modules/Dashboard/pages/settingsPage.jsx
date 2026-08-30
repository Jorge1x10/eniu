import { useNavigate } from "react-router";

import { useAuth } from "../../auth/hooks/useAuth";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();

  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <section className="w-full space-y-6">
      <h1 className="text-3xl font-bold text-[#111111]">{t("Configuración")}</h1>

      <button
        className="flex items-center h-10 w-fit cursor-pointer rounded-xl border border-red-700 bg-red-600 px-2 "
        type="button"
        onClick={handleLogout}
      >
        {t("Cerrar sesión")}
      </button>
    </section>
  );
}
