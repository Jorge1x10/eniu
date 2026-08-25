import DashboardNav from '../components/DashboardLayout'
import MotionDiv from '../hooks/MotionDiv';
import { BusinessProvider } from '../../Business/services/BusinessProvider';

export default function DashboardPage() {
  return (
    <BusinessProvider>
      <div className="fixed inset-0 flex overflow-hidden">
        <DashboardNav />
          <main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-6">
            <MotionDiv />
              
          </main>

      </div>
    </BusinessProvider>
  )
}
