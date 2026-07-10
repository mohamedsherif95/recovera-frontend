import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CreditCard,
  Layers3,
  Loader2,
  RefreshCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
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
import { useBranches } from '@/hooks/useBranches';
import {
  useBranchSubscription,
  useUpdateBranchSubscription,
} from '@/hooks/useBranchSubscriptions';
import { usePermissions } from '@/hooks/usePermissions';
import { useUIStore } from '@/store/uiStore';
import {
  BRANCH_SUBSCRIPTION_ACCESS_STATUS,
  BRANCH_PRICING_MODELS,
  CLINIC_PROFILES,
  PERMISSIONS,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

const PROFILE_OPTIONS = [
  {
    value: CLINIC_PROFILES.PHYSIOTHERAPY,
    label: 'Physiotherapy',
  },
  {
    value: CLINIC_PROFILES.MEDICAL_DOCTOR,
    label: 'Medical doctor clinic',
  },
  {
    value: CLINIC_PROFILES.DENTIST,
    label: 'Dentist',
  },
  {
    value: CLINIC_PROFILES.LASER_DERMATOLOGY,
    label: 'Laser and dermatology',
  },
];

const STATUS_OPTIONS = [
  {
    value: BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE,
    label: 'Active',
  },
  {
    value: BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED,
    label: 'Read-only',
  },
];

const PRICING_MODEL_OPTIONS = [
  {
    value: BRANCH_PRICING_MODELS.FLEXIBLE_USAGE,
    label: 'Flexible branch plan',
    shortLabel: 'Base + allowance + overage',
  },
  {
    value: BRANCH_PRICING_MODELS.CAPACITY_PACKAGE,
    label: 'Capacity branch package',
    shortLabel: 'Tiered package',
  },
];

const emptyForm = {
  accessStatus: BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE,
  accessNotes: '',
  enabledProfiles: [],
  baseMonthlyFee: '',
  pricingModel: BRANCH_PRICING_MODELS.FLEXIBLE_USAGE,
  packageName: '',
  includedMonthlyVisits: '',
  overageBlockSize: '',
  overageBlockFee: '',
};

const getPricingModelLabel = (model) =>
  PRICING_MODEL_OPTIONS.find((option) => option.value === model)?.label || model;

const getProfileLabel = (profile) =>
  PROFILE_OPTIONS.find((option) => option.value === profile)?.label || profile;

const asArray = (value) => (Array.isArray(value) ? value : []);

const asMoneyInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
};

const toMoneyInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const getCalendarMonthKey = (date = new Date()) =>
  date.getFullYear() * 100 + date.getMonth() + 1;

const getNextCalendarMonthKey = (date = new Date()) => {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return getCalendarMonthKey(nextMonth);
};

const getTermMonthKey = (term) => {
  const value =
    term?.effectiveMonth ||
    term?.month ||
    term?.effectiveFrom ||
    term?.startsAt ||
    null;
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return getCalendarMonthKey(value);
  }

  const rawValue = String(value);
  const monthMatch = rawValue.match(/^(\d{4})-(\d{1,2})/);
  if (monthMatch) {
    return Number(monthMatch[1]) * 100 + Number(monthMatch[2]);
  }

  const parsedDate = new Date(rawValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return getCalendarMonthKey(parsedDate);
  }

  return null;
};

const deriveCurrentPricingTerm = (pricingTerms, fallbackTerm) => {
  const currentMonthKey = getCalendarMonthKey();

  return (
    asArray(pricingTerms)
      .map((term) => ({ term, monthKey: getTermMonthKey(term) }))
      .filter(({ monthKey }) => monthKey !== null && monthKey <= currentMonthKey)
      .sort((left, right) => right.monthKey - left.monthKey)[0]?.term ||
    fallbackTerm ||
    null
  );
};

const deriveNextPricingTerm = (pricingTerms, fallbackTerm) => {
  const nextMonthKey = getNextCalendarMonthKey();

  return (
    asArray(pricingTerms)
      .map((term) => ({ term, monthKey: getTermMonthKey(term) }))
      .find(({ monthKey }) => monthKey === nextMonthKey)?.term ||
    fallbackTerm ||
    null
  );
};

