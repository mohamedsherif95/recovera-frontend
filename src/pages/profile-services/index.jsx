import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Save,
  Stethoscope,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches } from '@/hooks/useBranches';
import {
  useBranchProfileSettings,
  useProfileServiceCatalog,
  useUpdateBranchProfileSetting,
} from '@/hooks/useProfileServices';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  BRANCH_SUBSCRIPTION_ACCESS_STATUS,
  CLINIC_PROFILES,
  PERMISSIONS,
} from '@/lib/constants';
import { resolveEffectiveBranchId, resolveEffectiveClinicId } from '@/lib/branchScope';
import { getClinicProfileLabel } from '@/lib/clinicProfiles';
import {
  getClinicProfileBadgeVariant,
  getClinicProfileIconTileClass,
  getClinicProfileSurfaceClass,
} from '@/lib/visualTokens';
import { cn } from '@/lib/utils';

const PROFILE_SETUP_NOTES = {
  [CLINIC_PROFILES.PHYSIOTHERAPY]: {
    icon: Activity,
    titleKey: 'profileServices.notes.physiotherapy.title',
    descriptionKey: 'profileServices.notes.physiotherapy.description',
    defaultTitle: 'Assessment, sessions, and packages',
    defaultDescription: 'Full release profile for physiotherapy day-to-day work.',
  },
  [CLINIC_PROFILES.MEDICAL_DOCTOR]: {
    icon: Stethoscope,
    titleKey: 'profileServices.notes.medicalDoctor.title',
    descriptionKey: 'profileServices.notes.medicalDoctor.description',
    defaultTitle: 'Consultations and follow-ups',
    defaultDescription: 'MVP profile focused on visit tracking and basic billing.',
  },
  [CLINIC_PROFILES.DENTIST]: {
    icon: ClipboardList,
    titleKey: 'profileServices.notes.dentist.title',
    descriptionKey: 'profileServices.notes.dentist.description',
    defaultTitle: 'Exams and procedures',
    defaultDescription: 'MVP profile focused on dental visits and procedure context.',
  },
  [CLINIC_PROFILES.LASER_DERMATOLOGY]: {
    icon: Zap,
    titleKey: 'profileServices.notes.laserDermatology.title',
    descriptionKey: 'profileServices.notes.laserDermatology.description',
    defaultTitle: 'Consultations and device visits',
    defaultDescription: 'MVP profile focused on laser sessions and treatment area context.',
  },
};

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getEnabledBranchProfiles(branch) {
  const profiles = branch?.subscription?.profiles;
  if (!Array.isArray(profiles)) return [];

  return profiles
    .filter((profile) => profile?.isEnabled !== false)
    .map((profile) =>
      typeof profile === 'string'
        ? profile
        : profile?.profile || profile?.profileCode || profile?.code || profile?.name,
    )
    .filter(Boolean);
}

function sortedCodes(codes) {
  return [...new Set((codes || []).map((code) => String(code).trim()).filter(Boolean))]
    .sort()
    .join('|');
}

function getPrimaryBranchId(branches, preferredBranchId) {
  if (preferredBranchId && branches.some((branch) => Number(branch.id) === Number(preferredBranchId))) {
    return Number(preferredBranchId);
  }

  return (
    branches.find((branch) => branch.isDefault)?.id ??
    branches.find((branch) => branch.isPrimary)?.id ??
    branches[0]?.id ??
    null
  );
}

