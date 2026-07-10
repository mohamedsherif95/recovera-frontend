import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppFooter } from './AppFooter';
import { useAuth } from '@/hooks/useAuth';
import { useClinics } from '@/hooks/useClinics';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { PERMISSIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const platformNavigation = [
  {
    name: 'platformAdmin.overview',
    label: 'Overview',
    href: '/platform-admin',
    icon: LayoutDashboard,
    end: true,
    anyPermissions: [
      PERMISSIONS['clinics:viewAll'],
      PERMISSIONS['branches:view'],
      PERMISSIONS['branchSubscriptions:view'],
      PERMISSIONS['platformBilling:view'],
    ],
  },
  {
    name: 'nav.clinics',
    label: 'Clinics',
    href: '/platform-admin/clinics',
    icon: Building2,
    permission: PERMISSIONS['clinics:viewAll'],
  },
  {
    name: 'nav.branches',
    label: 'Branches',
    href: '/platform-admin/branches',
    icon: Building2,
    permission: PERMISSIONS['branches:view'],
  },
  {
    name: 'nav.branchSubscriptions',
    label: 'Branch subscriptions',
    href: '/platform-admin/branch-subscriptions',
    icon: CreditCard,
    permission: PERMISSIONS['branchSubscriptions:view'],
  },
  {
    name: 'nav.platformBilling',
    label: 'Platform billing',
    href: '/platform-admin/billing',
    icon: Receipt,
    permission: PERMISSIONS['platformBilling:view'],
  },
];

export function PlatformAdminLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { can, canAny } = usePermissions();
  const {
    clinicOverrideId,
    setClinicOverrideId,
    clearBranchOverride,
  } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRtl = i18n.language === 'ar';
  const canSelectClinic = can(PERMISSIONS['clinics:viewAll']);
  const { data: clinicsData } = useClinics(Boolean(canSelectClinic));
  const clinics = Array.isArray(clinicsData)
    ? clinicsData
    : Array.isArray(clinicsData?.data)
      ? clinicsData.data
      : [];

  const visibleNavigation = useMemo(
    () =>
      platformNavigation.filter((item) => {
        if (item.anyPermissions) return canAny(item.anyPermissions);
        if (item.permission) return can(item.permission);
        return true;
      }),
    [can, canAny],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${t('app.name')} | ${t('platformAdmin.title', {
      defaultValue: 'Platform Admin',
    })}`;
  }, [t, location.pathname]);

  const handleClinicChange = (value) => {
    setClinicOverrideId(value === 'none' ? null : Number(value));
    clearBranchOverride();
    queryClient.invalidateQueries();
  };

  const navigation = (
    <nav className="space-y-1">
      {visibleNavigation.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                isRtl && 'flex-row-reverse',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t(item.name, { defaultValue: item.label })}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="platform-admin-theme min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex h-16 items-center gap-3 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/platform-admin" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-semibold tracking-normal text-foreground">
                {t('platformAdmin.title', { defaultValue: 'Platform Admin' })}
              </h1>
              <p className="hidden text-xs font-medium text-muted-foreground sm:block">
                {t('platformAdmin.subtitle', {
                  defaultValue: 'Recovera operations console',
                })}
              </p>
            </div>
          </Link>

          <div className="ms-auto flex items-center gap-2">
            {canSelectClinic && (
              <Select
                value={clinicOverrideId ? String(clinicOverrideId) : 'none'}
                onValueChange={handleClinicChange}
              >
                <SelectTrigger className="hidden h-9 w-[240px] md:flex">
                  <SelectValue
                    placeholder={t('platformAdmin.adminScope', {
                      defaultValue: 'Admin scope',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t('platformAdmin.allClinics', { defaultValue: 'All clinics' })}
                  </SelectItem>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={String(clinic.id)}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/daily-operations">
                <Home className="mr-2 h-4 w-4" />
                {t('platformAdmin.workspace', { defaultValue: 'Clinic workspace' })}
              </Link>
            </Button>
            <LanguageSwitcher />
            <ThemeSwitcher />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('nav.profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="sm:hidden">
                  <Link to="/daily-operations" className="cursor-pointer">
                    <Home className="mr-2 h-4 w-4" />
                    {t('platformAdmin.workspace', {
                      defaultValue: 'Clinic workspace',
                    })}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          'fixed top-16 bottom-0 hidden w-72 border-border/80 bg-card/95 p-3 lg:block',
          isRtl ? 'right-0 border-l' : 'left-0 border-r',
        )}
      >
        <div className="mb-4 rounded-md border bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
          {t('platformAdmin.scopeHint', {
            defaultValue:
              'Platform work is isolated here. Workspace override remains for support and incident handling.',
          })}
        </div>
        {navigation}
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className={cn(
              'fixed top-0 bottom-0 z-50 w-72 border-border bg-card p-4 lg:hidden',
              isRtl ? 'right-0 border-l' : 'left-0 border-r',
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {t('platformAdmin.title', { defaultValue: 'Platform Admin' })}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {canSelectClinic && (
              <Select
                value={clinicOverrideId ? String(clinicOverrideId) : 'none'}
                onValueChange={handleClinicChange}
              >
                <SelectTrigger className="mb-4 h-9 w-full">
                  <SelectValue
                    placeholder={t('platformAdmin.adminScope', {
                      defaultValue: 'Admin scope',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t('platformAdmin.allClinics', { defaultValue: 'All clinics' })}
                  </SelectItem>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={String(clinic.id)}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {navigation}
          </aside>
        </>
      )}

      <main
        className={cn(
          'min-h-[calc(100vh-4rem)] px-3 py-4 transition-all duration-300 md:px-6',
          isRtl ? 'lg:mr-72' : 'lg:ml-72',
        )}
      >
        <Outlet />
      </main>

      <div className={cn(isRtl ? 'lg:mr-72' : 'lg:ml-72')}>
        <AppFooter />
      </div>
    </div>
  );
}