const normalizeProfiles = (subscription) => {
  if (Array.isArray(subscription?.enabledProfiles)) {
    return subscription.enabledProfiles.filter(Boolean);
  }

  return asArray(subscription?.profiles)
    .filter((profile) => profile?.isEnabled !== false)
    .map((profile) =>
      typeof profile === 'string'
        ? profile
        : profile?.profile || profile?.profileCode || profile?.code || profile?.name,
    )
    .filter(Boolean);
};

const normalizeSubscriptionResponse = (response) => {
  const root = response?.data || response || {};
  const subscription = root?.subscription || root || {};
  const pricingTerms = asArray(subscription?.pricingTerms || root?.pricingTerms);
  const explicitCurrentPricingTerm =
    root?.currentPricingTerm ||
    root?.currentTerm ||
    subscription?.currentPricingTerm ||
    subscription?.currentTerm ||
    null;
  const explicitNextPricingTerm =
    root?.nextPricingTerm ||
    root?.nextTerm ||
    subscription?.nextPricingTerm ||
    subscription?.nextTerm ||
    null;
  const currentPricingTerm = deriveCurrentPricingTerm(
    pricingTerms,
    explicitCurrentPricingTerm,
  );
  const nextPricingTerm = deriveNextPricingTerm(
    pricingTerms,
    explicitNextPricingTerm,
  );

  return {
    branch: root?.branch || subscription?.branch || null,
    subscription,
    currentPricingTerm,
    nextPricingTerm,
  };
};

const formatDate = (value) => {
  if (!value) return '--';
  return String(value).slice(0, 10);
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
};

const formatProfiles = (profiles) => {
  if (!profiles?.length) return 'No profiles enabled';
  return profiles.map(getProfileLabel).join(', ');
};

const getFixedFeeMultiplier = (profileCount) => {
  if (profileCount <= 0) return '0x';
  return `${(1 + Math.max(0, profileCount - 1) * 0.5).toFixed(1)}x`;
};

const isReadOnlyStatus = (status) =>
  status === BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED;

