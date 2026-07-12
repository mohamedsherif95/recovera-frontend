import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  KeyRound,
  Loader2,
  UserRound,
  Workflow,
} from 'lucide-react';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { accessApi } from '@/api/endpoints/access';
import { branchSubscriptionsApi } from '@/api/endpoints/branchSubscriptions';
import { branchesApi } from '@/api/endpoints/branches';
import { clinicsApi } from '@/api/endpoints/clinics';
import { usersApi } from '@/api/endpoints/users';
import {
  BRANCH_PRICING_MODELS,
  BRANCH_SUBSCRIPTION_ACCESS_STATUS,
  CLINIC_PROFILES,
  QUERY_KEYS,
  USER_ROLES,
} from '@/lib/constants';
import {
  CLINIC_PROFILE_OPTIONS,
  getClinicProfileLabel,
} from '@/lib/clinicProfiles';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const PRICING_MODEL_OPTIONS = [
  {
    value: BRANCH_PRICING_MODELS.FLEXIBLE_USAGE,
    labelKey: 'branchSubscriptions.pricingModels.flexibleUsage.label',
    labelDefault: 'Flexible branch plan',
    helperKey: 'branchSubscriptions.pricingModels.flexibleUsage.shortLabel',
    helperDefault: 'Base + allowance + overage',
  },
  {
    value: BRANCH_PRICING_MODELS.CAPACITY_PACKAGE,
    labelKey: 'branchSubscriptions.pricingModels.capacityPackage.label',
    labelDefault: 'Capacity branch package',
    helperKey: 'branchSubscriptions.pricingModels.capacityPackage.shortLabel',
    helperDefault: 'Tiered package',
  },
];

const ACCESS_OPTIONS = [
  {
    value: BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE,
    labelKey: 'branchSubscriptions.accessStatuses.active',
    labelDefault: 'Active',
  },
  {
    value: BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED,
    labelKey: 'branchSubscriptions.accessStatuses.readOnly',
    labelDefault: 'Read-only',
  },
];

const initialForm = {
  companyName: '',
  slug: '',
  billingNotes: '',
  branchName: '',
  managerFullName: '',
  managerUsername: '',
  managerEmail: '',
  managerPassword: '',
  enabledProfiles: [CLINIC_PROFILES.PHYSIOTHERAPY],
  accessStatus: BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE,
  accessNotes: '',
  pricingModel: BRANCH_PRICING_MODELS.FLEXIBLE_USAGE,
  baseMonthlyFee: '',
  packageName: '',
  includedMonthlyVisits: '',
  overageBlockSize: '',
  overageBlockFee: '',
};

const stepIds = ['clinic', 'branch', 'manager', 'subscription'];

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatNextMonth = () =>
  new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toISOString()
    .slice(0, 7);

const getOptionLabel = (option, t) =>
  option ? t(option.labelKey, { defaultValue: option.labelDefault }) : null;

const getProfileLabel = (profile, t) =>
  getClinicProfileLabel(profile, t) || profile;

const getPricingModelLabel = (model, t) =>
  getOptionLabel(
    PRICING_MODEL_OPTIONS.find((option) => option.value === model),
    t,
  ) || model;

const getAccessLabel = (status, t) =>
  getOptionLabel(
    ACCESS_OPTIONS.find((option) => option.value === status),
    t,
  ) || status;

const getResponseEntity = (response) => response?.data || response;

