import { useState } from 'react';
import { Menu } from 'lucide-react';

import DashboardNav from '../components/DashboardLayout'
import MotionDiv from '../hooks/MotionDiv';
import { BusinessProvider } from '../../Business/services/BusinessProvider';
import mobileLogo from '../../../assets/Images/eniu-DarkBannerNoBack.svg';

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <BusinessProvider>
      <div className="fixed inset-0 flex flex-col overflow-hidden lg:flex-row">
        <header className="flex h-14 shrink-0 items-center justify-between bg-[#111111] px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menú"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#FFFDF5] hover:bg-[#2A2A2A]"
          >
            <Menu size={22} />
          </button>
          <img src={mobileLogo} alt="ENIU" className="h-8" />
          <span className="w-10" aria-hidden="true" />
        </header>

        <DashboardNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
          <MotionDiv />
        </main>
      </div>
    </BusinessProvider>
  )
}
