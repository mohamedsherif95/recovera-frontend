import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  LayoutDashboard,
  Users,
  Calendar,
  ListChecks,
  DollarSign,
  BarChart3,
  UserCog,
  Activity,
  X,
  UserCheck,
  Receipt,
  FileText,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PERMISSIONS, USER_ROLES } from '@/lib/constants';

const navigationItems = [
  {
    name: 'nav.clinics',
    href: '/clinics',
    icon: Building2,
    permission: PERMISSIONS['clinics:viewAll'],
  },
  {
    name: 'nav.dailyOperations',
    href: '/daily-operations',
    icon: Activity,
    anyPermissions: [
      PERMISSIONS['reports:viewDailyOperations'],
      PERMISSIONS['reports:view'],
    ],
  },
  {
    name: 'nav.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS['reports:view'],
  },
  {
    name: 'nav.patients',
    href: '/patients',
    icon: Users,
    anyPermissions: [
      PERMISSIONS['patients:viewAll'],
      PERMISSIONS['patients:viewAssigned'],
    ],
  },
  {
    name: 'nav.sessions',
    href: '/sessions',
    icon: Calendar,
    anyPermissions: [
      PERMISSIONS['sessions:viewAll'],
      PERMISSIONS['sessions:viewOwn'],
    ],
  },
  // {
  //   name: 'nav.patientPayments',
  //   href: '/payments',
  //   icon: DollarSign,
  //   anyPermissions: [
  //     PERMISSIONS['payments:viewAll'],
  //     PERMISSIONS['payments:viewReports'],
  //   ],
  // },
  {
    name: 'nav.payments',
    href: '/patient-payments',
    icon: Receipt,
    anyPermissions: [
      PERMISSIONS['payments:viewAll'],
      PERMISSIONS['payments:viewReports'],
    ],
  },
  {
    name: 'nav.invoices',
    label: 'Invoices',
    href: '/invoices',
    icon: FileText,
    permission: PERMISSIONS['invoices:view'],
    hideForDoctorOnly: true,
  },
  {
    name: 'nav.doctors',
    href: '/doctors',
    icon: UserCheck,
    permission: PERMISSIONS['reports:view'],
  },
  {
    name: 'nav.branches',
    label: 'Branches',
    href: '/branches',
    icon: Building2,
    permission: PERMISSIONS['branches:view'],
    hideForRoles: [USER_ROLES.BRANCH_MANAGER],
  },
  {
    name: 'nav.branchSubscriptions',
    label: 'Branch subscriptions',
    href: '/branch-subscriptions',
    icon: Building2,
    permission: PERMISSIONS['branchSubscriptions:view'],
    hideForRoles: [USER_ROLES.BRANCH_MANAGER],
  },
  {
    name: 'nav.platformBilling',
    label: 'Platform billing',
    href: '/platform-billing',
    icon: Receipt,
    permission: PERMISSIONS['platformBilling:view'],
    hideForRoles: [USER_ROLES.BRANCH_MANAGER],
  },
  {
    name: 'nav.users',
    href: '/users',
    icon: UserCog,
    permission: PERMISSIONS['users:viewAll'],
  },
  {
    name: 'nav.reports',
    href: '/reports',
    icon: BarChart3,
    permission: PERMISSIONS['reports:view'],
  },
];

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { sidebarOpen, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { hasAnyRole, user } = useAuthStore();
  const { can, canAny } = usePermissions();
  const isDoctorOnly = useMemo(() => {
    const roles = user?.roles?.map((role) => role?.name?.toLowerCase()) || [];
    return roles.length > 0 && roles.every((role) => role === USER_ROLES.DOCTOR);
  }, [user]);

  const filteredNavigation = navigationItems.filter((item) => {
    if (item.hideForDoctorOnly && isDoctorOnly) {
      return false;
    }
    if (item.hideForRoles?.length && hasAnyRole(item.hideForRoles)) {
      return false;
    }
    if (item.anyPermissions) return canAny(item.anyPermissions);
    if (item.permission) return can(item.permission);
    return true;
  });

  const isActive = (href) => location.pathname.startsWith(href);
  const isRtl = i18n.language === 'ar';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed top-16 bottom-0 bg-card transition-all duration-300 z-40',
          isRtl ? 'right-0 border-l' : 'left-0 border-r',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center rounded-md text-sm font-medium transition-colors h-11',
                  sidebarOpen ? 'px-3 gap-3 justify-start' : 'px-0 gap-0 justify-center',
                  isRtl && sidebarOpen && 'flex-row-reverse',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
                title={!sidebarOpen ? t(item.name, { defaultValue: item.label || item.name }) : undefined}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-all duration-200',
                    sidebarOpen ? 'mx-0' : 'mx-auto'
                  )}
                />
                <span
                  className={cn(
                    'transition-all duration-200 whitespace-nowrap',
                    sidebarOpen
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
                  )}
                >
                  {t(item.name, { defaultValue: item.label || item.name })}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <aside className={cn(
            "fixed top-0 bottom-0 w-64 bg-card z-50 md:hidden",
            isRtl ? 'right-0 border-l' : 'left-0 border-r'
          )}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-primary">{t('app.name')}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    >
                      <Icon className="h-5 w-5" />
                    <span>{t(item.name, { defaultValue: item.label || item.name })}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