function StatusPill({ state, t }) {
  if (state === 'done') {
    return (
      <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {t('platformOnboarding.status.done', { defaultValue: 'Done' })}
      </Badge>
    );
  }

  if (state === 'running') {
    return (
      <Badge variant="outline">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        {t('platformOnboarding.status.running', { defaultValue: 'Running' })}
      </Badge>
    );
  }

  if (state === 'error') {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="mr-1 h-3 w-3" />
        {t('platformOnboarding.status.error', { defaultValue: 'Error' })}
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      {t('platformOnboarding.status.pending', { defaultValue: 'Pending' })}
    </Badge>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

export default function PlatformOnboardingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { setPlatformAdminClinicId } = useUIStore();
  const [form, setForm] = useState(initialForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [stepState, setStepState] = useState({});
  const [result, setResult] = useState(null);

  const rolesQuery = useQuery({
    queryKey: ['access', 'roles-permissions'],
    queryFn: accessApi.getRolesPermissions,
    staleTime: 5 * 60 * 1000,
  });

  const managerRole = useMemo(() => {
    const roles = Array.isArray(rolesQuery.data) ? rolesQuery.data : [];
    return roles.find((role) => role.name === USER_ROLES.MANAGER) || null;
  }, [rolesQuery.data]);

  const isFlexible =
    form.pricingModel === BRANCH_PRICING_MODELS.FLEXIBLE_USAGE;
  const isPackage =
    form.pricingModel === BRANCH_PRICING_MODELS.CAPACITY_PACKAGE;

  const readiness = useMemo(() => {
    const checks = [
      {
        id: 'company',
        ok: form.companyName.trim().length >= 2 && form.slug.trim().length >= 2,
        label: t('platformOnboarding.readiness.company', {
          defaultValue: 'Company name and slug',
        }),
      },
      {
        id: 'branch',
        ok: form.branchName.trim().length >= 2,
        label: t('platformOnboarding.readiness.branch', {
          defaultValue: 'Subscribed branch name',
        }),
      },
      {
        id: 'manager',
        ok:
          form.managerFullName.trim().length >= 2 &&
          form.managerUsername.trim().length >= 3 &&
          form.managerEmail.includes('@') &&
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.managerPassword),
        label: t('platformOnboarding.readiness.manager', {
          defaultValue: 'Manager identity and temporary password',
        }),
      },
      {
        id: 'profiles',
        ok: form.enabledProfiles.length > 0,
        label: t('platformOnboarding.readiness.profiles', {
          defaultValue: 'At least one enabled profile',
        }),
      },
      {
        id: 'pricing',
        ok:
          toInteger(form.baseMonthlyFee) >= 0 &&
          (!isFlexible ||
            (toInteger(form.overageBlockSize) > 0 &&
              toInteger(form.overageBlockFee) > 0)) &&
          (!isPackage ||
            (form.packageName.trim().length > 0 &&
              toInteger(form.includedMonthlyVisits) > 0 &&
              ((form.overageBlockSize === '' && form.overageBlockFee === '') ||
                (toInteger(form.overageBlockSize) > 0 &&
                  toInteger(form.overageBlockFee) > 0)))),
        label: t('platformOnboarding.readiness.pricing', {
          defaultValue: 'Complete pricing model',
        }),
      },
      {
        id: 'roles',
        ok: Boolean(managerRole),
        label: t('platformOnboarding.readiness.roles', {
          defaultValue: 'Manager role metadata loaded',
        }),
      },
    ];

    return checks;
  }, [form, isFlexible, isPackage, managerRole, t]);

  const canSubmit = readiness.every((check) => check.ok);

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      setResult(null);
      setStepState({});

      setStepState((current) => ({ ...current, clinic: 'running' }));
      const clinic = getResponseEntity(
        await clinicsApi.create({
          name: form.companyName.trim(),
          slug: slugify(form.slug),
          status: 'active',
          billingNotes: form.billingNotes.trim() || null,
        }),
      );
      setStepState((current) => ({ ...current, clinic: 'done' }));
      setPlatformAdminClinicId(clinic.id);

      setStepState((current) => ({ ...current, branch: 'running' }));
      const branchesResponse = await branchesApi.getAll({
        platformClinicId: clinic.id,
      });
      const branches = Array.isArray(branchesResponse)
        ? branchesResponse
        : Array.isArray(branchesResponse?.data)
          ? branchesResponse.data
          : [];
      const defaultBranch = branches.find((branch) => branch.isDefault) || branches[0];
      if (!defaultBranch) {
        throw new Error(
          t('platformOnboarding.errors.defaultBranchMissing', {
            defaultValue: 'The default branch was not created for this company.',
          }),
        );
      }
      const branch = getResponseEntity(
        await branchesApi.update(
          defaultBranch.id,
          {
            name: form.branchName.trim(),
            isActive: true,
          },
          { platformClinicId: clinic.id },
        ),
      );
      setStepState((current) => ({ ...current, branch: 'done' }));

      setStepState((current) => ({ ...current, manager: 'running' }));
      const user = getResponseEntity(
        await usersApi.create(
          {
            clinicId: clinic.id,
            fullName: form.managerFullName.trim(),
            username: form.managerUsername.trim(),
            email: form.managerEmail.trim(),
            password: form.managerPassword,
            isActive: true,
            roleIds: [managerRole.id],
            branchIds: [branch.id],
            primaryBranchId: branch.id,
          },
          { platformClinicId: clinic.id },
        ),
      );
      setStepState((current) => ({ ...current, manager: 'done' }));

      setStepState((current) => ({ ...current, subscription: 'running' }));
      const subscription = await branchSubscriptionsApi.updateByBranch(
        branch.id,
        {
          accessStatus: form.accessStatus,
          accessNotes: form.accessNotes.trim() || null,
          enabledProfiles: form.enabledProfiles,
          pricingModel: form.pricingModel,
          baseMonthlyFee: toInteger(form.baseMonthlyFee),
          packageName: isPackage ? form.packageName.trim() : null,
          includedMonthlyVisits: toInteger(form.includedMonthlyVisits),
          overageBlockSize:
            form.overageBlockSize === ''
              ? null
              : Math.max(1, toInteger(form.overageBlockSize)),
          overageBlockFee: toInteger(form.overageBlockFee),
        },
        { platformClinicId: clinic.id },
      );
      setStepState((current) => ({ ...current, subscription: 'done' }));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLINICS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BRANCHES] }),
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.BRANCH_SUBSCRIPTIONS],
        }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLATFORM_ADMIN] }),
      ]);

      return { clinic, branch, user, subscription };
    },
    onSuccess: (payload) => {
      setResult(payload);
      toast.success(
        t('platformOnboarding.toasts.success', {
          defaultValue: 'Branch onboarding completed',
        }),
      );
    },
    onError: (error) => {
      setStepState((current) => {
        const runningStep = stepIds.find((stepId) => current[stepId] === 'running');
        return runningStep ? { ...current, [runningStep]: 'error' } : current;
      });
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          t('platformOnboarding.toasts.failed', {
            defaultValue: 'Could not complete onboarding',
          }),
      );
    },
  });

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCompanyName = (value) => {
    setForm((current) => ({
      ...current,
      companyName: value,
      slug: slugTouched ? current.slug : slugify(value),
    }));
  };

  const toggleProfile = (profile) => {
    setForm((current) => {
      const enabledProfiles = current.enabledProfiles.includes(profile)
        ? current.enabledProfiles.filter((value) => value !== profile)
        : [...current.enabledProfiles, profile];

      return { ...current, enabledProfiles };
    });
  };

  const selectedProfilesLabel = form.enabledProfiles
    .map((profile) => getProfileLabel(profile, t))
    .join(', ');
  const selectedPricingOption = PRICING_MODEL_OPTIONS.find(
    (option) => option.value === form.pricingModel,
  );
  const pricingLabel = getPricingModelLabel(form.pricingModel, t);
  const pricingHelper = selectedPricingOption
    ? t(selectedPricingOption.helperKey, {
        defaultValue: selectedPricingOption.helperDefault,
      })
    : '';
  const accessLabel = getAccessLabel(form.accessStatus, t);
  const nextMonth = formatNextMonth();
  const completedReadinessCount = readiness.filter((check) => check.ok).length;
  const launchImpactTone = canSubmit ? 'commercial' : 'warning';
  const managerIdentity =
    form.managerFullName || form.managerUsername || form.managerEmail || '--';

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t('platformOnboarding.title', {
          defaultValue: 'Branch onboarding',
        })}
        description={t('platformOnboarding.description', {
          defaultValue:
            'Create a company, configure its subscribed branch, provision the manager, and activate branch billing from one admin workflow.',
        })}
      />

      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t('platformOnboarding.steps.title', {
                defaultValue: 'Launch sequence',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stepIds.map((stepId, index) => (
              <div
                key={stepId}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {index + 1}.{' '}
                    {t(`platformOnboarding.steps.${stepId}`, {
                      defaultValue: stepId,
                    })}
                  </p>
                </div>
                <StatusPill state={stepState[stepId]} t={t} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <SectionTitle
                icon={Building2}
                title={t('platformOnboarding.company.title', {
                  defaultValue: 'Company group',
                })}
                description={t('platformOnboarding.company.description', {
                  defaultValue:
                    'Create the clinic group that owns patients, users, and branches.',
                })}
              />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="onboarding-company-name">
                  {t('platformOnboarding.company.name', {
                    defaultValue: 'Company name',
                  })}
                </Label>
                <Input
                  id="onboarding-company-name"
                  value={form.companyName}
                  onChange={(event) => updateCompanyName(event.target.value)}
                  disabled={onboardingMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-company-slug">
                  {t('platformOnboarding.company.slug', {
                    defaultValue: 'Workspace slug',
                  })}
                </Label>
                <Input
                  id="onboarding-company-slug"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    updateForm('slug', slugify(event.target.value));
                  }}
                  disabled={onboardingMutation.isPending}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="onboarding-billing-notes">
                  {t('platformOnboarding.company.billingNotes', {
                    defaultValue: 'Platform billing notes',
                  })}
                </Label>
                <Textarea
                  id="onboarding-billing-notes"
                  value={form.billingNotes}
                  onChange={(event) => updateForm('billingNotes', event.target.value)}
                  disabled={onboardingMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionTitle
                icon={Workflow}
                title={t('platformOnboarding.branch.title', {
                  defaultValue: 'Subscribed branch',
                })}
                description={t('platformOnboarding.branch.description', {
                  defaultValue:
                    'The first branch becomes the subscribed operating unit and invoice target.',
                })}
              />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="onboarding-branch-name">
                  {t('platformOnboarding.branch.name', {
                    defaultValue: 'Branch name',
                  })}
                </Label>
                <Input
                  id="onboarding-branch-name"
                  value={form.branchName}
                  placeholder={t('platformOnboarding.branch.namePlaceholder', {
                    defaultValue: 'Main Branch',
                  })}
                  onChange={(event) => updateForm('branchName', event.target.value)}
                  disabled={onboardingMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('platformOnboarding.branch.accessStatus', {
                    defaultValue: 'Opening access state',
                  })}
                </Label>
                <Select
                  value={form.accessStatus}
                  onValueChange={(value) => updateForm('accessStatus', value)}
                  disabled={onboardingMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {getOptionLabel(option, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="onboarding-access-notes">
                  {t('platformOnboarding.branch.accessNotes', {
                    defaultValue: 'Access notes',
                  })}
                </Label>
                <Textarea
                  id="onboarding-access-notes"
                  value={form.accessNotes}
                  onChange={(event) => updateForm('accessNotes', event.target.value)}
                  disabled={onboardingMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionTitle
                icon={UserRound}
                title={t('platformOnboarding.manager.title', {
                  defaultValue: 'Manager account',
                })}
                description={t('platformOnboarding.manager.description', {
                  defaultValue:
                    'Provision the clinic manager and assign them to the subscribed branch.',
                })}
              />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="onboarding-manager-name">
                  {t('users.fullName')}
                </Label>
                <Input
                  id="onboarding-manager-name"
                  value={form.managerFullName}
                  onChange={(event) =>
                    updateForm('managerFullName', event.target.value)
                  }
                  disabled={onboardingMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-manager-username">
                  {t('users.username')}
                </Label>
                <Input
                  id="onboarding-manager-username"
                  value={form.managerUsername}
                  onChange={(event) =>
                    updateForm('managerUsername', event.target.value)
                  }
                  disabled={onboardingMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-manager-email">{t('users.email')}</Label>
                <Input
                  id="onboarding-manager-email"
                  type="email"
                  value={form.managerEmail}
                  onChange={(event) => updateForm('managerEmail', event.target.value)}
                  disabled={onboardingMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-manager-password">
                  {t('users.temporaryPassword')}
                </Label>
                <Input
                  id="onboarding-manager-password"
                  type="password"
                  value={form.managerPassword}
                  onChange={(event) =>
                    updateForm('managerPassword', event.target.value)
                  }
                  disabled={onboardingMutation.isPending}
                />
              </div>
              <ImpactPanel
                className="md:col-span-2"
                tone="warning"
                icon={KeyRound}
                title={t('platformOnboarding.manager.impactTitle', {
                  defaultValue: 'Manager access provisioned at launch',
                })}
                description={t('platformOnboarding.manager.passwordRule', {
                  defaultValue:
                    'Temporary password must include uppercase, lowercase, and a number. The manager must change it on first login.',
                })}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ImpactMetric
                    label={t('users.manager', { defaultValue: 'Manager' })}
                    value={managerIdentity}
                  />
                  <ImpactMetric
                    label={t('users.branch', { defaultValue: 'Branch' })}
                    value={form.branchName || '--'}
                  />
                </div>
              </ImpactPanel>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionTitle
                icon={CreditCard}
                title={t('platformOnboarding.commercial.title', {
                  defaultValue: 'Profiles and pricing',
                })}
                description={t('platformOnboarding.commercial.description', {
                  defaultValue:
                    'Schedule the first commercial terms for the next billing month.',
                })}
              />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>
                  {t('platformOnboarding.commercial.enabledProfiles', {
                    defaultValue: 'Enabled clinic profiles',
                  })}
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CLINIC_PROFILE_OPTIONS.map((profile) => {
                    const checked = form.enabledProfiles.includes(profile.value);
                    return (
                      <label
                        key={profile.value}
                        className={cn(
                          'flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                          checked ? 'border-primary bg-primary/5' : 'bg-background',
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleProfile(profile.value)}
                          disabled={onboardingMutation.isPending}
                        />
                        <span className="font-medium">{getOptionLabel(profile, t)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t('branchSubscriptions.pricingModel', {
                      defaultValue: 'Pricing model',
                    })}
                  </Label>
                  <Select
                    value={form.pricingModel}
                    onValueChange={(value) => updateForm('pricingModel', value)}
                    disabled={onboardingMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {getOptionLabel(option, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {pricingHelper}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-base-fee">
                    {t('branchSubscriptions.basePackageFee', {
                      defaultValue: 'Base/package fee',
                    })}
                  </Label>
                  <Input
                    id="onboarding-base-fee"
                    type="number"
                    min="0"
                    step="1"
                    value={form.baseMonthlyFee}
                    onChange={(event) =>
                      updateForm('baseMonthlyFee', event.target.value)
                    }
                    disabled={onboardingMutation.isPending}
                  />
                </div>
                {isPackage && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="onboarding-package-name">
                        {t('branchSubscriptions.packageLabel', {
                          defaultValue: 'Package label',
                        })}
                      </Label>
                      <Input
                        id="onboarding-package-name"
                        value={form.packageName}
                        onChange={(event) =>
                          updateForm('packageName', event.target.value)
                        }
                        disabled={onboardingMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="onboarding-included-visits">
                        {t('branchSubscriptions.includedMonthlyVisits', {
                          defaultValue: 'Included monthly visits',
                        })}
                      </Label>
                      <Input
                        id="onboarding-included-visits"
                        type="number"
                        min="1"
                        step="1"
                        value={form.includedMonthlyVisits}
                        onChange={(event) =>
                          updateForm('includedMonthlyVisits', event.target.value)
                        }
                        disabled={onboardingMutation.isPending}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="onboarding-overage-size">
                    {t('branchSubscriptions.overageBlockSize', {
                      defaultValue: 'Overage block size',
                    })}
                  </Label>
                  <Input
                    id="onboarding-overage-size"
                    type="number"
                    min="1"
                    step="1"
                    value={form.overageBlockSize}
                    onChange={(event) =>
                      updateForm('overageBlockSize', event.target.value)
                    }
                    disabled={onboardingMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-overage-fee">
                    {t('branchSubscriptions.overageBlockFee', {
                      defaultValue: 'Overage block fee',
                    })}
                  </Label>
                  <Input
                    id="onboarding-overage-fee"
                    type="number"
                    min="0"
                    step="1"
                    value={form.overageBlockFee}
                    onChange={(event) =>
                      updateForm('overageBlockFee', event.target.value)
                    }
                    disabled={onboardingMutation.isPending}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t('platformOnboarding.review.title', {
                defaultValue: 'Launch review',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImpactPanel
              tone={launchImpactTone}
              icon={ClipboardCheck}
              title={t('platformOnboarding.review.impactTitle', {
                defaultValue: 'Launch creates the tenant, branch, manager, and terms',
              })}
              description={
                canSubmit
                  ? t('platformOnboarding.review.impactReady', {
                      defaultValue:
                        'This action opens the branch as the subscribed client unit and schedules its first billing terms.',
                    })
                  : t('platformOnboarding.review.impactBlocked', {
                      defaultValue:
                        'Complete the checklist to unlock the launch action.',
                    })
              }
            >
              <div className="grid gap-3">
                <ImpactMetric
                  label={t('platformOnboarding.company.name', {
                    defaultValue: 'Company name',
                  })}
                  value={form.companyName || '--'}
                />
                <ImpactMetric
                  label={t('platformOnboarding.branch.name', {
                    defaultValue: 'Branch name',
                  })}
                  value={form.branchName || '--'}
                />
                <ImpactMetric
                  label={t('users.manager', { defaultValue: 'Manager' })}
                  value={managerIdentity}
                />
                <ImpactMetric
                  label={t('platformOnboarding.commercial.enabledProfiles', {
                    defaultValue: 'Enabled clinic profiles',
                  })}
                  value={selectedProfilesLabel || '--'}
                />
                <ImpactMetric
                  label={t('branchSubscriptions.pricingModel', {
                    defaultValue: 'Pricing model',
                  })}
                  value={pricingLabel}
                />
                <ImpactMetric
                  label={t('platformOnboarding.review.effectiveAccess', {
                    defaultValue: 'Effective access',
                  })}
                  value={`${accessLabel} / ${nextMonth}`}
                />
                <ImpactMetric
                  label={t('platformOnboarding.review.baseFee', {
                    defaultValue: 'Base fee',
                  })}
                  value={formatMoney(form.baseMonthlyFee)}
                />
              </div>
            </ImpactPanel>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase text-muted-foreground">
                <span>
                  {t('platformOnboarding.readiness.title', {
                    defaultValue: 'Readiness',
                  })}
                </span>
                <span>
                  {t('platformOnboarding.readiness.count', {
                    completed: completedReadinessCount,
                    total: readiness.length,
                    defaultValue: '{{completed}}/{{total}} ready',
                  })}
                </span>
              </div>
              {readiness.map((check) => (
                <div
                  key={check.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2
                    className={cn(
                      'h-4 w-4',
                      check.ok ? 'text-emerald-600' : 'text-muted-foreground/40',
                    )}
                  />
                  <span>{check.label}</span>
                </div>
              ))}
            </div>

            {!canSubmit && (
              <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                {t('platformOnboarding.review.incomplete', {
                  defaultValue:
                    'Complete the readiness checklist before launching onboarding.',
                })}
              </div>
            )}

            {result && (
              <ImpactPanel
                tone="commercial"
                icon={CheckCircle2}
                title={t('platformOnboarding.result.title', {
                  defaultValue: 'Onboarding complete',
                })}
                description={`${result.clinic?.name || '--'} / ${
                  result.branch?.name || '--'
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to="/platform-admin/branch-subscriptions">
                      <CreditCard className="h-4 w-4" />
                      {t('platformOnboarding.result.openSubscription', {
                        defaultValue: 'Open subscription',
                      })}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/platform-admin/users">
                      <UserRound className="h-4 w-4" />
                      {t('platformOnboarding.result.openUsers', {
                        defaultValue: 'Open users',
                      })}
                    </Link>
                  </Button>
                </div>
              </ImpactPanel>
            )}

            <Button
              type="button"
              className="w-full"
              disabled={!canSubmit || onboardingMutation.isPending}
              onClick={() => onboardingMutation.mutate()}
            >
              {onboardingMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="mr-2 h-4 w-4" />
              )}
              {t('platformOnboarding.submit', {
                defaultValue: 'Launch branch onboarding',
              })}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