const TermSummaryPanel = ({ title, term }) => {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {term?.pricingModel && (
          <Badge variant="secondary">{getPricingModelLabel(term.pricingModel)}</Badge>
        )}
      </div>
      {!term ? (
        <p className="text-sm text-muted-foreground">No pricing term available.</p>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Effective month</dt>
            <dd className="font-medium">
              {formatDate(term.effectiveMonth || term.effectiveFrom || term.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Base/package fee</dt>
            <dd className="font-medium">{formatMoney(term.baseMonthlyFee)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Package label</dt>
            <dd className="font-medium">{term.packageName || '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Included visits</dt>
            <dd className="font-medium">
              {formatMoney(term.includedMonthlyVisits)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Overage block</dt>
            <dd className="font-medium">
              {term.overageBlockSize
                ? `${formatMoney(term.overageBlockSize)} visits`
                : '--'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Overage fee</dt>
            <dd className="font-medium">{formatMoney(term.overageBlockFee)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
};

const SavingIcon = ({ isSaving }) =>
  isSaving ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : (
    <Save className="mr-2 h-4 w-4" />
  );

export default function BranchSubscriptionsPage() {
  const { platformAdminClinicId } = useUIStore();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS['branchSubscriptions:view']);
  const canManage = can(PERMISSIONS['branchSubscriptions:manage']);
  const needsClinicSelection = !platformAdminClinicId;
  const platformScopeOptions = platformAdminClinicId
    ? { platformClinicId: platformAdminClinicId }
    : {};
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [form, setForm] = useState(emptyForm);

  const {
    data: branchesData,
    isLoading: isBranchesLoading,
    refetch: refetchBranches,
    isFetching: isBranchesFetching,
  } = useBranches({
    enabled: Boolean(canView && !needsClinicSelection),
    ...platformScopeOptions,
  });

  const branches = useMemo(() => {
    if (needsClinicSelection) return [];

    if (Array.isArray(branchesData)) return branchesData;
    if (Array.isArray(branchesData?.data)) return branchesData.data;
    return [];
  }, [branchesData, needsClinicSelection]);

  const selectedBranch = branches.find(
    (branch) => String(branch.id) === String(selectedBranchId),
  );

  const {
    data: subscriptionData,
    isLoading: isSubscriptionLoading,
    isFetching: isSubscriptionFetching,
    refetch: refetchSubscription,
  } = useBranchSubscription(selectedBranchId, {
    enabled: Boolean(canView && selectedBranchId && !needsClinicSelection),
    ...platformScopeOptions,
  });
  const updateSubscription = useUpdateBranchSubscription();

  const normalizedSubscription = useMemo(
    () => normalizeSubscriptionResponse(subscriptionData),
    [subscriptionData],
  );

  useEffect(() => {
    if (needsClinicSelection) {
      if (selectedBranchId) {
        setSelectedBranchId('');
      }
      setForm(emptyForm);
      return;
    }

    if (branches.length === 0) {
      if (selectedBranchId) {
        setSelectedBranchId('');
      }
      setForm(emptyForm);
      return;
    }

    const selectedBranchExists = branches.some(
      (branch) => String(branch.id) === String(selectedBranchId),
    );
    if (selectedBranchExists) return;

    const defaultBranch = branches.find((branch) => branch.isDefault) || branches[0];
    setSelectedBranchId(defaultBranch ? String(defaultBranch.id) : '');
  }, [branches, platformAdminClinicId, needsClinicSelection, selectedBranchId]);

  useEffect(() => {
    if (!selectedBranchId) return;

    const branchSubscription =
      normalizedSubscription.subscription?.id ||
      normalizedSubscription.subscription?.accessStatus
        ? normalizedSubscription.subscription
        : selectedBranch?.subscription || {};
    const enabledProfiles = normalizeProfiles(branchSubscription);
    const nextPricingTerm = normalizedSubscription.nextPricingTerm || {};
    const currentPricingTerm = normalizedSubscription.currentPricingTerm || {};

    setForm({
      accessStatus:
        branchSubscription.accessStatus ||
        BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE,
      accessNotes: branchSubscription.accessNotes || '',
      enabledProfiles,
      baseMonthlyFee: asMoneyInput(
        nextPricingTerm.baseMonthlyFee ??
          branchSubscription.baseMonthlyFee ??
          currentPricingTerm.baseMonthlyFee,
      ),
      pricingModel:
        nextPricingTerm.pricingModel ||
        currentPricingTerm.pricingModel ||
        BRANCH_PRICING_MODELS.FLEXIBLE_USAGE,
      packageName:
        nextPricingTerm.packageName || currentPricingTerm.packageName || '',
      includedMonthlyVisits: asMoneyInput(
        nextPricingTerm.includedMonthlyVisits ??
          currentPricingTerm.includedMonthlyVisits,
      ),
      overageBlockSize: asMoneyInput(
        nextPricingTerm.overageBlockSize ?? currentPricingTerm.overageBlockSize,
      ),
      overageBlockFee: asMoneyInput(
        nextPricingTerm.overageBlockFee ?? currentPricingTerm.overageBlockFee,
      ),
    });
  }, [normalizedSubscription, selectedBranch, selectedBranchId]);

  const toggleProfile = (profile) => {
    setForm((current) => {
      const enabled = current.enabledProfiles.includes(profile);
      const enabledProfiles = enabled
        ? current.enabledProfiles.filter((value) => value !== profile)
        : [...current.enabledProfiles, profile];

      return {
        ...current,
        enabledProfiles,
      };
    });
  };

  const submitSubscriptionPatch = (data) => {
    if (needsClinicSelection || !selectedBranchId || !canManage) return;

    updateSubscription.mutate({
      branchId: selectedBranchId,
      data,
      options: platformScopeOptions,
    });
  };

  const buildAccessPayload = () => ({
    accessStatus: form.accessStatus,
    accessNotes: form.accessNotes.trim() || null,
  });

  const buildProfilesPayload = () => ({
    enabledProfiles: form.enabledProfiles,
  });

  const buildPricingPayload = () => ({
    pricingModel: form.pricingModel,
    baseMonthlyFee: toMoneyInteger(form.baseMonthlyFee),
    packageName: form.packageName.trim() || null,
    includedMonthlyVisits: toMoneyInteger(form.includedMonthlyVisits),
    overageBlockSize:
      form.overageBlockSize === ''
        ? null
        : Math.max(1, toMoneyInteger(form.overageBlockSize)),
    overageBlockFee: toMoneyInteger(form.overageBlockFee),
  });

  const handleAccessSubmit = (event) => {
    event.preventDefault();
    submitSubscriptionPatch(buildAccessPayload());
  };

  const handleProfilesSubmit = (event) => {
    event.preventDefault();
    if (!form.enabledProfiles.length) return;
    submitSubscriptionPatch(buildProfilesPayload());
  };

  const handlePricingSubmit = (event) => {
    event.preventDefault();
    if (!isPricingReady) return;
    submitSubscriptionPatch(buildPricingPayload());
  };

  const statusLabel =
    STATUS_OPTIONS.find((status) => status.value === form.accessStatus)?.label ||
    form.accessStatus;
  const hasEnabledProfiles = form.enabledProfiles.length > 0;
  const isFlexibleUsage =
    form.pricingModel === BRANCH_PRICING_MODELS.FLEXIBLE_USAGE;
  const isCapacityPackage =
    form.pricingModel === BRANCH_PRICING_MODELS.CAPACITY_PACKAGE;
  const flexiblePricingReady =
    !isFlexibleUsage ||
    (toMoneyInteger(form.overageBlockSize) > 0 &&
      toMoneyInteger(form.overageBlockFee) > 0);
  const capacityPricingReady =
    !isCapacityPackage ||
    (form.packageName.trim().length > 0 &&
      toMoneyInteger(form.includedMonthlyVisits) > 0);
  const packageOverageReady =
    !isCapacityPackage ||
    (form.overageBlockSize === '' && form.overageBlockFee === '') ||
    (toMoneyInteger(form.overageBlockSize) > 0 &&
      toMoneyInteger(form.overageBlockFee) > 0);
  const isPricingReady =
    flexiblePricingReady && capacityPricingReady && packageOverageReady;
  const isSaving = updateSubscription.isPending;
  const readOnlyAccess = isReadOnlyStatus(form.accessStatus);
  const fixedFeeMultiplier = getFixedFeeMultiplier(form.enabledProfiles.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch subscriptions"
        description="Platform workbench for branch access, profile availability, and commercial terms."
        actions={
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetchBranches();
              if (selectedBranchId) refetchSubscription();
            }}
            disabled={
              needsClinicSelection ||
              isBranchesFetching ||
              isSubscriptionFetching
            }
          >
            <RefreshCcw
              className={cn(
                'h-4 w-4',
                (isBranchesFetching || isSubscriptionFetching) && 'animate-spin',
              )}
            />
          </Button>
        }
      />

      {needsClinicSelection && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
            Select a clinic in the platform admin top bar to manage its branch
            subscriptions.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,380px)_1fr]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Branch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isBranchesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading branches...
              </div>
            ) : branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {needsClinicSelection
                  ? 'Select a clinic first.'
                  : 'No branches are available.'}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select
                    value={selectedBranchId}
                    onValueChange={setSelectedBranchId}
                    disabled={!canView}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBranch && (
                  <div className="rounded-md border bg-muted/20 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{selectedBranch.name}</span>
                      {selectedBranch.isDefault && (
                        <Badge variant="secondary">Default branch</Badge>
                      )}
                      <Badge variant={readOnlyAccess ? 'destructive' : 'default'}>
                        {statusLabel}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Enabled profiles
                        </dt>
                        <dd className="font-medium">
                          {formatProfiles(form.enabledProfiles)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Fixed fee multiplier
                        </dt>
                        <dd className="font-medium">{fixedFeeMultiplier}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Commercial snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedBranchId ? (
              <p className="text-sm text-muted-foreground">
                Select a branch to review pricing terms.
              </p>
            ) : isSubscriptionLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading subscription...
              </div>
            ) : (
              <div className="grid gap-4">
                <TermSummaryPanel
                  title="Current term"
                  term={normalizedSubscription.currentPricingTerm}
                />
                <TermSummaryPanel
                  title="Next billing month"
                  term={normalizedSubscription.nextPricingTerm}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!needsClinicSelection && selectedBranchId && (
        <>
          {!canManage && (
            <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
                You can view branch subscriptions, but you do not have permission to
                change them.
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4" />
                    Next-month pricing
                  </CardTitle>
                  <Badge variant="outline">Effective next billing month</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isSubscriptionLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading subscription...
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handlePricingSubmit}>
                    <div className="space-y-2">
                      <Label>Pricing model</Label>
                      <div
                        className="grid gap-2 sm:grid-cols-2"
                        role="radiogroup"
                        aria-label="Pricing model"
                      >
                        {PRICING_MODEL_OPTIONS.map((model) => {
                          const selected = form.pricingModel === model.value;
                          return (
                            <button
                              key={model.value}
                              type="button"
                              aria-pressed={selected}
                              disabled={!canManage}
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  pricingModel: model.value,
                                }))
                              }
                              className={cn(
                                'min-h-16 rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                                selected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'bg-background hover:bg-accent',
                              )}
                            >
                              <span className="block font-semibold">
                                {model.label}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {model.shortLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="base-monthly-fee">
                          Base/package fee
                        </Label>
                        <Input
                          id="base-monthly-fee"
                          type="number"
                          min="0"
                          step="1"
                          value={form.baseMonthlyFee}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              baseMonthlyFee: event.target.value,
                            }))
                          }
                          disabled={!canManage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="included-monthly-visits">
                          Included monthly visits
                        </Label>
                        <Input
                          id="included-monthly-visits"
                          type="number"
                          min={isCapacityPackage ? '1' : '0'}
                          step="1"
                          value={form.includedMonthlyVisits}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              includedMonthlyVisits: event.target.value,
                            }))
                          }
                          disabled={!canManage}
                          required={isCapacityPackage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="package-name">Package label</Label>
                        <Input
                          id="package-name"
                          value={form.packageName}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              packageName: event.target.value,
                            }))
                          }
                          placeholder="e.g. Growth, Scale"
                          disabled={!canManage}
                          required={isCapacityPackage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="overage-block-size">
                          Overage block size
                        </Label>
                        <Input
                          id="overage-block-size"
                          type="number"
                          min="1"
                          step="1"
                          value={form.overageBlockSize}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              overageBlockSize: event.target.value,
                            }))
                          }
                          disabled={!canManage}
                          required={isFlexibleUsage}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="overage-block-fee">
                          Overage block fee
                        </Label>
                        <Input
                          id="overage-block-fee"
                          type="number"
                          min={isFlexibleUsage ? '1' : '0'}
                          step="1"
                          value={form.overageBlockFee}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              overageBlockFee: event.target.value,
                            }))
                          }
                          disabled={!canManage}
                          required={isFlexibleUsage}
                        />
                      </div>
                    </div>

                    {!isPricingReady && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Complete the required fields for the selected pricing
                          model before saving.
                        </span>
                      </div>
                    )}

                    {canManage && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={isSaving || !isPricingReady}
                        >
                          <SavingIcon isSaving={isSaving} />
                          Save next-month pricing
                        </Button>
                      </div>
                    )}
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card
                className={cn(
                  readOnlyAccess &&
                    'border-destructive/40 bg-destructive/[0.03]',
                )}
              >
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldCheck className="h-4 w-4" />
                      Access control
                    </CardTitle>
                    <Badge variant={readOnlyAccess ? 'destructive' : 'default'}>
                      {statusLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleAccessSubmit}>
                    <div className="space-y-2">
                      <Label>Access status</Label>
                      <Select
                        value={form.accessStatus}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            accessStatus: value,
                          }))
                        }
                        disabled={!canManage}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {readOnlyAccess && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Read-only blocks mutating clinic actions while preserving
                          login and viewing access.
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="access-notes">Access notes</Label>
                      <Textarea
                        id="access-notes"
                        value={form.accessNotes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            accessNotes: event.target.value,
                          }))
                        }
                        disabled={!canManage}
                      />
                    </div>

                    {canManage && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant={readOnlyAccess ? 'destructive' : 'default'}
                          disabled={isSaving}
                        >
                          <SavingIcon isSaving={isSaving} />
                          Save access
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Layers3 className="h-4 w-4" />
                      Clinic profiles
                    </CardTitle>
                    <Badge variant="secondary">{fixedFeeMultiplier}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleProfilesSubmit}>
                    <div className="rounded-md border">
                      {PROFILE_OPTIONS.map((profile) => {
                        const enabled = form.enabledProfiles.includes(profile.value);
                        return (
                          <div
                            key={profile.value}
                            className="border-b p-3 last:border-b-0"
                          >
                            <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
                              <Checkbox
                                checked={enabled}
                                onCheckedChange={() => toggleProfile(profile.value)}
                                disabled={!canManage}
                              />
                              <span>{profile.label}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                      First profile is 1.0x fixed fee; each extra enabled profile
                      adds 0.5x.
                    </div>

                    {!hasEnabledProfiles && (
                      <p className="text-sm font-medium text-destructive">
                        Select at least one enabled profile before saving.
                      </p>
                    )}

                    {canManage && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={isSaving || !hasEnabledProfiles}
                        >
                          <SavingIcon isSaving={isSaving} />
                          Save profiles
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
