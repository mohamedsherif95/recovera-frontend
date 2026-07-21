import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useBranches } from '@/hooks/useBranches';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClinics } from '@/hooks/useClinics';
import { usePermissions } from '@/hooks/usePermissions';
import { useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, User, LogOut, Settings, ShieldCheck, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PERMISSIONS } from '@/lib/constants';
import {
  canSwitchAssignedBranches,
  canOverrideBranchScope,
  canOverrideClinicScope,
  getAssignedBranches,
  resolveEffectiveBranchId,
  resolveEffectiveClinicId,
} from '@/lib/branchScope';

export function Header() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    toggleSidebar,
    toggleMobileMenu,
    clinicOverrideId,
    branchOverrideId,
    setClinicOverrideId,
    setBranchOverrideId,
    clearBranchOverride,
  } = useUIStore();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const isPlatformAdmin = canOverrideClinicScope(user);
  const canOverrideBranch = canOverrideBranchScope(user);
  const canViewClinics = can(PERMISSIONS['clinics:viewAll']);
  const canViewBranches = can(PERMISSIONS['branches:view']);
  const canSwitchAssigned = canSwitchAssignedBranches(user);
  const assignedBranches = getAssignedBranches(user);
  const { data: clinicsData } = useClinics(Boolean(isPlatformAdmin && canViewClinics));
  const clinics = Array.isArray(clinicsData)
    ? clinicsData
    : Array.isArray(clinicsData?.data)
      ? clinicsData.data
      : [];
  const effectiveClinicId = resolveEffectiveClinicId(user, clinicOverrideId);
  const canLoadOverrideBranches = Boolean(
    canOverrideBranch && canViewBranches && effectiveClinicId,
  );
  const { data: branchesData } = useBranches({
    enabled: canLoadOverrideBranches,
    suppressPermissionToast: true,
  });
  const fetchedBranches = Array.isArray(branchesData)
    ? branchesData
    : Array.isArray(branchesData?.data)
      ? branchesData.data
      : [];
  const branches =
    canOverrideBranch && canViewBranches ? fetchedBranches : assignedBranches;
  const fallbackDefaultBranch = branches.find((branch) => branch.isDefault) || branches[0] || null;
  const effectiveBranchId =
    resolveEffectiveBranchId(user, branchOverrideId) ?? fallbackDefaultBranch?.id ?? null;
  const selectedBranch = branches.find(
    (branch) => Number(branch.id) === Number(effectiveBranchId),
  );
  const fixedBranchName =
    selectedBranch?.name ||
    user?.branch?.name ||
    null;

  useEffect(() => {
    if (!branchOverrideId || branches.length === 0) return;

    const overrideIsValid = branches.some(
      (branch) => Number(branch.id) === Number(branchOverrideId),
    );
    if (overrideIsValid) return;

    clearBranchOverride();
    queryClient.invalidateQueries();
  }, [branchOverrideId, branches, clearBranchOverride, queryClient]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center px-4 w-full">
        <div className="flex items-center gap-2">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t('nav.mobileMenu', { defaultValue: 'Workspace menu' })}
            onClick={toggleMobileMenu}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            aria-label={t('nav.toggleSidebar', { defaultValue: 'Toggle sidebar' })}
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/daily-operations" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-lg font-black text-primary-foreground shadow-sm shadow-teal-200/60 dark:shadow-none">
              R
            </span>
            <div className="hidden sm:block leading-tight">
              <h1 className="text-xl font-black tracking-tight text-foreground">{t('app.name')}</h1>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {t('app.workspaceSubtitle', { defaultValue: 'Clinic service' })}
              </p>
            </div>
          </Link>
        </div>

        {/* Push items to the far right */}
        <div className="flex items-center gap-2 ms-auto">
          {isPlatformAdmin && canViewClinics && (
            <Select
              value={clinicOverrideId ? String(clinicOverrideId) : 'none'}
              onValueChange={(value) => {
                setClinicOverrideId(value === 'none' ? null : Number(value));
                clearBranchOverride();
                queryClient.invalidateQueries();
              }}
            >
              <SelectTrigger className="hidden h-9 w-[220px] md:flex">
                <SelectValue placeholder={t('clinics.selectOverride')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('clinics.noOverride')}</SelectItem>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={String(clinic.id)}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {((canOverrideBranch && canViewBranches) || canSwitchAssigned) &&
            effectiveClinicId &&
            branches.length > 0 && (
            <Select
              value={effectiveBranchId ? String(effectiveBranchId) : 'auto'}
              onValueChange={(value) => {
                setBranchOverrideId(value === 'auto' ? null : Number(value));
                queryClient.invalidateQueries();
              }}
            >
              <SelectTrigger className="hidden h-9 w-[220px] lg:flex">
                <SelectValue
                  placeholder={t('users.branch', { defaultValue: 'Branch' })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  {canOverrideBranch
                    ? t('branches.autoBranch', { defaultValue: 'Default branch' })
                    : t('branches.primaryBranch', { defaultValue: 'Primary branch' })}
                </SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!canOverrideBranch && fixedBranchName && (
            <Badge variant="neutral" className="hidden gap-1.5 lg:inline-flex">
              <Building2 className="h-3.5 w-3.5" />
              {t('users.branch', { defaultValue: 'Branch' })}: {fixedBranchName}
            </Badge>
          )}
          {isPlatformAdmin && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
            >
              <Link to="/platform-admin">
                <ShieldCheck className="h-4 w-4" />
                {t('nav.platformAdmin')}
              </Link>
            </Button>
          )}
          <LanguageSwitcher />
          <ThemeSwitcher />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('nav.profile')}
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {user?.roles && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {user.roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="info"
                          className="px-2 py-0 text-[11px]"
                        >
                          {t(`users.${role.name}`, { defaultValue: role.name })}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isPlatformAdmin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/platform-admin" className="cursor-pointer">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {t('nav.platformAdmin')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('nav.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="hidden sm:block text-sm font-medium">{user?.fullName}</p>
        </div>
      </div>
    </header>
  );
}
