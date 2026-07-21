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
  BarChart3,
  UserCog,
  Activity,
  X,
  UserCheck,
  Receipt,
  FileText,
  Building2,
  Wallet,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PERMISSIONS, USER_ROLES } from '@/lib/constants';

const navigationSections = [
  {
    key: 'operations',
    tone: 'operations',
    labelKey: 'nav.sections.operations',
    items: [
      {
        name: 'nav.dailyOperations',
        href: '/daily-operations',
        icon: Activity,
        mobilePrimary: true,
        mobilePriority: 1,
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
    ],
  },
  {
    key: 'clinical',
    tone: 'clinical',
    labelKey: 'nav.sections.clinical',
    items: [
      {
        name: 'nav.patients',
        href: '/patients',
        icon: Users,
        mobilePrimary: true,
        mobilePriority: 2,
        anyPermissions: [
          PERMISSIONS['patients:viewAll'],
          PERMISSIONS['patients:viewAssigned'],
        ],
      },
      {
        name: 'nav.sessions',
        href: '/sessions',
        icon: Calendar,
        mobilePrimary: true,
        mobilePriority: 3,
        anyPermissions: [
          PERMISSIONS['sessions:viewAll'],
          PERMISSIONS['sessions:viewOwn'],
        ],
      },
      {
        name: 'nav.doctors',
        href: '/doctors',
        icon: UserCheck,
        mobilePrimary: true,
        mobilePriority: 5,
        permission: PERMISSIONS['reports:view'],
      },
    ],
  },
  {
    key: 'financial',
    tone: 'financial',
    labelKey: 'nav.sections.financial',
    items: [
      {
        name: 'nav.payments',
        href: '/patient-payments',
        icon: Receipt,
        mobilePrimary: true,
        mobilePriority: 4,
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
        name: 'nav.branchExpenses',
        label: 'Expenses',
        href: '/branch-expenses',
        icon: Wallet,
        permission: PERMISSIONS['expenses:view'],
        hideForDoctorOnly: true,
      },
      {
        name: 'nav.payroll',
        label: 'Payroll',
        href: '/payroll',
        icon: WalletCards,
        permission: 'payroll:view',
        hideForDoctorOnly: true,
      },
    ],
  },
  {
    key: 'management',
    tone: 'management',
    labelKey: 'nav.sections.management',
    items: [
      {
        name: 'nav.branches',
        label: 'Branches',
        href: '/branches',
        icon: Building2,
        permission: PERMISSIONS['branches:view'],
        hideForRoles: [USER_ROLES.BRANCH_MANAGER],
      },
      {
        name: 'nav.users',
        href: '/users',
        icon: UserCog,
        permission: PERMISSIONS['users:viewAll'],
      },
    ],
  },
  {
    key: 'insights',
    tone: 'insights',
    labelKey: 'nav.sections.insights',
    items: [
      {
        name: 'nav.reports',
        href: '/reports',
        icon: BarChart3,
        permission: PERMISSIONS['reports:view'],
      },
    ],
  },
];

const sectionToneClasses = {
  operations: {
    active: 'bg-teal-600 text-white shadow-sm shadow-teal-900/10',
    hover: 'hover:bg-teal-50 hover:text-teal-800 dark:hover:bg-teal-950/30 dark:hover:text-teal-200',
    label: 'text-teal-700 dark:text-teal-300',
  },
  clinical: {
    active: 'bg-blue-600 text-white shadow-sm shadow-blue-900/10',
    hover: 'hover:bg-blue-50 hover:text-blue-800 dark:hover:bg-blue-950/30 dark:hover:text-blue-200',
    label: 'text-blue-700 dark:text-blue-300',
  },
  financial: {
    active: 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10',
    hover: 'hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-200',
    label: 'text-emerald-700 dark:text-emerald-300',
  },
  management: {
    active: 'bg-violet-600 text-white shadow-sm shadow-violet-900/10',
    hover: 'hover:bg-violet-50 hover:text-violet-800 dark:hover:bg-violet-950/30 dark:hover:text-violet-200',
    label: 'text-violet-700 dark:text-violet-300',
  },
  insights: {
    active: 'bg-amber-500 text-amber-950 shadow-sm shadow-amber-900/10',
    hover: 'hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-amber-950/30 dark:hover:text-amber-200',
    label: 'text-amber-700 dark:text-amber-300',
  },
};

const filterNavigationItem = ({ item, can, canAny, hasAnyRole, isDoctorOnly }) => {
  if (item.hideForDoctorOnly && isDoctorOnly) {
    return false;
  }
  if (item.hideForRoles?.length && hasAnyRole(item.hideForRoles)) {
    return false;
  }
  if (item.role && !hasAnyRole([item.role])) {
    return false;
  }
  if (item.anyPermissions) return canAny(item.anyPermissions);
  if (item.permission) return can(item.permission);
  return true;
};

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

  const filteredSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        filterNavigationItem({ item, can, canAny, hasAnyRole, isDoctorOnly }),
      ),
    }))
    .filter((section) => section.items.length > 0);

  const mobilePrimaryItems = filteredSections
    .flatMap((section) => section.items)
    .filter((item) => item.mobilePrimary)
    .sort((a, b) => (a.mobilePriority || 99) - (b.mobilePriority || 99))
    .slice(0, 4);

  const isActive = (href) =>
    (location.pathname === '/' && href === '/daily-operations') ||
    location.pathname === href ||
    location.pathname.startsWith(`${href}/`);
  const isRtl = i18n.language === 'ar';

  const renderDesktopLink = (section, item) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const label = t(item.name, { defaultValue: item.label || item.name });
    const tone = sectionToneClasses[section.tone] || sectionToneClasses.operations;

    return (
      <Link
        key={item.href}
        to={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-11 items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          sidebarOpen ? 'justify-start gap-3 px-3' : 'justify-center gap-0 px-0',
          isRtl && sidebarOpen && 'flex-row-reverse',
          active ? tone.active : cn('text-muted-foreground', tone.hover),
        )}
        title={!sidebarOpen ? label : undefined}
      >
        <Icon
          className={cn(
            'h-5 w-5 shrink-0 transition-all duration-200',
            sidebarOpen ? 'mx-0' : 'mx-auto',
          )}
        />
        <span
          className={cn(
            'min-w-0 truncate transition-all duration-200',
            sidebarOpen
              ? 'w-auto opacity-100'
              : 'w-0 -translate-x-2 overflow-hidden opacity-0',
          )}
        >
          {label}
        </span>
      </Link>
    );
  };

  const renderMobileLink = (section, item) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const label = t(item.name, { defaultValue: item.label || item.name });
    const tone = sectionToneClasses[section.tone] || sectionToneClasses.operations;

    return (
      <Link
        key={item.href}
        to={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active ? tone.active : cn('text-muted-foreground', tone.hover),
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed top-16 bottom-0 bg-card/95 backdrop-blur transition-all duration-300 z-40',
          isRtl ? 'right-0 border-l' : 'left-0 border-r',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
          {filteredSections.map((section, index) => (
            <div
              key={section.key}
              className={cn(index > 0 && 'border-t pt-2')}
            >
              {sidebarOpen && (
                <div
                  className={cn(
                    'px-3 pb-1 text-[11px] font-semibold uppercase',
                    sectionToneClasses[section.tone]?.label,
                  )}
                >
                  {t(section.labelKey)}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => renderDesktopLink(section, item))}
              </div>
            </div>
          ))}
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
            "fixed bottom-0 top-0 z-50 w-[min(22rem,88vw)] bg-card shadow-xl md:hidden",
            isRtl ? 'right-0 border-l' : 'left-0 border-r'
          )}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-primary">{t('app.name')}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('nav.mobileMenu', { defaultValue: 'Workspace menu' })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.close')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="flex-1 space-y-5 overflow-y-auto p-4 pb-24">
              {filteredSections.map((section) => (
                <div key={section.key} className="space-y-2">
                  <div className="px-3 text-[11px] font-semibold uppercase text-muted-foreground">
                    {t(section.labelKey)}
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => renderMobileLink(section, item))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}

      {!mobileMenuOpen && mobilePrimaryItems.length > 0 && (
        <nav
          aria-label={t('nav.mobilePrimary', { defaultValue: 'Primary navigation' })}
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        >
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${mobilePrimaryItems.length}, minmax(0, 1fr))`,
            }}
          >
            {mobilePrimaryItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const label = t(item.name, { defaultValue: item.label || item.name });
              const section = filteredSections.find((candidate) =>
                candidate.items.some((sectionItem) => sectionItem.href === item.href),
              );
              const tone = sectionToneClasses[section?.tone] || sectionToneClasses.operations;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? tone.active : cn('text-muted-foreground', tone.hover),
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
