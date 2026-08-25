import { Navigate } from "react-router";

import { useBusiness } from "../../Business/services/useBusiness";

export default function MenuPage() {
  const { selectedBusiness, isLoadingBusinesses } = useBusiness();

  if (isLoadingBusinesses) {
    return (
      <div className="rounded-2xl bg-white p-6 text-[#666666] shadow-sm">
        Cargando negocio...
      </div>
    );
  }

  if (!selectedBusiness) return <Navigate to="/dashboard" replace />;

  return (
    <Navigate
      to={`/dashboard/businesses/${selectedBusiness.id}/catalogues`}
      replace
    />
  );
}
