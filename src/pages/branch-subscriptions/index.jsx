import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Layers3,
  Loader2,
  RefreshCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import {
  ActionWeightItem,
  ActionWeightPanel,
} from '@/components/common/ActionWeightPanel';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  PERMISSIONS,
} from '@/lib/constants';
import {
  CLINIC_PROFILE_OPTIONS,
  getClinicProfileLabel,
} from '@/lib/clinicProfiles';
import { cn } from '@/lib/utils';
import {
  getClinicCurrentMonthInput,
  getClinicNextMonthInput,
} from '@/lib/time';

const STATUS_OPTIONS = [
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

const PRICING_MODEL_OPTIONS = [
  {
    value: BRANCH_PRICING_MODELS.FLEXIBLE_USAGE,
    labelKey: 'branchSubscriptions.pricingModels.flexibleUsage.label',
    labelDefault: 'Flexible branch plan',
    shortLabelKey: 'branchSubscriptions.pricingModels.flexibleUsage.shortLabel',
    shortLabelDefault: 'Base + allowance + overage',
  },
  {
    value: BRANCH_PRICING_MODELS.CAPACITY_PACKAGE,
    labelKey: 'branchSubscriptions.pricingModels.capacityPackage.label',
    labelDefault: 'Capacity branch package',
    shortLabelKey: 'branchSubscriptions.pricingModels.capacityPackage.shortLabel',
    shortLabelDefault: 'Tiered package',
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

const getOptionLabel = (option, t) =>
  option ? t(option.labelKey, { defaultValue: option.labelDefault }) : null;

const getPricingModelLabel = (model, t) =>
  getOptionLabel(
    PRICING_MODEL_OPTIONS.find((option) => option.value === model),
    t,
  ) || model;

const getProfileLabel = (profile, t) =>
  getClinicProfileLabel(profile, t) || profile;

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

const getMonthInputKey = (value) => {
  const [year, month] = String(value || '').split('-').map(Number);
  return Number.isFinite(year) && Number.isFinite(month)
    ? year * 100 + month
    : null;
};

const getCalendarMonthKey = (date) => {
  if (!date) return getMonthInputKey(getClinicCurrentMonthInput());
  return date.getFullYear() * 100 + date.getMonth() + 1;
};

const getNextCalendarMonthKey = (date) => {
  if (!date) return getMonthInputKey(getClinicNextMonthInput());
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return getCalendarMonthKey(nextMonth);
};

const formatNextCalendarMonth = () => {
  const [year, month] = getClinicNextMonthInput().split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
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

const formatProfiles = (profiles, t) => {
  if (!profiles?.length) {
    return t('branchSubscriptions.noProfilesEnabled', {
      defaultValue: 'No profiles enabled',
    });
  }
  return profiles.map((profile) => getProfileLabel(profile, t)).join(', ');
};

const getFixedFeeMultiplier = (profileCount) => {
  if (profileCount <= 0) return '0x';
  return `${(1 + Math.max(0, profileCount - 1) * 0.5).toFixed(1)}x`;
};

const getProfileListKey = (profiles) => asArray(profiles).slice().sort().join('|');

const isReadOnlyStatus = (status) =>
  status === BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED;

const toComparablePricingPayload = (term = {}) => ({
  pricingModel: term.pricingModel || BRANCH_PRICING_MODELS.FLEXIBLE_USAGE,
  baseMonthlyFee: toMoneyInteger(term.baseMonthlyFee),
  packageName: String(term.packageName || '').trim() || null,
  includedMonthlyVisits: toMoneyInteger(term.includedMonthlyVisits),
  overageBlockSize:
    term.overageBlockSize === null ||
    term.overageBlockSize === undefined ||
    term.overageBlockSize === ''
      ? null
      : Math.max(1, toMoneyInteger(term.overageBlockSize)),
  overageBlockFee: toMoneyInteger(term.overageBlockFee),
});

const pricingPayloadsMatch = (left, right) =>
  [
    'pricingModel',
    'baseMonthlyFee',
    'packageName',
    'includedMonthlyVisits',
    'overageBlockSize',
    'overageBlockFee',
  ].every((key) => left[key] === right[key]);

function ProfileChoiceCard({
  checked,
  current,
  disabled,
  id,
  label,
  onToggle,
  t,
}) {
  const changeState = current
    ? checked
      ? 'unchangedEnabled'
      : 'willDisable'
    : checked
      ? 'willEnable'
      : 'unchangedDisabled';
  const badgeText = t(`branchSubscriptions.profileStates.${changeState}`, {
    defaultValue:
      {
        unchangedEnabled: 'Enabled now',
        willDisable: 'Will be disabled',
        willEnable: 'Will be enabled',
        unchangedDisabled: 'Not enabled',
      }[changeState],
  });
  const badgeVariant =
    changeState === 'willDisable'
      ? 'destructive'
      : changeState === 'willEnable'
        ? 'default'
        : changeState === 'unchangedEnabled'
          ? 'secondary'
          : 'outline';

  return (
    <label
      className={cn(
        'flex min-h-24 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        checked
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'bg-background hover:bg-accent/60',
        current && !checked && 'border-destructive/40 bg-destructive/[0.03]',
        disabled && 'cursor-not-allowed opacity-70',
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="mt-1"
      />
      <span className="min-w-0 flex-1 space-y-2">
        <span className="block font-semibold leading-5">{label}</span>
        <Badge
          variant={badgeVariant}
          className={cn(
            'max-w-full whitespace-normal text-left leading-5',
            changeState === 'willDisable' &&
              'border-destructive/20 bg-destructive text-destructive-foreground',
          )}
        >
          {badgeText}
        </Badge>
      </span>
    </label>
  );
}

const TermSummaryPanel = ({ title, term, t }) => {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {term?.pricingModel && (
          <Badge variant="secondary">
            {getPricingModelLabel(term.pricingModel, t)}
          </Badge>
        )}
      </div>
      {!term ? (
        <p className="text-sm text-muted-foreground">
          {t('branchSubscriptions.noPricingTerm', {
            defaultValue: 'No pricing term available.',
          })}
        </p>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('branchSubscriptions.effectiveMonth', {
                defaultValue: 'Effective month',
              })}
            </dt>
            <dd className="font-medium">
              {formatDate(term.effectiveMonth || term.effectiveFrom || term.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('branchSubscriptions.basePackageFee', {
                defaultValue: 'Base/package fee',
              })}
            </dt>
            <dd className="font-medium">{formatMoney(term.baseMonthlyFee)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('branchSubscriptions.packageLabel', {
                defaultValue: 'Package label',
              })}
            </dt>
            <dd className="font-medium">{term.packageName || '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('branchSubscriptions.includedVisits', {
                defaultValue: 'Included visits',
              })}
            </dt>
            <dd className="font-medium">
              {formatMoney(term.includedMonthlyVisits)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('branchSubscriptions.overageBlock', {
                defaultValue: 'Overage block',
              })}
            </dt>
            <dd className="font-medium">
              {term.overageBlockSize
                ? t('branchSubscriptions.overageBlockVisits', {
                    count: formatMoney(term.overageBlockSize),
                    defaultValue: '{{count}} visits',
                  })
                : '--'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('branchSubscriptions.overageFee', {
                defaultValue: 'Overage fee',
              })}
            </dt>
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

function ReviewChangeRow({ label, from, to, t, tone = 'neutral' }) {
  return (
    <div
      className={cn(
        'grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-[8rem_1fr]',
        tone === 'warning' &&
          'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/25',
        tone === 'danger' && 'border-destructive/30 bg-destructive/10',
      )}
    >
      <div className="font-medium">{label}</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <div className="text-xs text-muted-foreground">
            {t('branchSubscriptions.review.current', {
              defaultValue: 'Current',
            })}
          </div>
          <div className="font-medium">{from || '--'}</div>
        </div>
        <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
        <div>
          <div className="text-xs text-muted-foreground">
            {t('branchSubscriptions.review.proposed', {
              defaultValue: 'Proposed',
            })}
          </div>
          <div className="font-medium">{to || '--'}</div>
        </div>
      </div>
    </div>
  );
}

function ChangeReviewDialog({
  action,
  changeReason,
  isSaving,
  onChangeReason,
  onConfirm,
  onOpenChange,
  t,
}) {
  const reasonReady = changeReason.trim().length >= 3;

  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{action?.title}</DialogTitle>
          <DialogDescription>{action?.description}</DialogDescription>
        </DialogHeader>

        {action?.warning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{action.warning}</span>
          </div>
        )}

        <div className="space-y-2">
          {action?.rows?.map((row) => (
            <ReviewChangeRow
              key={row.label}
              label={row.label}
              from={row.from}
              to={row.to}
              tone={row.tone}
              t={t}
            />
          ))}
        </div>

        {action?.impactItems?.length > 0 && (
          <ActionWeightPanel
            tone={action.impactTone || 'warning'}
            icon={AlertTriangle}
            title={action.impactTitle}
            description={action.impactDescription}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {action.impactItems.map((item) => (
                <ActionWeightItem
                  key={`${item.label}-${item.value}`}
                  label={item.label}
                  value={item.value}
                  helper={item.helper}
                  tone={item.tone || action.impactTone || 'warning'}
                />
              ))}
            </div>
          </ActionWeightPanel>
        )}

        <div className="space-y-2">
          <Label htmlFor="branch-subscription-change-reason">
            {t('branchSubscriptions.changeReason', {
              defaultValue: 'Admin reason',
            })}
          </Label>
          <Textarea
            id="branch-subscription-change-reason"
            value={changeReason}
            onChange={(event) => onChangeReason(event.target.value)}
            placeholder={t('branchSubscriptions.changeReasonPlaceholder', {
              defaultValue: 'Describe why this change is being made.',
            })}
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground">
            {t('branchSubscriptions.changeReasonHint', {
              defaultValue:
                'This reason is saved with the admin action payload for audit review.',
            })}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant={action?.variant || 'default'}
            onClick={onConfirm}
            disabled={isSaving || !reasonReady}
          >
            <SavingIcon isSaving={isSaving} />
            {action?.confirmLabel ||
              t('branchSubscriptions.confirmChange', {
                defaultValue: 'Confirm change',
              })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BranchSubscriptionsPage() {
  const { t } = useTranslation();
  const { platformAdminClinicId } = useUIStore();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const canView = can(PERMISSIONS['branchSubscriptions:view']);
  const canManage = can(PERMISSIONS['branchSubscriptions:manage']);
  const needsClinicSelection = !platformAdminClinicId;
  const platformScopeOptions = platformAdminClinicId
    ? { platformClinicId: platformAdminClinicId }
    : {};
  const linkedBranchId = searchParams.get('branchId') || '';
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [reviewAction, setReviewAction] = useState(null);
  const [changeReason, setChangeReason] = useState('');

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
  const branchSubscription = useMemo(
    () =>
      normalizedSubscription.subscription?.id ||
      normalizedSubscription.subscription?.accessStatus
        ? normalizedSubscription.subscription
        : selectedBranch?.subscription || {},
    [normalizedSubscription.subscription, selectedBranch],
  );
  const currentProfiles = useMemo(
    () => normalizeProfiles(branchSubscription),
    [branchSubscription],
  );
  const currentAccessStatus =
    branchSubscription.accessStatus || BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE;
  const currentAccessNotes = branchSubscription.accessNotes || '';
  const currentStatusLabel =
    getOptionLabel(
      STATUS_OPTIONS.find((status) => status.value === currentAccessStatus),
      t,
    ) ||
    currentAccessStatus;
  const currentReadOnlyAccess = isReadOnlyStatus(currentAccessStatus);
  const currentFixedFeeMultiplier = getFixedFeeMultiplier(currentProfiles.length);

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

    const linkedBranch = linkedBranchId
      ? branches.find((branch) => String(branch.id) === String(linkedBranchId))
      : null;
    if (linkedBranch) {
      if (String(selectedBranchId) !== String(linkedBranch.id)) {
        setSelectedBranchId(String(linkedBranch.id));
      }
      return;
    }

    const selectedBranchExists = branches.some(
      (branch) => String(branch.id) === String(selectedBranchId),
    );
    if (selectedBranchExists) return;

    const defaultBranch = branches.find((branch) => branch.isDefault) || branches[0];
    setSelectedBranchId(defaultBranch ? String(defaultBranch.id) : '');
  }, [
    branches,
    linkedBranchId,
    needsClinicSelection,
    platformAdminClinicId,
    selectedBranchId,
  ]);

  const handleBranchSelectionChange = (branchId) => {
    setSelectedBranchId(branchId);
    const nextSearchParams = new URLSearchParams(searchParams);
    if (branchId) {
      nextSearchParams.set('branchId', branchId);
    } else {
      nextSearchParams.delete('branchId');
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  useEffect(() => {
    if (!selectedBranchId) return;

    const nextPricingTerm = normalizedSubscription.nextPricingTerm || {};
    const currentPricingTerm = normalizedSubscription.currentPricingTerm || {};

    setForm({
      accessStatus: currentAccessStatus,
      accessNotes: currentAccessNotes,
      enabledProfiles: currentProfiles,
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
  }, [
    branchSubscription.baseMonthlyFee,
    currentAccessNotes,
    currentAccessStatus,
    currentProfiles,
    normalizedSubscription.currentPricingTerm,
    normalizedSubscription.nextPricingTerm,
    selectedBranchId,
  ]);

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

  const submitSubscriptionPatch = (data, options = {}) => {
    if (needsClinicSelection || !selectedBranchId || !canManage) return;

    updateSubscription.mutate({
      branchId: selectedBranchId,
      data,
      options: platformScopeOptions,
    }, {
      onSuccess: () => {
        if (options.closeReview) {
          setReviewAction(null);
          setChangeReason('');
        }
      },
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

  const openAccessReview = (event) => {
    event.preventDefault();
    if (!hasAccessChanges || accessNotesMissing) return;

    setChangeReason('');
    setReviewAction({
      payload: buildAccessPayload(),
      title: t('branchSubscriptions.review.accessTitle', {
        defaultValue: 'Review access change',
      }),
      description: t('branchSubscriptions.review.accessDescription', {
        defaultValue:
          'Access changes affect whether branch users can make mutating clinic updates.',
      }),
      warning: readOnlyAccess
        ? t('branchSubscriptions.review.suspendWarning', {
            defaultValue:
              'Read-only access blocks mutating clinic actions while preserving login and viewing access.',
          })
        : null,
      impactTone: readOnlyAccess ? 'danger' : 'warning',
      impactTitle: readOnlyAccess
        ? t('branchSubscriptions.review.accessImpactTitle', {
            defaultValue: 'Access impact',
          })
        : null,
      impactItems: readOnlyAccess
        ? [
            {
              label: t('branchSubscriptions.review.accessRestriction', {
                defaultValue: 'Operating restriction',
              }),
              value: statusLabel,
              helper: t('branchSubscriptions.review.accessRestrictionHelper', {
                defaultValue: 'Mutating branch actions will be blocked.',
              }),
              tone: 'danger',
            },
            {
              label: t('branchSubscriptions.review.accessNotesRequired', {
                defaultValue: 'Required access notes',
              }),
              value: form.accessNotes.trim(),
              helper: t('branchSubscriptions.review.accessNotesRequiredHelper', {
                defaultValue:
                  'The review keeps the access rationale with the audit payload.',
              }),
              tone: 'warning',
            },
          ]
        : [],
      variant: readOnlyAccess ? 'destructive' : 'default',
      confirmLabel: t('branchSubscriptions.confirmAccessChange', {
        defaultValue: 'Confirm access change',
      }),
      rows: [
        {
          label: t('branchSubscriptions.accessStatus', {
            defaultValue: 'Access status',
          }),
          from: currentStatusLabel,
          to: statusLabel,
        },
        {
          label: t('branchSubscriptions.accessNotes', {
            defaultValue: 'Access notes',
          }),
          from: currentAccessNotes || '--',
          to: form.accessNotes.trim() || '--',
        },
      ],
    });
  };

  const openProfilesReview = (event) => {
    event.preventDefault();
    if (!form.enabledProfiles.length || !hasProfileChanges) return;

    setChangeReason('');
    setReviewAction({
      payload: buildProfilesPayload(),
      title: t('branchSubscriptions.review.profilesTitle', {
        defaultValue: 'Review profile mix change',
      }),
      description: t('branchSubscriptions.review.profilesDescription', {
        defaultValue:
          'Profile changes affect available branch workflows and the fixed fee multiplier.',
      }),
      warning: hasDestructiveProfileDisable
        ? t('branchSubscriptions.review.profileDisableWarning', {
            defaultValue:
              'Disabling enabled profiles removes branch workflows after saving.',
          })
        : t('branchSubscriptions.review.profilesWarning', {
            defaultValue:
              'Profile availability changes apply to this branch after saving. Review operational impact before confirming.',
          }),
      impactTone: hasDestructiveProfileDisable ? 'danger' : 'warning',
      impactTitle: hasDestructiveProfileDisable
        ? t('branchSubscriptions.review.profileDisableImpactTitle', {
            defaultValue: 'Profile disable impact',
          })
        : null,
      impactItems: hasDestructiveProfileDisable
        ? [
            {
              label: t('branchSubscriptions.review.profileDisableLabel', {
                defaultValue: 'Profiles being disabled',
              }),
              value: formatProfiles(disabledProfiles, t),
              helper: t('branchSubscriptions.review.profileDisableHelper', {
                defaultValue:
                  'These branch workflows will no longer be available after confirmation.',
              }),
              tone: 'danger',
            },
          ]
        : [],
      variant: hasDestructiveProfileDisable ? 'destructive' : 'default',
      confirmLabel: t('branchSubscriptions.confirmProfilesChange', {
        defaultValue: 'Confirm profile change',
      }),
      rows: [
        ...(hasDestructiveProfileDisable
          ? [
              {
                label: t('branchSubscriptions.review.disabledProfiles', {
                  defaultValue: 'Disabled profiles',
                }),
                from: formatProfiles(disabledProfiles, t),
                to: t('branchSubscriptions.review.disabledProfilesResult', {
                  defaultValue: 'Removed from branch operations',
                }),
                tone: 'danger',
              },
            ]
          : []),
        {
          label: t('branchSubscriptions.enabledProfiles', {
            defaultValue: 'Enabled profiles',
          }),
          from: formatProfiles(currentProfiles, t),
          to: formatProfiles(form.enabledProfiles, t),
        },
        {
          label: t('branchSubscriptions.fixedFeeMultiplier', {
            defaultValue: 'Fixed fee multiplier',
          }),
          from: currentFixedFeeMultiplier,
          to: fixedFeeMultiplier,
        },
      ],
    });
  };

  const openPricingReview = (event) => {
    event.preventDefault();
    if (!isPricingReady || !hasPricingChanges) return;

    const pricingPayload = proposedPricingPayload;

    setChangeReason('');
    setReviewAction({
      payload: pricingPayload,
      title: t('branchSubscriptions.review.pricingTitle', {
        defaultValue: 'Review next-month pricing',
      }),
      description: t('branchSubscriptions.review.pricingDescription', {
        defaultValue:
          'Pricing changes are scheduled for the next billing month and affect future invoice calculations.',
      }),
      warning: t('branchSubscriptions.review.pricingWarning', {
        defaultValue:
          'Invoice generation will use these terms when the effective month is reached.',
      }),
      impactTone: 'commercial',
      impactTitle: t('branchSubscriptions.review.pricingImpactTitle', {
        defaultValue: 'Commercial decision',
      }),
      impactDescription: t('branchSubscriptions.review.pricingImpactDescription', {
        defaultValue:
          'These terms assign branch operating capacity for the next billing month.',
      }),
      impactItems: [
        {
          label: t('branchSubscriptions.review.pricingSchedule', {
            defaultValue: 'Scheduled terms',
          }),
          value: nextBillingMonthLabel,
          helper: t('branchSubscriptions.review.pricingScheduleHelper', {
            defaultValue: 'Used for next-month invoice calculations.',
          }),
          tone: 'commercial',
        },
        {
          label: t('branchSubscriptions.review.pricingCapacity', {
            defaultValue: 'Assigned capacity',
          }),
          value: isCapacityPackage
            ? t('branchSubscriptions.summaryVisits', {
                count: formatMoney(pricingPayload.includedMonthlyVisits),
                defaultValue: '{{count}} visits',
              })
            : getPricingModelLabel(pricingPayload.pricingModel, t),
          helper: t('branchSubscriptions.review.pricingCapacityHelper', {
            month: nextBillingMonthLabel,
            defaultValue: 'Committed for {{month}} billing.',
          }),
          tone: 'commercial',
        },
        {
          label: t('branchSubscriptions.review.pricingOverage', {
            defaultValue: 'Overage policy',
          }),
          value: isCapacityPackage ? capacityOveragePolicy : flexibleOveragePolicy,
          helper: t('branchSubscriptions.review.pricingOverageHelper', {
            defaultValue: 'Applied only after included capacity is used.',
          }),
          tone: 'commercial',
        },
      ],
      confirmLabel: t('branchSubscriptions.confirmPricingChange', {
        defaultValue: 'Confirm pricing change',
      }),
      rows: [
        {
          label: t('branchSubscriptions.effectiveMonth', {
            defaultValue: 'Effective month',
          }),
          from: formatDate(comparisonPricingTerm.effectiveMonth),
          to: nextBillingMonthLabel,
        },
        {
          label: t('branchSubscriptions.pricingModel', {
            defaultValue: 'Pricing model',
          }),
          from: getPricingModelLabel(comparisonPricingTerm.pricingModel, t),
          to: getPricingModelLabel(pricingPayload.pricingModel, t),
        },
        {
          label: t('branchSubscriptions.basePackageFee', {
            defaultValue: 'Base/package fee',
          }),
          from: formatMoney(comparisonPricingTerm.baseMonthlyFee),
          to: formatMoney(pricingPayload.baseMonthlyFee),
        },
        {
          label: t('branchSubscriptions.includedMonthlyVisits', {
            defaultValue: 'Included monthly visits',
          }),
          from: formatMoney(comparisonPricingTerm.includedMonthlyVisits),
          to: formatMoney(pricingPayload.includedMonthlyVisits),
        },
        {
          label: t('branchSubscriptions.packageLabel', {
            defaultValue: 'Package label',
          }),
          from: comparisonPricingTerm.packageName || '--',
          to: pricingPayload.packageName || '--',
        },
        {
          label: t('branchSubscriptions.overageBlockSize', {
            defaultValue: 'Overage block size',
          }),
          from: formatMoney(comparisonPricingTerm.overageBlockSize),
          to: formatMoney(pricingPayload.overageBlockSize),
        },
        {
          label: t('branchSubscriptions.overageBlockFee', {
            defaultValue: 'Overage block fee',
          }),
          from: formatMoney(comparisonPricingTerm.overageBlockFee),
          to: formatMoney(pricingPayload.overageBlockFee),
        },
      ],
    });
  };

  const handleReviewConfirm = () => {
    if (!reviewAction || changeReason.trim().length < 3) return;

    submitSubscriptionPatch(
      {
        ...reviewAction.payload,
        changeReason: changeReason.trim(),
      },
      { closeReview: true },
    );
  };

  const handleAccessSubmit = (event) => {
    openAccessReview(event);
  };

  const handleProfilesSubmit = (event) => {
    openProfilesReview(event);
  };

  const handlePricingSubmit = (event) => {
    openPricingReview(event);
  };

  const statusLabel =
    getOptionLabel(
      STATUS_OPTIONS.find((status) => status.value === form.accessStatus),
      t,
    ) ||
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
  const hasPackageOverageInputs =
    form.overageBlockSize !== '' || form.overageBlockFee !== '';
  const packageOverageIncomplete =
    isCapacityPackage &&
    hasPackageOverageInputs &&
    (toMoneyInteger(form.overageBlockSize) <= 0 ||
      toMoneyInteger(form.overageBlockFee) <= 0);
  const capacityPricingReady =
    !isCapacityPackage ||
    (form.packageName.trim().length > 0 &&
      toMoneyInteger(form.includedMonthlyVisits) > 0);
  const packageOverageReady =
    !isCapacityPackage || !packageOverageIncomplete;
  const isPricingReady =
    flexiblePricingReady && capacityPricingReady && packageOverageReady;
  const comparisonPricingTerm =
    normalizedSubscription.nextPricingTerm ||
    normalizedSubscription.currentPricingTerm ||
    {};
  const proposedPricingPayload = buildPricingPayload();
  const comparisonPricingPayload =
    toComparablePricingPayload(comparisonPricingTerm);
  const hasPricingChanges =
    !pricingPayloadsMatch(proposedPricingPayload, comparisonPricingPayload);
  const isSaving = updateSubscription.isPending;
  const readOnlyAccess = isReadOnlyStatus(form.accessStatus);
  const fixedFeeMultiplier = getFixedFeeMultiplier(form.enabledProfiles.length);
  const hasAccessChanges =
    form.accessStatus !== currentAccessStatus ||
    form.accessNotes.trim() !== currentAccessNotes.trim();
  const requiresAccessNotes = !currentReadOnlyAccess && readOnlyAccess;
  const accessNotesMissing =
    requiresAccessNotes && form.accessNotes.trim().length === 0;
  const hasProfileChanges =
    getProfileListKey(form.enabledProfiles) !== getProfileListKey(currentProfiles);
  const disabledProfiles = currentProfiles.filter(
    (profile) => !form.enabledProfiles.includes(profile),
  );
  const hasDestructiveProfileDisable = disabledProfiles.length > 0;
  const accessImpactTone = readOnlyAccess
    ? 'danger'
    : hasAccessChanges
      ? 'warning'
      : 'neutral';
  const profileImpactTone = hasDestructiveProfileDisable
    ? 'danger'
    : hasProfileChanges
      ? 'warning'
      : 'neutral';
  const nextBillingMonthLabel = formatNextCalendarMonth();
  const capacityOveragePolicy = packageOverageIncomplete
    ? t('branchSubscriptions.summaryOverageIncomplete', {
        defaultValue: 'Complete overage policy',
      })
    : hasPackageOverageInputs
      ? t('branchSubscriptions.summaryOverageBlocks', {
          size: formatMoney(toMoneyInteger(form.overageBlockSize)),
          fee: formatMoney(toMoneyInteger(form.overageBlockFee)),
          defaultValue: '{{size}} visits per {{fee}}',
        })
      : t('branchSubscriptions.summaryNoOverage', {
          defaultValue: 'No overage billing configured',
        });
  const flexibleOveragePolicy =
    toMoneyInteger(form.overageBlockSize) > 0 &&
    toMoneyInteger(form.overageBlockFee) > 0
      ? t('branchSubscriptions.summaryOverageBlocks', {
          size: formatMoney(toMoneyInteger(form.overageBlockSize)),
          fee: formatMoney(toMoneyInteger(form.overageBlockFee)),
          defaultValue: '{{size}} visits per {{fee}}',
        })
      : t('branchSubscriptions.summaryOverageIncomplete', {
          defaultValue: 'Complete overage policy',
        });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('branchSubscriptions.title', {
          defaultValue: 'Branch subscriptions',
        })}
        description={t('branchSubscriptions.description', {
          defaultValue:
            'Platform workbench for branch access, profile availability, and commercial terms.',
        })}
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
            aria-label={t('branchSubscriptions.refreshAria', {
              defaultValue: 'Refresh branch subscription data',
            })}
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
            {t('branchSubscriptions.selectClinicNotice', {
              defaultValue:
                'Select a clinic in the platform admin top bar to manage its branch subscriptions.',
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,380px)_1fr]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {t('branchSubscriptions.branchCardTitle', {
                defaultValue: 'Branch',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isBranchesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('branchSubscriptions.loadingBranches', {
                  defaultValue: 'Loading branches...',
                })}
              </div>
            ) : branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {needsClinicSelection
                  ? t('branchSubscriptions.selectClinicFirst', {
                      defaultValue: 'Select a clinic first.',
                    })
                  : t('branchSubscriptions.noBranches', {
                      defaultValue: 'No branches are available.',
                    })}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('branchSubscriptions.branchLabel')}</Label>
                  <Select
                    value={selectedBranchId}
                    onValueChange={handleBranchSelectionChange}
                    disabled={!canView}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('branchSubscriptions.selectBranch', {
                          defaultValue: 'Select branch',
                        })}
                      />
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
                        <Badge variant="secondary">
                          {t('branchSubscriptions.defaultBranch', {
                            defaultValue: 'Default branch',
                          })}
                        </Badge>
                      )}
                      <Badge
                        variant={currentReadOnlyAccess ? 'destructive' : 'default'}
                      >
                        {currentStatusLabel}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t('branchSubscriptions.enabledProfiles', {
                            defaultValue: 'Enabled profiles',
                          })}
                        </dt>
                        <dd className="font-medium">
                          {formatProfiles(currentProfiles, t)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t('branchSubscriptions.fixedFeeMultiplier', {
                            defaultValue: 'Fixed fee multiplier',
                          })}
                        </dt>
                        <dd className="font-medium">
                          {currentFixedFeeMultiplier}
                        </dd>
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
              {t('branchSubscriptions.commercialSnapshot', {
                defaultValue: 'Commercial snapshot',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedBranchId ? (
              <p className="text-sm text-muted-foreground">
                {t('branchSubscriptions.selectBranchReviewPricing', {
                  defaultValue: 'Select a branch to review pricing terms.',
                })}
              </p>
            ) : isSubscriptionLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('branchSubscriptions.loadingSubscription', {
                  defaultValue: 'Loading subscription...',
                })}
              </div>
            ) : (
              <div className="grid gap-4">
                <TermSummaryPanel
                  title={t('branchSubscriptions.currentTerm', {
                    defaultValue: 'Current term',
                  })}
                  term={normalizedSubscription.currentPricingTerm}
                  t={t}
                />
                <TermSummaryPanel
                  title={t('branchSubscriptions.nextBillingMonth', {
                    defaultValue: 'Next billing month',
                  })}
                  term={normalizedSubscription.nextPricingTerm}
                  t={t}
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
                {t('branchSubscriptions.noManagePermission', {
                  defaultValue:
                    'You can view branch subscriptions, but you do not have permission to change them.',
                })}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4" />
                    {t('branchSubscriptions.nextMonthPricing', {
                      defaultValue: 'Next-month pricing',
                    })}
                  </CardTitle>
                  <Badge variant="outline">
                    {t('branchSubscriptions.effectiveNextBillingMonth', {
                      defaultValue: 'Effective next billing month',
                    })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isSubscriptionLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('branchSubscriptions.loadingSubscription', {
                      defaultValue: 'Loading subscription...',
                    })}
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handlePricingSubmit}>
                    <ImpactPanel
                      tone="commercial"
                      icon={CalendarClock}
                      title={t('branchSubscriptions.pricingImpactTitle', {
                        defaultValue: 'Scheduled billing terms',
                      })}
                      description={t('branchSubscriptions.pricingImpactDescription', {
                        defaultValue:
                          'These values are prepared now and used when invoices are generated for the next billing month.',
                      })}
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        <ImpactMetric
                          label={t('branchSubscriptions.review.effectiveMonth', {
                            defaultValue: 'Effective month',
                          })}
                          value={nextBillingMonthLabel}
                        />
                        <ImpactMetric
                          label={t('branchSubscriptions.review.model', {
                            defaultValue: 'Model',
                          })}
                          value={getPricingModelLabel(form.pricingModel, t)}
                        />
                        <ImpactMetric
                          label={t('branchSubscriptions.review.invoiceImpact', {
                            defaultValue: 'Invoice impact',
                          })}
                          value={t('branchSubscriptions.review.nextInvoices', {
                            defaultValue: 'Future invoices',
                          })}
                        />
                      </div>
                    </ImpactPanel>

                    <div className="space-y-2">
                      <Label>
                        {t('branchSubscriptions.pricingModel', {
                          defaultValue: 'Pricing model',
                        })}
                      </Label>
                      <div
                        className="grid gap-2 sm:grid-cols-2"
                        role="radiogroup"
                        aria-label={t('branchSubscriptions.pricingModel', {
                          defaultValue: 'Pricing model',
                        })}
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
                                {t(model.labelKey, {
                                  defaultValue: model.labelDefault,
                                })}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {t(model.shortLabelKey, {
                                  defaultValue: model.shortLabelDefault,
                                })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isFlexibleUsage && (
                      <div className="space-y-4 rounded-md border p-4">
                        <div>
                          <h3 className="text-sm font-semibold">
                            {t('branchSubscriptions.flexiblePlanControls', {
                              defaultValue: 'Flexible branch plan controls',
                            })}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t('branchSubscriptions.flexiblePlanDescription', {
                              defaultValue:
                                'Set the base branch fee, monthly visit allowance, and required overage blocks.',
                            })}
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="base-monthly-fee">
                              {t('branchSubscriptions.baseBranchFee', {
                                defaultValue: 'Base branch fee',
                              })}
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
                              {t('branchSubscriptions.includedMonthlyVisits', {
                                defaultValue: 'Included monthly visits',
                              })}
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
                              {t('branchSubscriptions.overageBlockSize', {
                                defaultValue: 'Overage block size',
                              })}
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
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="overage-block-fee">
                              {t('branchSubscriptions.overageBlockFee', {
                                defaultValue: 'Overage block fee',
                              })}
                            </Label>
                            <Input
                              id="overage-block-fee"
                              type="number"
                              min="1"
                              step="1"
                              value={form.overageBlockFee}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  overageBlockFee: event.target.value,
                                }))
                              }
                              disabled={!canManage}
                              required
                            />
                          </div>
                        </div>
                        <ActionWeightPanel
                          tone="neutral"
                          icon={CreditCard}
                          title={t('branchSubscriptions.flexibleUsageSummaryTitle', {
                            defaultValue: 'Flexible usage summary',
                          })}
                          description={t(
                            'branchSubscriptions.flexibleUsageSummaryDescription',
                            {
                              defaultValue:
                                'The branch keeps a flexible base, visit allowance, and billable overage blocks for the next billing month.',
                            },
                          )}
                        >
                          <div className="grid gap-2 sm:grid-cols-3">
                            <ActionWeightItem
                              label={t('branchSubscriptions.summaryBaseFee', {
                                defaultValue: 'Base fee',
                              })}
                              value={
                                form.baseMonthlyFee === ''
                                  ? '--'
                                  : formatMoney(toMoneyInteger(form.baseMonthlyFee))
                              }
                              helper={t(
                                'branchSubscriptions.summaryScheduledMonthHelper',
                                {
                                  month: nextBillingMonthLabel,
                                  defaultValue: 'Assigned for {{month}} billing.',
                                },
                              )}
                            />
                            <ActionWeightItem
                              label={t('branchSubscriptions.summaryAllowance', {
                                defaultValue: 'Allowance',
                              })}
                              value={
                                form.includedMonthlyVisits === ''
                                  ? '--'
                                  : t('branchSubscriptions.summaryVisits', {
                                      count: formatMoney(
                                        toMoneyInteger(form.includedMonthlyVisits),
                                      ),
                                      defaultValue: '{{count}} visits',
                                    })
                              }
                              helper={t('branchSubscriptions.summaryIncludedHelper', {
                                defaultValue: 'Included monthly capacity',
                              })}
                            />
                            <ActionWeightItem
                              label={t('branchSubscriptions.summaryOveragePolicy', {
                                defaultValue: 'Overage policy',
                              })}
                              value={flexibleOveragePolicy}
                              helper={t(
                                'branchSubscriptions.summaryFlexibleOverageHelper',
                                {
                                  defaultValue: 'Billable block after allowance',
                                },
                              )}
                              tone={flexiblePricingReady ? 'neutral' : 'warning'}
                            />
                          </div>
                        </ActionWeightPanel>
                      </div>
                    )}

                    {isCapacityPackage && (
                      <div className="space-y-4 rounded-md border p-4">
                        <div>
                          <h3 className="text-sm font-semibold">
                            {t('branchSubscriptions.capacityPackageControls', {
                              defaultValue: 'Capacity package controls',
                            })}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t('branchSubscriptions.capacityPackageDescription', {
                              defaultValue:
                                'Name the package, set its package fee and included visit capacity, then optionally define overage blocks.',
                            })}
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="package-name">
                              {t('branchSubscriptions.packageLabel', {
                                defaultValue: 'Package label',
                              })}
                            </Label>
                            <Input
                              id="package-name"
                              value={form.packageName}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  packageName: event.target.value,
                                }))
                              }
                              placeholder={t('branchSubscriptions.packagePlaceholder', {
                                defaultValue: 'e.g. Growth, Scale',
                              })}
                              disabled={!canManage}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="base-monthly-fee">
                              {t('branchSubscriptions.packageFee', {
                                defaultValue: 'Package fee',
                              })}
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
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="included-monthly-visits">
                              {t('branchSubscriptions.includedMonthlyVisits', {
                                defaultValue: 'Included monthly visits',
                              })}
                            </Label>
                            <Input
                              id="included-monthly-visits"
                              type="number"
                              min="1"
                              step="1"
                              value={form.includedMonthlyVisits}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  includedMonthlyVisits: event.target.value,
                                }))
                              }
                              disabled={!canManage}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="overage-block-size">
                              {t('branchSubscriptions.overageBlockSizeOptional', {
                                defaultValue: 'Overage block size (optional)',
                              })}
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
                              {t('branchSubscriptions.overageBlockFeeOptional', {
                                defaultValue: 'Overage block fee (optional)',
                              })}
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
                        </div>
                        <ActionWeightPanel
                          tone={packageOverageIncomplete ? 'warning' : 'commercial'}
                          icon={CreditCard}
                          title={t('branchSubscriptions.capacityDecisionTitle', {
                            defaultValue: 'Next-month operating capacity',
                          })}
                          description={t(
                            'branchSubscriptions.capacityDecisionDescription',
                            {
                              defaultValue:
                                'This assigns the branch package, included visit capacity, and overage policy for the next billing month.',
                            },
                          )}
                        >
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <ActionWeightItem
                              label={t('branchSubscriptions.summaryPackageLabel', {
                                defaultValue: 'Package',
                              })}
                              value={
                                form.packageName.trim() ||
                                t('branchSubscriptions.summaryNoPackage', {
                                  defaultValue: 'Package not named',
                                })
                              }
                              helper={t('branchSubscriptions.summaryPackageHelper', {
                                defaultValue: 'Operating capacity label',
                              })}
                              tone="commercial"
                            />
                            <ActionWeightItem
                              label={t('branchSubscriptions.summaryFee', {
                                defaultValue: 'Monthly fee',
                              })}
                              value={
                                form.baseMonthlyFee === ''
                                  ? '--'
                                  : formatMoney(toMoneyInteger(form.baseMonthlyFee))
                              }
                              helper={t(
                                'branchSubscriptions.summaryScheduledMonthHelper',
                                {
                                  month: nextBillingMonthLabel,
                                  defaultValue: 'Assigned for {{month}} billing.',
                                },
                              )}
                              tone="commercial"
                            />
                            <ActionWeightItem
                              label={t(
                                'branchSubscriptions.summaryIncludedCapacity',
                                {
                                  defaultValue: 'Included capacity',
                                },
                              )}
                              value={
                                form.includedMonthlyVisits === ''
                                  ? '--'
                                  : t('branchSubscriptions.summaryVisits', {
                                      count: formatMoney(
                                        toMoneyInteger(form.includedMonthlyVisits),
                                      ),
                                      defaultValue: '{{count}} visits',
                                    })
                              }
                              helper={t('branchSubscriptions.summaryIncludedHelper', {
                                defaultValue: 'Included monthly capacity',
                              })}
                              tone="commercial"
                            />
                            <ActionWeightItem
                              label={t('branchSubscriptions.summaryOveragePolicy', {
                                defaultValue: 'Overage policy',
                              })}
                              value={capacityOveragePolicy}
                              helper={t('branchSubscriptions.summaryOverageHelper', {
                                defaultValue:
                                  'Billing rule after included capacity',
                              })}
                              tone={
                                packageOverageIncomplete ? 'warning' : 'commercial'
                              }
                            />
                          </div>
                        </ActionWeightPanel>
                        <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                          {t('branchSubscriptions.capacityOverageOptionalNotice', {
                            defaultValue:
                              'Leave both overage fields empty if this package has no overage billing. If one is entered, both are required.',
                          })}
                        </div>
                      </div>
                    )}

                    {packageOverageIncomplete && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {t('branchSubscriptions.capacityOverageIncompleteNotice', {
                            defaultValue:
                              'Complete both overage block size and fee, or leave both empty for no overage billing.',
                          })}
                        </span>
                      </div>
                    )}

                    {!isPricingReady && !packageOverageIncomplete && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {t('branchSubscriptions.pricingRequiredNotice', {
                            defaultValue:
                              'Complete the required fields for the selected pricing model before saving.',
                          })}
                        </span>
                      </div>
                    )}

                    {isPricingReady && !hasPricingChanges && (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                        {t('branchSubscriptions.noPricingChangesNotice', {
                          defaultValue:
                            'Change at least one pricing value before review.',
                        })}
                      </div>
                    )}

                    {canManage && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          className="w-full sm:w-auto"
                          disabled={
                            isSaving || !isPricingReady || !hasPricingChanges
                          }
                        >
                          <SavingIcon isSaving={isSaving} />
                          {t('branchSubscriptions.reviewNextMonthPricing', {
                            defaultValue: 'Review next-month pricing',
                          })}
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
                      {t('branchSubscriptions.accessControl', {
                        defaultValue: 'Access control',
                      })}
                    </CardTitle>
                    <Badge variant={readOnlyAccess ? 'destructive' : 'default'}>
                      {statusLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleAccessSubmit}>
                    <ImpactPanel
                      tone={accessImpactTone}
                      icon={readOnlyAccess ? AlertTriangle : ShieldCheck}
                      title={t('branchSubscriptions.accessImpactTitle', {
                        defaultValue: 'Branch operating access',
                      })}
                      description={
                        readOnlyAccess
                          ? t('branchSubscriptions.readOnlyNotice', {
                              defaultValue:
                                'Read-only blocks mutating clinic actions while preserving login and viewing access.',
                            })
                          : t('branchSubscriptions.activeAccessNotice', {
                              defaultValue:
                                'Active access allows permitted branch users to continue normal clinic operations.',
                            })
                      }
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ImpactMetric
                          label={t('branchSubscriptions.review.currentAccess', {
                            defaultValue: 'Current access',
                          })}
                          value={currentStatusLabel}
                        />
                        <ImpactMetric
                          label={t('branchSubscriptions.review.proposedAccess', {
                            defaultValue: 'Proposed access',
                          })}
                          value={statusLabel}
                        />
                      </div>
                    </ImpactPanel>

                    <div className="space-y-2">
                      <Label>
                        {t('branchSubscriptions.accessStatus', {
                          defaultValue: 'Access status',
                        })}
                      </Label>
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
                              {t(status.labelKey, {
                                defaultValue: status.labelDefault,
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="access-notes">
                        {t('branchSubscriptions.accessNotes', {
                          defaultValue: 'Access notes',
                        })}
                      </Label>
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
                      {accessNotesMissing && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            {t('branchSubscriptions.accessNotesRequiredNotice', {
                              defaultValue:
                                'Add access notes before reviewing a move into read-only access.',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant={readOnlyAccess ? 'destructive' : 'default'}
                          className="w-full sm:w-auto"
                          disabled={
                            isSaving || !hasAccessChanges || accessNotesMissing
                          }
                        >
                          <SavingIcon isSaving={isSaving} />
                          {t('branchSubscriptions.reviewAccessChange', {
                            defaultValue: 'Review access change',
                          })}
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
                      {t('branchSubscriptions.clinicProfiles', {
                        defaultValue: 'Clinic profiles',
                      })}
                    </CardTitle>
                    <Badge variant="secondary">{fixedFeeMultiplier}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleProfilesSubmit}>
                    <ImpactPanel
                      tone={profileImpactTone}
                      icon={Layers3}
                      title={t('branchSubscriptions.profileImpactTitle', {
                        defaultValue: 'Workflow and fixed-fee impact',
                      })}
                      description={t('branchSubscriptions.profileImpactDescription', {
                        defaultValue:
                          'Profile availability changes which workflows the branch can use and updates the fixed monthly fee multiplier.',
                      })}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ImpactMetric
                          label={t('branchSubscriptions.review.currentProfiles', {
                            defaultValue: 'Current profiles',
                          })}
                          value={formatProfiles(currentProfiles, t)}
                        />
                        <ImpactMetric
                          label={t('branchSubscriptions.review.proposedProfiles', {
                            defaultValue: 'Proposed profiles',
                          })}
                          value={formatProfiles(form.enabledProfiles, t)}
                        />
                        <ImpactMetric
                          label={t('branchSubscriptions.review.currentMultiplier', {
                            defaultValue: 'Current multiplier',
                          })}
                          value={currentFixedFeeMultiplier}
                        />
                        <ImpactMetric
                          label={t('branchSubscriptions.review.proposedMultiplier', {
                            defaultValue: 'Proposed multiplier',
                          })}
                          value={fixedFeeMultiplier}
                        />
                      </div>
                      <div className="mt-3 flex items-start gap-2 border-t pt-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>
                          {t('branchSubscriptions.fixedFeeRule', {
                            defaultValue:
                              'First profile is 1.0x fixed fee; each extra enabled profile adds 0.5x.',
                          })}
                        </span>
                      </div>
                    </ImpactPanel>

                    {hasDestructiveProfileDisable && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {t('branchSubscriptions.profileDisableHighImpactNotice', {
                            profiles: formatProfiles(disabledProfiles, t),
                            defaultValue:
                              'Disabling {{profiles}} removes those workflows from this branch after saving.',
                          })}
                        </span>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      {CLINIC_PROFILE_OPTIONS.map((profile) => {
                        const enabled = form.enabledProfiles.includes(profile.value);
                        const current = currentProfiles.includes(profile.value);
                        return (
                          <ProfileChoiceCard
                            key={profile.value}
                            id={`branch-subscription-profile-${profile.value}`}
                            checked={enabled}
                            current={current}
                            disabled={!canManage}
                            label={t(profile.labelKey, {
                              defaultValue: profile.labelDefault,
                            })}
                            onToggle={() => toggleProfile(profile.value)}
                            t={t}
                          />
                        );
                      })}
                    </div>

                    {!hasEnabledProfiles && (
                      <p className="text-sm font-medium text-destructive">
                        {t('branchSubscriptions.selectProfileBeforeSaving', {
                          defaultValue:
                            'Select at least one enabled profile before saving.',
                        })}
                      </p>
                    )}

                    {canManage && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant={
                            hasDestructiveProfileDisable ? 'destructive' : 'default'
                          }
                          className="w-full sm:w-auto"
                          disabled={
                            isSaving || !hasEnabledProfiles || !hasProfileChanges
                          }
                        >
                          <SavingIcon isSaving={isSaving} />
                          {t('branchSubscriptions.reviewProfileChange', {
                            defaultValue: 'Review profile change',
                          })}
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

      <ChangeReviewDialog
        action={reviewAction}
        changeReason={changeReason}
        isSaving={isSaving}
        onChangeReason={setChangeReason}
        onConfirm={handleReviewConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setReviewAction(null);
            setChangeReason('');
          }
        }}
        t={t}
      />
    </div>
  );
}
