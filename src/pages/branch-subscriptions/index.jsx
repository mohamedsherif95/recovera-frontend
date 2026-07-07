import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Loader2, RefreshCcw, Save } from 'lucide-react';
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
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  canOverrideClinicScope,
  resolveEffectiveClinicId,
} from '@/lib/branchScope';
import {
  BRANCH_SUBSCRIPTION_ACCESS_STATUS,
  BRANCH_PRICING_MODELS,
  CLINIC_PROFILES,
  PERMISSIONS,
} from '@/lib/constants';

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
  },
  {
    value: BRANCH_PRICING_MODELS.CAPACITY_PACKAGE,
    label: 'Capacity branch package',
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

const PricingTermPanel = ({ title, term }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!term ? (
          <p className="text-muted-foreground">No pricing term available.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Pricing model</p>
                <p className="font-medium">
                  {getPricingModelLabel(term.pricingModel)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Base monthly fee</p>
                <p className="font-medium">{formatMoney(term.baseMonthlyFee)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Package label</p>
                <p className="font-medium">{term.packageName || '--'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Effective month</p>
                <p className="font-medium">
                  {formatDate(
                    term.effectiveMonth || term.effectiveFrom || term.startsAt,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Included visits</p>
                <p className="font-medium">
                  {formatMoney(term.includedMonthlyVisits)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overage block</p>
                <p className="font-medium">
                  {term.overageBlockSize
                    ? `${formatMoney(term.overageBlockSize)} visits / ${formatMoney(
                        term.overageBlockFee,
                      )}`
                    : '--'}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default function BranchSubscriptionsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { clinicOverrideId } = useUIStore();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS['branchSubscriptions:view']);
  const canManage = can(PERMISSIONS['branchSubscriptions:manage']);
  const canOverrideClinic = canOverrideClinicScope(user);
  const effectiveClinicId = resolveEffectiveClinicId(user, clinicOverrideId);
  const needsClinicSelection = Boolean(canOverrideClinic && !effectiveClinicId);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [form, setForm] = useState(emptyForm);

  const {
    data: branchesData,
    isLoading: isBranchesLoading,
    refetch: refetchBranches,
    isFetching: isBranchesFetching,
  } = useBranches(Boolean(canView && !needsClinicSelection));

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
  }, [branches, effectiveClinicId, needsClinicSelection, selectedBranchId]);

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

  const buildPayload = () => {
    const enabledProfiles = form.enabledProfiles;
    const payload = {
      enabledProfiles,
      accessStatus: form.accessStatus,
      accessNotes: form.accessNotes.trim() || null,
      pricingModel: form.pricingModel,
    };

    if (form.baseMonthlyFee !== '') {
      payload.baseMonthlyFee = toMoneyInteger(form.baseMonthlyFee);
    }
    if (form.packageName.trim()) {
      payload.packageName = form.packageName.trim();
    } else {
      payload.packageName = null;
    }
    if (form.includedMonthlyVisits !== '') {
      payload.includedMonthlyVisits = toMoneyInteger(form.includedMonthlyVisits);
    }
    if (form.overageBlockSize !== '') {
      payload.overageBlockSize = Math.max(
        1,
        toMoneyInteger(form.overageBlockSize),
      );
    } else {
      payload.overageBlockSize = null;
    }
    if (form.overageBlockFee !== '') {
      payload.overageBlockFee = toMoneyInteger(form.overageBlockFee);
    }

    return payload;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (needsClinicSelection || !selectedBranchId) return;
    if (!form.enabledProfiles.length) return;

    updateSubscription.mutate({
      branchId: selectedBranchId,
      data: buildPayload(),
    });
  };

  const statusLabel =
    STATUS_OPTIONS.find((status) => status.value === form.accessStatus)?.label ||
    form.accessStatus;
  const hasEnabledProfiles = form.enabledProfiles.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch subscriptions"
        description="Manage branch access status, enabled clinic profiles, and default pricing terms."
        actions={
          <div className="flex items-center gap-2">
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
                className={`h-4 w-4 ${
                  isBranchesFetching || isSubscriptionFetching ? 'animate-spin' : ''
                }`}
              />
            </Button>
          </div>
        }
      />

      {needsClinicSelection && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
            Select a clinic in the top bar to manage its branch subscriptions.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Branch
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <div className="grid gap-4 md:grid-cols-[minmax(220px,360px)_1fr] md:items-end">
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
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{selectedBranch.name}</span>
                  {selectedBranch.isDefault && (
                    <Badge variant="secondary">Default branch</Badge>
                  )}
                  <Badge
                    variant={
                      form.accessStatus === BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE
                        ? 'default'
                        : 'outline'
                    }
                  >
                    {statusLabel}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!needsClinicSelection && selectedBranchId && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Access and profiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {isSubscriptionLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading subscription...
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
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
                    <div className="space-y-2">
                      <Label>Pricing model</Label>
                      <Select
                        value={form.pricingModel}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            pricingModel: value,
                          }))
                        }
                        disabled={!canManage}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRICING_MODEL_OPTIONS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        placeholder="e.g. Flexible, Growth, Scale"
                        disabled={!canManage}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="base-monthly-fee">
                        Next-month base/package fee
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
                        min="0"
                        step="1"
                        value={form.includedMonthlyVisits}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            includedMonthlyVisits: event.target.value,
                          }))
                        }
                        disabled={!canManage}
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overage-block-fee">
                        Overage block fee
                      </Label>
                      <Input
                        id="overage-block-fee"
                        type="number"
                        min="0"
                        step="1"
                        value={form.overageBlockFee}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            overageBlockFee: event.target.value,
                          }))
                        }
                        disabled={!canManage}
                      />
                    </div>
                    {!hasEnabledProfiles && (
                      <p className="text-sm font-medium text-destructive">
                        Select at least one enabled profile before saving.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Enabled profiles</Label>
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
                  </div>

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
                        disabled={
                          updateSubscription.isPending ||
                          needsClinicSelection ||
                          !selectedBranchId ||
                          !hasEnabledProfiles
                        }
                      >
                        {updateSubscription.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {t('common.save', { defaultValue: 'Save' })}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <PricingTermPanel
              title="Current pricing term"
              term={normalizedSubscription.currentPricingTerm}
            />
            <PricingTermPanel
              title="Next pricing term"
              term={normalizedSubscription.nextPricingTerm}
            />
          </div>
        </form>
      )}
    </div>
  );
}
