import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AppFooter } from './AppFooter';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { sidebarOpen } = useUIStore();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isRtl = i18n.language === 'ar';
  const isSuspendedClinic =
    user?.clinicStatus === 'suspended' &&
    !user?.isSuperAdmin &&
    !user?.roles?.some((role) => role?.name === 'super_admin');

  useEffect(() => {
    const appName = t('app.name');

    const pathname = location.pathname || '/';

    let pageKey = 'nav.dashboard';

    if (pathname === '/' || pathname.startsWith('/daily-operations')) {
      pageKey = 'nav.dailyOperations';
    } else if (pathname === '/dashboard') {
      pageKey = 'nav.dashboard';
    } else if (pathname === '/patients') {
      pageKey = 'nav.patients';
    } else if (pathname.startsWith('/patients/')) {
      pageKey = 'patients.patientDetails';
    } else if (pathname === '/sessions') {
      pageKey = 'nav.sessions';
    } else if (pathname.startsWith('/sessions/')) {
      pageKey = 'sessions.sessionDetails';
    } else if (pathname === '/payments') {
      pageKey = 'nav.patientPayments';
    } else if (pathname.startsWith('/patient-payments')) {
      pageKey = 'nav.payments';
    } else if (pathname === '/reports') {
      pageKey = 'nav.reports';
    } else if (pathname === '/clinics') {
      pageKey = 'nav.clinics';
    } else if (pathname === '/users') {
      pageKey = 'nav.users';
    } else if (pathname === '/profile') {
      pageKey = 'nav.profile';
    }

    const pageName = t(pageKey);
    document.title = `${appName} | ${pageName}`;
  }, [location.pathname, t]);

  useEffect(() => {
    const handleBackspace = (e) => {
      if (e.key === 'Backspace') {
        const target = e.target;
        const isInput =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]');

        if (!isInput) {
          e.preventDefault();
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleBackspace);
    return () => window.removeEventListener('keydown', handleBackspace);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Sidebar />

      <main
        className={cn(
          'flex-1 transition-all duration-300 pt-4 px-2 md:px-4',
          isRtl
            ? (sidebarOpen ? 'md:mr-64' : 'md:mr-16')
            : (sidebarOpen ? 'md:ml-64' : 'md:ml-16')
        )}
      >
        {isSuspendedClinic && (
          <div className="mb-4 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
            This clinic is currently suspended. Data is preserved, but operational access is paused.
          </div>
        )}
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
