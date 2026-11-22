import { useState } from 'react';
import { Menu } from 'lucide-react';

import DashboardNav from '../components/DashboardLayout'
import MotionDiv from '../hooks/MotionDiv';
import { BusinessProvider } from '../../Business/services/BusinessProvider';
import { useBusiness } from '../../Business/services/useBusiness';
import { LiveOrdersProvider } from '../../Ordering/context/LiveOrdersContext';
import mobileLogo from '../../../assets/Images/eniu-logo-dark.webp';
import { useTranslation } from "react-i18next";

export default function DashboardPage() {
  return (
    <BusinessProvider>
      <BusinessLiveOrders>
        <DashboardShell />
      </BusinessLiveOrders>
    </BusinessProvider>
  )
}

// Los pedidos en vivo se consultan una sola vez para todo el panel: el
// contador de la barra lateral, Inicio y Pedidos leen la misma consulta. La
// clave la reinicia al cambiar de negocio.
function BusinessLiveOrders({ children }) {
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id || null;
  return <LiveOrdersProvider key={businessId || "none"} businessId={businessId}>{children}</LiveOrdersProvider>;
}

function DashboardShell() {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-eniu-bg lg:flex-row">
      <header className="flex h-14 shrink-0 items-center justify-between bg-eniu-ink px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label={t("Abrir menú")}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-eniu-cream hover:bg-eniu-ink-soft"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <img src={mobileLogo} alt="ENIU" className="h-8" />
        <span className="w-11" aria-hidden="true" />
      </header>

      <DashboardNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6 lg:p-8">
        <MotionDiv />
      </main>
    </div>
  )
}
