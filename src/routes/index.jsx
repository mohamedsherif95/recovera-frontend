import { createBrowserRouter, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/layout/Header';
import { PERMISSIONS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';

// Auth pages
import Login from '@/pages/auth/Login';
import FirstLogin from '@/pages/auth/FirstLogin';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import LandingPage from '@/pages/LandingPage';

// Dashboard & feature pages
import Dashboard from '@/pages/Dashboard';
import DailyOperationsPage from '@/pages/daily-operations';
import PatientsPage from '@/pages/patients';
import PatientDetailsPage from '@/pages/patients/PatientDetails';
import SessionsPage from '@/pages/sessions';
import SessionDetailsPage from '@/pages/sessions/SessionDetails';
import PaymentsPage from '@/pages/payments';
import ReportsPage from '@/pages/reports';
import ActivityLogReportPage from '@/pages/reports/ActivityLog';
import IncomeReportPage from '@/pages/reports/PatientPayments';
import PatientBalancesReportPage from '@/pages/reports/PatientBalances';
import SystemLogsPage from '@/pages/reports/SystemLogs';
import UsersPage from '@/pages/users';
import ProfilePage from '@/pages/profile';
import DoctorsPage from '@/pages/doctors';
import ClinicsPage from '@/pages/clinics';
import BranchesPage from '@/pages/branches';
import BranchSubscriptionsPage from '@/pages/branch-subscriptions';
import PlatformBillingPage from '@/pages/platform-billing';
import InvoicesPage from '@/pages/invoices';

const UnauthorizedPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const homePath = isAuthenticated ? '/daily-operations' : '/';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-5xl font-bold text-destructive">403</h1>
          <p className="text-lg font-semibold">{t('errors.permissionDeniedTitle')}</p>
          <p className="text-muted-foreground">
            {t('errors.permissionDeniedDescription')}
          </p>
          <div className="pt-2 flex justify-center">
            <Link to={homePath}>
              <button className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                {t('errors.goBackHome')}
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

const HomePage = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/daily-operations" replace />;
  }

  return <LandingPage />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: (
      <AuthGuard>
        <Login />
      </AuthGuard>
    ),
  },
  {
    path: '/first-login',
    element: (
      <AuthGuard>
        <FirstLogin />
      </AuthGuard>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <AuthGuard>
        <ForgotPassword />
      </AuthGuard>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <AuthGuard>
        <ResetPassword />
      </AuthGuard>
    ),
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'daily-operations',
        element: (
          <ProtectedRoute
            anyPermissions={[
              PERMISSIONS['reports:viewDailyOperations'],
              PERMISSIONS['reports:view'],
            ]}
          >
            <DailyOperationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['reports:view']}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'patients',
        element: (
          <ProtectedRoute
            anyPermissions={[
              PERMISSIONS['patients:viewAll'],
              PERMISSIONS['patients:viewAssigned'],
            ]}
          >
            <PatientsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'patients/:id',
        element: (
          <ProtectedRoute
            anyPermissions={[
              PERMISSIONS['patients:viewAll'],
              PERMISSIONS['patients:viewAssigned'],
            ]}
          >
            <PatientDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'sessions',
        element: (
          <ProtectedRoute
            anyPermissions={[
              PERMISSIONS['sessions:viewAll'],
              PERMISSIONS['sessions:viewOwn'],
            ]}
          >
            <SessionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'sessions/:id',
        element: (
          <ProtectedRoute
            anyPermissions={[
              PERMISSIONS['sessions:viewAll'],
              PERMISSIONS['sessions:viewOwn'],
            ]}
          >
            <SessionDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'payments',
        element: (
          <ProtectedRoute
            anyPermissions={[
              PERMISSIONS['payments:viewAll'],
              PERMISSIONS['payments:viewReports'],
            ]}
          >
            <PaymentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'patient-payments',
        element: (
          <ProtectedRoute
            anyPermissions={[
              PERMISSIONS['payments:viewAll'],
              PERMISSIONS['payments:viewReports'],
            ]}
          >
            <IncomeReportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'patient-payments/balances',
        element: (
          <ProtectedRoute
            anyPermissions={[
              PERMISSIONS['payments:viewAll'],
              PERMISSIONS['payments:viewReports'],
            ]}
          >
            <PatientBalancesReportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['reports:view']}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/activity-log',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['reports:view']}>
            <ActivityLogReportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/system-logs',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['reports:view']}>
            <SystemLogsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'doctors',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['reports:view']}>
            <DoctorsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'clinics',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['clinics:viewAll']}>
            <ClinicsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['users:viewAll']}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'branches',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['branches:view']}>
            <BranchesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'branch-subscriptions',
        element: (
          <ProtectedRoute
            requiredPermission={PERMISSIONS['branchSubscriptions:view']}
          >
            <BranchSubscriptionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'platform-billing',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['platformBilling:view']}>
            <PlatformBillingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'invoices',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS['invoices:view']}>
            <InvoicesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
