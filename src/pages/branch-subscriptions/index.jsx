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

const emptyForm = {
  accessStatus: BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE,
  accessNotes: '',
  enabledProfiles: [],
  baseMonthlyFee: '',
  visitRates: {},
};

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

const extractVisitRates = (...candidates) => {
  const rates = {};
  const source = candidates.find((candidate) => candidate !== null && candidate !== undefined);

  if (Array.isArray(source)) {
    source.forEach((item) => {
      const profile =
        typeof item?.profile === 'string'
          ? item.profile
          : item?.profile?.profile ||
            item?.profile?.profileCode ||
            item?.profile?.code ||
            item?.profile?.name ||
            item?.profileCode ||
            item?.code ||
            item?.name;
      if (!profile) return;
      rates[profile] = asMoneyInput(
        item?.rateAmount ??
          item?.defaultRate ??
          item?.defaultVisitRate ??
          item?.rate ??
          item?.amount,
      );
    });
    return rates;
  }

  if (source && typeof source === 'object') {
    Object.entries(source).forEach(([profile, rate]) => {
      const amount =
        rate && typeof rate === 'object'
          ? rate.rateAmount ??
            rate.defaultRate ??
            rate.defaultVisitRate ??
            rate.rate ??
            rate.amount
          : rate;
      rates[profile] = asMoneyInput(amount);
    });
  }

  return rates;
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
  const visitRates = extractVisitRates(term?.visitRates, term?.profileRates);
  const profiles = Object.keys(visitRates);

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
                <p className="text-xs text-muted-foreground">Base monthly fee</p>
                <p className="font-medium">{formatMoney(term.baseMonthlyFee)}</p>
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
                <p className="text-xs text-muted-foreground">Effective to</p>
                <p className="font-medium">
                  {formatDate(term.effectiveTo || term.endsAt)}
                </p>
              </div>
            </div>
            <div className="rounded-md border">
              <div className="grid grid-cols-[1fr_auto] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                <span>Profile</span>
                <span>Visit rate</span>
              </div>
              {profiles.length ? (
                profiles.map((profile) => (
                  <div
                    key={profile}
                    className="grid grid-cols-[1fr_auto] gap-3 border-b px-3 py-2 last:border-b-0"
                  >
                    <span>{getProfileLabel(profile)}</span>
                    <span className="font-medium">{formatMoney(visitRates[profile])}</span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-muted-foreground">
                  No profile visit rates.
                </div>
              )}
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
    const visitRates = extractVisitRates(
      nextPricingTerm.visitRates,
      nextPricingTerm.profileRates,
      branchSubscription.visitRates,
      currentPricingTerm.visitRates,
      currentPricingTerm.profileRates,
    );

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
      visitRates: enabledProfiles.reduce(
        (rates, profile) => ({
          ...rates,
          [profile]: visitRates[profile] ?? '0',
        }),
        visitRates,
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
        visitRates: enabled
          ? current.visitRates
          : {
              ...current.visitRates,
              [profile]: current.visitRates[profile] ?? '0',
            },
      };
    });
  };

  const updateRate = (profile, value) => {
    setForm((current) => ({
      ...current,
      visitRates: {
        ...current.visitRates,
        [profile]: value,
      },
    }));
  };

  const buildPayload = () => {
    const enabledProfiles = form.enabledProfiles;
    const visitRates = enabledProfiles.map((profile) => ({
      profile,
      visitType: null,
      rateAmount: toMoneyInteger(form.visitRates[profile] || 0),
    }));
    const payload = {
      enabledProfiles,
      accessStatus: form.accessStatus,
      accessNotes: form.accessNotes.trim() || null,
      visitRates,
    };

    if (form.baseMonthlyFee !== '') {
      payload.baseMonthlyFee = toMoneyInteger(form.baseMonthlyFee);
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
                      <Label htmlFor="base-monthly-fee">Next-month base fee</Label>
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
                    {!hasEnabledProfiles && (
                      <p className="text-sm font-medium text-destructive">
                        Select at least one enabled profile before saving.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Enabled profiles and default visit rates</Label>
                    <div className="rounded-md border">
                      {PROFILE_OPTIONS.map((profile) => {
                        const enabled = form.enabledProfiles.includes(profile.value);
                        return (
                          <div
                            key={profile.value}
                            className="grid gap-3 border-b p-3 last:border-b-0 sm:grid-cols-[minmax(180px,1fr)_180px]"
                          >
                            <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
                              <Checkbox
                                checked={enabled}
                                onCheckedChange={() => toggleProfile(profile.value)}
                                disabled={!canManage}
                              />
                              <span>{profile.label}</span>
                            </label>
                            <div className="space-y-1">
                              <Label
                                htmlFor={`rate-${profile.value}`}
                                className="text-xs text-muted-foreground"
                              >
                                Default visit rate
                              </Label>
                              <Input
                                id={`rate-${profile.value}`}
                                type="number"
                                min="0"
                                step="1"
                                value={form.visitRates[profile.value] ?? ''}
                                onChange={(event) =>
                                  updateRate(profile.value, event.target.value)
                                }
                                disabled={!canManage || !enabled}
                              />
                            </div>
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
