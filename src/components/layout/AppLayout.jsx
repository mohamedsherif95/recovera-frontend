import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AppFooter } from './AppFooter';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useBranches } from '@/hooks/useBranches';
import {
  canOverrideBranchScope,
  resolveEffectiveBranchId,
  resolveEffectiveClinicId,
} from '@/lib/branchScope';
import { BRANCH_SUBSCRIPTION_ACCESS_STATUS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { sidebarOpen, clinicOverrideId, branchOverrideId } = useUIStore();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isRtl = i18n.language === 'ar';
  const canOverrideBranch = canOverrideBranchScope(user);
  const effectiveClinicId = resolveEffectiveClinicId(user, clinicOverrideId);
  const effectiveBranchId = resolveEffectiveBranchId(user, branchOverrideId);
  const { data: branchesData } = useBranches({
    enabled: Boolean(
      user &&
        (canOverrideBranch ? effectiveClinicId : effectiveBranchId),
    ),
  });
  const hasScopedBranchData = Boolean(
    canOverrideBranch ? effectiveClinicId : effectiveBranchId,
  );
  const branches = hasScopedBranchData
    ? Array.isArray(branchesData)
      ? branchesData
      : Array.isArray(branchesData?.data)
        ? branchesData.data
        : []
    : [];
  const currentBranch =
    canOverrideBranch && !effectiveClinicId
      ? null
      : branches.find((branch) => Number(branch.id) === Number(effectiveBranchId)) ||
        branches.find((branch) => branch.isDefault) ||
        (!canOverrideBranch ? user?.branch : null) ||
        null;
  const branchAccessStatus =
    currentBranch?.subscription?.accessStatus ||
    currentBranch?.accessStatus ||
    null;
  const isReadOnlyBranch =
    branchAccessStatus === BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED;

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
    } else if (pathname === '/branch-subscriptions') {
      pageKey = 'nav.branchSubscriptions';
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
        {isReadOnlyBranch && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            This branch is currently in read-only mode. You can view existing records, but changes are disabled. Please contact your administrator.
          </div>
        )}
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
