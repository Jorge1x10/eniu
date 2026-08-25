import { useNavigate } from "react-router";

import { useAuth } from "../../auth/hooks/useAuth";

export default function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <section className="w-full space-y-6">
      <h1 className="text-3xl font-bold text-[#111111]">Configuración</h1>

      <button
        className="flex items-center h-10 w-fit cursor-pointer rounded-xl border border-red-700 bg-red-600 px-2 "
        type="button"
        onClick={handleLogout}
      >
        Cerrar sesión
      </button>
    </section>
  );
}