function formatVisitType(value) {
  if (!value) return null;
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCatalogLabel(namespace, value, t) {
  if (!value) return null;
  const key = String(value).trim().replace(/[^A-Za-z0-9_]+/g, '_');
  if (!key) return null;

  return t(`profileServices.${namespace}.${key}`, {
    defaultValue: formatVisitType(value) || String(value),
  });
}

function getCatalogServiceName(service, t) {
  if (!service?.code) return service?.name || '--';

  return t(`profileServices.catalog.${service.code}.name`, {
    defaultValue: service.name || service.code,
  });
}

export default function ProfileServicesPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { can } = usePermissions();
  const { user } = useAuthStore();
  const { clinicOverrideId, branchOverrideId, platformAdminClinicId } = useUIStore();
  const isPlatformAdminRoute = location.pathname.startsWith('/platform-admin');
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const canViewBranches = can(PERMISSIONS['branches:view']);
  const canViewSettings = can(PERMISSIONS['profileServices:view']);
  const canManageSettings = can(PERMISSIONS['profileServices:manage']);
  const effectiveClinicId = isPlatformAdminRoute
    ? platformAdminClinicId
    : resolveEffectiveClinicId(user, clinicOverrideId);
  const preferredBranchId = isPlatformAdminRoute
    ? null
    : resolveEffectiveBranchId(user, branchOverrideId);
  const needsClinicSelection = Boolean(isPlatformAdminRoute && isPlatformAdmin && !effectiveClinicId);
  const branchListScopeOptions = isPlatformAdminRoute
    ? { platformClinicId: effectiveClinicId }
    : { clinicOverrideId };

  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [enabledServiceCodes, setEnabledServiceCodes] = useState([]);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [isProfileActive, setIsProfileActive] = useState(true);

  const branchesQuery = useBranches({
    enabled: Boolean(canViewBranches && !needsClinicSelection),
    ...branchListScopeOptions,
  });
  const branches = useMemo(
    () => normalizeRows(branchesQuery.data),
    [branchesQuery.data],
  );

  useEffect(() => {
    setSelectedBranchId((currentBranchId) => {
      if (!branches.length) return null;
      if (currentBranchId && branches.some((branch) => Number(branch.id) === Number(currentBranchId))) {
        return currentBranchId;
      }
      return getPrimaryBranchId(branches, preferredBranchId);
    });
  }, [branches, preferredBranchId]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => Number(branch.id) === Number(selectedBranchId)) || null,
    [branches, selectedBranchId],
  );
  const enabledProfiles = useMemo(
    () => getEnabledBranchProfiles(selectedBranch),
    [selectedBranch],
  );

  useEffect(() => {
    setSelectedProfile((currentProfile) => {
      if (currentProfile && enabledProfiles.includes(currentProfile)) {
        return currentProfile;
      }
      return enabledProfiles[0] || null;
    });
  }, [enabledProfiles]);

  const requestScopeOptions = useMemo(
    () => ({
      clinicOverrideId: effectiveClinicId ?? undefined,
      branchOverrideId: selectedBranchId ?? undefined,
    }),
    [effectiveClinicId, selectedBranchId],
  );

  const settingsQuery = useBranchProfileSettings(
    {},
    {
      enabled: Boolean(canViewSettings && selectedBranchId && !needsClinicSelection),
      ...requestScopeOptions,
    },
  );
  const catalogQuery = useProfileServiceCatalog(
    selectedProfile ? { profile: selectedProfile } : {},
    {
      enabled: Boolean(
        canViewSettings &&
          selectedBranchId &&
          selectedProfile &&
          !needsClinicSelection,
      ),
      ...requestScopeOptions,
    },
  );
  const updateSettings = useUpdateBranchProfileSetting();

  const settings = useMemo(
    () => normalizeRows(settingsQuery.data),
    [settingsQuery.data],
  );
  const activeSetting = useMemo(
    () => settings.find((setting) => setting.profile === selectedProfile) || null,
    [selectedProfile, settings],
  );
  const catalogItems = useMemo(
    () =>
      normalizeRows(catalogQuery.data).sort((a, b) =>
        [
          String(a.category || '').localeCompare(String(b.category || '')),
          String(a.name || '').localeCompare(String(b.name || '')),
        ].find((value) => value !== 0) ?? 0,
      ),
    [catalogQuery.data],
  );
  const selectedProfileNote =
    PROFILE_SETUP_NOTES[selectedProfile] ||
    PROFILE_SETUP_NOTES[CLINIC_PROFILES.PHYSIOTHERAPY];
  const ProfileNoteIcon = selectedProfileNote.icon;
  const selectedProfileNoteTitle = t(selectedProfileNote.titleKey, {
    defaultValue: selectedProfileNote.defaultTitle,
  });
  const selectedProfileNoteDescription = t(selectedProfileNote.descriptionKey, {
    defaultValue: selectedProfileNote.defaultDescription,
  });
  const isReadOnlyBranch =
    selectedBranch?.subscription?.accessStatus ===
    BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED;

  useEffect(() => {
    if (!activeSetting) {
      setEnabledServiceCodes([]);
      setDurationMinutes('');
      setIsProfileActive(true);
      return;
    }

    setEnabledServiceCodes(activeSetting.enabledServiceCodes || []);
    setDurationMinutes(
      activeSetting.defaultDurationMinutes == null
        ? ''
        : String(activeSetting.defaultDurationMinutes),
    );
    setIsProfileActive(activeSetting.isActive !== false);
  }, [activeSetting]);

  const initialCodes = sortedCodes(activeSetting?.enabledServiceCodes);
  const currentCodes = sortedCodes(enabledServiceCodes);
  const hasChanges =
    Boolean(activeSetting) &&
    (initialCodes !== currentCodes ||
      String(activeSetting?.defaultDurationMinutes ?? '') !== String(durationMinutes) ||
      Boolean(activeSetting?.isActive !== false) !== Boolean(isProfileActive));

  const enabledServiceCount = enabledServiceCodes.length;
  const disabledServiceCount = Math.max(catalogItems.length - enabledServiceCount, 0);

  const handleRefresh = () => {
    branchesQuery.refetch();
    settingsQuery.refetch();
    catalogQuery.refetch();
  };

  const handleServiceToggle = (code, checked) => {
    setEnabledServiceCodes((currentCodesList) => {
      const normalizedCode = String(code).trim();
      if (!normalizedCode) return currentCodesList;

      if (checked) {
        return [...new Set([...currentCodesList, normalizedCode])];
      }

      return currentCodesList.filter((currentCode) => currentCode !== normalizedCode);
    });
  };

  const resetDraft = () => {
    if (!activeSetting) return;
    setEnabledServiceCodes(activeSetting.enabledServiceCodes || []);
    setDurationMinutes(
      activeSetting.defaultDurationMinutes == null
        ? ''
        : String(activeSetting.defaultDurationMinutes),
    );
    setIsProfileActive(activeSetting.isActive !== false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedProfile || !activeSetting || !canManageSettings || isReadOnlyBranch) {
      return;
    }

    const trimmedDuration = String(durationMinutes || '').trim();
    const parsedDuration = trimmedDuration === '' ? null : Number(trimmedDuration);
    if (
      parsedDuration !== null &&
      (!Number.isInteger(parsedDuration) || parsedDuration < 1)
    ) {
      toast.error(
        t('profileServices.defaultDurationPositive', {
          defaultValue: 'Default duration must be a whole number greater than 0',
        }),
      );
      return;
    }

    await updateSettings.mutateAsync({
      profile: selectedProfile,
      data: {
        enabledServiceCodes,
        defaultDurationMinutes: parsedDuration,
        isActive: isProfileActive,
      },
      options: {
        ...requestScopeOptions,
        suppressPermissionToast: false,
      },
    });
  };

  const pageActions = (
    <Button
      type="button"
      variant="outline"
      onClick={handleRefresh}
      disabled={
        branchesQuery.isFetching ||
        settingsQuery.isFetching ||
        catalogQuery.isFetching
      }
    >
      <RefreshCcw className="h-4 w-4" />
      {t('common.refresh', { defaultValue: 'Refresh' })}
    </Button>
  );

  if (needsClinicSelection) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t('profileServices.title', { defaultValue: 'Visit services' })}
          description={t('profileServices.description', {
            defaultValue:
              'Set branch-level visit options for each enabled profile.',
          })}
        />
        <Card>
          <CardContent className="flex items-start gap-3 p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <h2 className="font-semibold">
                {t('platformAdmin.selectClinicFirst', {
                  defaultValue: 'Select a clinic first',
                })}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('profileServices.selectClinicFirstDescription', {
                  defaultValue:
                    'Clinic scope is required before branch setup can load.',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSave}>
      <PageHeader
        title={t('profileServices.title', { defaultValue: 'Visit services' })}
        description={t('profileServices.description', {
          defaultValue:
            'Set branch-level visit options for each enabled profile.',
        })}
        actions={pageActions}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('profileServices.branchContext', { defaultValue: 'Branch context' })}
            </CardTitle>
            <CardDescription>
              {t('profileServices.branchContextDescription', {
                defaultValue:
                  'Settings apply to the selected branch and its enabled profiles.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="profile-services-branch">
                {t('users.branch', { defaultValue: 'Branch' })}
              </Label>
              <Select
                value={selectedBranchId ? String(selectedBranchId) : 'none'}
                onValueChange={(value) => {
                  if (value !== 'none') setSelectedBranchId(Number(value));
                }}
                disabled={branchesQuery.isLoading || branches.length === 0}
              >
                <SelectTrigger id="profile-services-branch">
                  <SelectValue
                    placeholder={t('profileServices.selectBranch', {
                      defaultValue: 'Select branch',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    {t('profileServices.selectBranch', {
                      defaultValue: 'Select branch',
                    })}
                  </SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {t('profileServices.enabledProfiles', {
                  defaultValue: 'Enabled profiles',
                })}
              </Label>
              <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2">
                {enabledProfiles.length > 0 ? (
                  enabledProfiles.map((profile) => (
                    <Badge key={profile} variant="secondary">
                      {getClinicProfileLabel(profile, t)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('profileServices.noProfiles', {
                      defaultValue: 'No enabled profiles',
                    })}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('profileServices.status', { defaultValue: 'Status' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-2xl font-semibold">{enabledProfiles.length}</div>
              <div className="text-xs text-muted-foreground">
                {t('profileServices.profileCount', { defaultValue: 'Profiles' })}
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{enabledServiceCount}</div>
              <div className="text-xs text-muted-foreground">
                {t('profileServices.enabledServiceCount', {
                  defaultValue: 'Enabled',
                })}
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{disabledServiceCount}</div>
              <div className="text-xs text-muted-foreground">
                {t('profileServices.disabledServiceCount', {
                  defaultValue: 'Disabled',
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {branchesQuery.isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading', { defaultValue: 'Loading...' })}
          </CardContent>
        </Card>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t('profileServices.noBranches', {
              defaultValue: 'No branches are available in the current scope.',
            })}
          </CardContent>
        </Card>
      ) : enabledProfiles.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t('profileServices.noBranchProfiles', {
              defaultValue: 'This branch does not have enabled profiles yet.',
            })}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('profileServices.profiles', { defaultValue: 'Profiles' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {enabledProfiles.map((profile) => {
                const note = PROFILE_SETUP_NOTES[profile];
                const Icon = note?.icon || Activity;
                const active = profile === selectedProfile;
                const noteTitle = note?.titleKey
                  ? t(note.titleKey, { defaultValue: note.defaultTitle })
                  : profile;

                return (
                  <button
                    key={profile}
                    type="button"
                    onClick={() => setSelectedProfile(profile)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? cn(getClinicProfileSurfaceClass(profile), 'shadow-sm')
                        : 'bg-background hover:bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                        getClinicProfileIconTileClass(profile),
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {getClinicProfileLabel(profile, t)}
                        <Badge
                          variant={getClinicProfileBadgeVariant(profile)}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {active
                            ? t('profileServices.selected', { defaultValue: 'Selected' })
                            : t('profileServices.profile', { defaultValue: 'Profile' })}
                        </Badge>
                      </span>
                      <span
                        className={cn(
                          'mt-1 block text-xs',
                          'text-muted-foreground',
                        )}
                      >
                        {noteTitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between md:space-y-0">
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span>
                      {selectedProfile
                        ? getClinicProfileLabel(selectedProfile, t)
                        : t('profileServices.profile', { defaultValue: 'Profile' })}
                    </span>
                    {selectedProfile && (
                      <Badge variant={getClinicProfileBadgeVariant(selectedProfile)}>
                        {t('profileServices.profile', { defaultValue: 'Profile' })}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-start gap-2">
                    <ProfileNoteIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="font-medium text-foreground">
                        {selectedProfileNoteTitle}
                      </span>
                      <span className="block">{selectedProfileNoteDescription}</span>
                    </span>
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isReadOnlyBranch && (
                    <Badge variant="warning">
                      {t('branches.readOnly', { defaultValue: 'Read-only' })}
                    </Badge>
                  )}
                  {activeSetting?.isActive === false ? (
                    <Badge variant="neutral">
                      {t('common.inactive', { defaultValue: 'Inactive' })}
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      {t('common.active', { defaultValue: 'Active' })}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <Label htmlFor="profile-default-duration">
                    {t('profileServices.defaultDuration', {
                      defaultValue: 'Default duration',
                    })}
                  </Label>
                  <Input
                    id="profile-default-duration"
                    type="number"
                    min="1"
                    step="1"
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    disabled={!canManageSettings || isReadOnlyBranch}
                    placeholder="30"
                  />
                </div>

                <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                  <Checkbox
                    id="profile-active"
                    checked={isProfileActive}
                    onCheckedChange={(checked) => setIsProfileActive(checked === true)}
                    disabled={!canManageSettings || isReadOnlyBranch}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="profile-active" className="font-medium">
                      {t('profileServices.profileActive', {
                        defaultValue: 'Profile active in branch operations',
                      })}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('profileServices.profileActiveDescription', {
                        defaultValue:
                          'Turns this profile on or off for branch day-to-day work.',
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div>
                  <CardTitle className="text-base">
                    {t('profileServices.services', { defaultValue: 'Visit options' })}
                  </CardTitle>
                  <CardDescription>
                    {t('profileServices.servicesDescription', {
                      defaultValue:
                        'Available visit options for this profile in the selected branch.',
                    })}
                  </CardDescription>
                </div>
                {catalogQuery.isFetching && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                {settingsQuery.isLoading || catalogQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.loading', { defaultValue: 'Loading...' })}
                  </div>
                ) : catalogItems.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    {t('profileServices.noServices', {
                      defaultValue: 'No visit options are available for this profile.',
                    })}
                  </div>
                ) : (
                  <div className="divide-y rounded-md border">
                    {catalogItems.map((service) => {
                      const checked = enabledServiceCodes.includes(service.code);
                      const category = getCatalogLabel('categories', service.category, t);
                      const visitType = getCatalogLabel('visitTypes', service.visitType, t);
                      return (
                        <label
                          key={service.id || service.code}
                          className="grid cursor-pointer gap-3 p-3 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_120px_110px]"
                        >
                          <span className="flex min-w-0 items-start gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                handleServiceToggle(service.code, value === true)
                              }
                              disabled={!canManageSettings || isReadOnlyBranch}
                              className="mt-0.5"
                            />
                            <span className="min-w-0">
                              <span className="block break-words text-sm font-medium">
                                {getCatalogServiceName(service, t)}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-2">
                                {category && (
                                  <Badge variant="neutral" className="px-1.5 py-0 text-[10px]">
                                    {category}
                                  </Badge>
                                )}
                                {visitType && (
                                  <Badge
                                    variant={getClinicProfileBadgeVariant(selectedProfile)}
                                    className="px-1.5 py-0 text-[10px]"
                                  >
                                    {visitType}
                                  </Badge>
                                )}
                              </span>
                            </span>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {service.defaultDurationMinutes
                              ? t('profileServices.durationMinutesValue', {
                                  count: service.defaultDurationMinutes,
                                  defaultValue: '{{count}} min',
                                })
                              : '--'}
                          </span>
                          <span className="text-sm text-muted-foreground md:text-right">
                            {Number(service.defaultPrice || 0) > 0
                              ? service.defaultPrice
                              : '--'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetDraft}
                disabled={!hasChanges || updateSettings.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {t('common.reset', { defaultValue: 'Reset' })}
              </Button>
              <Button
                type="submit"
                disabled={
                  !hasChanges ||
                  !canManageSettings ||
                  isReadOnlyBranch ||
                  updateSettings.isPending
                }
              >
                {updateSettings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : hasChanges ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {updateSettings.isPending
                  ? t('common.saving', { defaultValue: 'Saving...' })
                  : t('common.saveChanges', { defaultValue: 'Save changes' })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
