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

const getCalendarMonthKey = (date = new Date()) =>
  date.getFullYear() * 100 + date.getMonth() + 1;

const getNextCalendarMonthKey = (date = new Date()) => {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return getCalendarMonthKey(nextMonth);
};

const formatNextCalendarMonth = () =>
  new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString(
    undefined,
    {
      month: 'short',
      year: 'numeric',
    },
  );

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

function ReviewChangeRow({ label, from, to, t }) {
  return (
    <div className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-[8rem_1fr]">
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
              t={t}
            />
          ))}
        </div>

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
    if (!form.enabledProfiles.length) return;

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
      warning: t('branchSubscriptions.review.profilesWarning', {
        defaultValue:
          'Profile availability changes apply to this branch after saving. Review operational impact before confirming.',
      }),
      confirmLabel: t('branchSubscriptions.confirmProfilesChange', {
        defaultValue: 'Confirm profile change',
      }),
      rows: [
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
    if (!isPricingReady) return;

    const pricingPayload = buildPricingPayload();
    const comparisonTerm =
      normalizedSubscription.nextPricingTerm ||
      normalizedSubscription.currentPricingTerm ||
      {};

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
      confirmLabel: t('branchSubscriptions.confirmPricingChange', {
        defaultValue: 'Confirm pricing change',
      }),
      rows: [
        {
          label: t('branchSubscriptions.effectiveMonth', {
            defaultValue: 'Effective month',
          }),
          from: formatDate(comparisonTerm.effectiveMonth),
          to: formatNextCalendarMonth(),
        },
        {
          label: t('branchSubscriptions.pricingModel', {
            defaultValue: 'Pricing model',
          }),
          from: getPricingModelLabel(comparisonTerm.pricingModel, t),
          to: getPricingModelLabel(pricingPayload.pricingModel, t),
        },
        {
          label: t('branchSubscriptions.basePackageFee', {
            defaultValue: 'Base/package fee',
          }),
          from: formatMoney(comparisonTerm.baseMonthlyFee),
          to: formatMoney(pricingPayload.baseMonthlyFee),
        },
        {
          label: t('branchSubscriptions.includedMonthlyVisits', {
            defaultValue: 'Included monthly visits',
          }),
          from: formatMoney(comparisonTerm.includedMonthlyVisits),
          to: formatMoney(pricingPayload.includedMonthlyVisits),
        },
        {
          label: t('branchSubscriptions.packageLabel', {
            defaultValue: 'Package label',
          }),
          from: comparisonTerm.packageName || '--',
          to: pricingPayload.packageName || '--',
        },
        {
          label: t('branchSubscriptions.overageBlockSize', {
            defaultValue: 'Overage block size',
          }),
          from: formatMoney(comparisonTerm.overageBlockSize),
          to: formatMoney(pricingPayload.overageBlockSize),
        },
        {
          label: t('branchSubscriptions.overageBlockFee', {
            defaultValue: 'Overage block fee',
          }),
          from: formatMoney(comparisonTerm.overageBlockFee),
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
  const hasAccessChanges =
    form.accessStatus !== currentAccessStatus ||
    form.accessNotes.trim() !== currentAccessNotes.trim();
  const hasProfileChanges =
    getProfileListKey(form.enabledProfiles) !== getProfileListKey(currentProfiles);

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
                        <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                          {t('branchSubscriptions.capacityOverageOptionalNotice', {
                            defaultValue:
                              'Leave both overage fields empty if this package has no overage billing. If one is entered, both are required.',
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm md:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t('branchSubscriptions.review.effectiveMonth', {
                            defaultValue: 'Effective month',
                          })}
                        </div>
                        <div className="font-medium">{formatNextCalendarMonth()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t('branchSubscriptions.review.model', {
                            defaultValue: 'Model',
                          })}
                        </div>
                        <div className="font-medium">
                          {getPricingModelLabel(form.pricingModel, t)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t('branchSubscriptions.review.invoiceImpact', {
                            defaultValue: 'Invoice impact',
                          })}
                        </div>
                        <div className="font-medium">
                          {t('branchSubscriptions.review.nextInvoices', {
                            defaultValue: 'Future invoices',
                          })}
                        </div>
                      </div>
                    </div>

                    {!isPricingReady && (
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

                    {canManage && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={isSaving || !isPricingReady}
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

                    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t('branchSubscriptions.review.currentAccess', {
                            defaultValue: 'Current access',
                          })}
                        </div>
                        <div className="font-medium">{currentStatusLabel}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {t('branchSubscriptions.review.proposedAccess', {
                            defaultValue: 'Proposed access',
                          })}
                        </div>
                        <div className="font-medium">{statusLabel}</div>
                      </div>
                    </div>

                    {readOnlyAccess && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {t('branchSubscriptions.readOnlyNotice', {
                            defaultValue:
                              'Read-only blocks mutating clinic actions while preserving login and viewing access.',
                          })}
                        </span>
                      </div>
                    )}

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
                    </div>

                    {canManage && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant={readOnlyAccess ? 'destructive' : 'default'}
                          disabled={isSaving || !hasAccessChanges}
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
                    <div className="rounded-md border">
                      {CLINIC_PROFILE_OPTIONS.map((profile) => {
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
                              <span>
                                {t(profile.labelKey, {
                                  defaultValue: profile.labelDefault,
                                })}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t('branchSubscriptions.review.currentProfiles', {
                              defaultValue: 'Current profiles',
                            })}
                          </div>
                          <div className="font-medium">
                            {formatProfiles(currentProfiles, t)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t('branchSubscriptions.review.proposedProfiles', {
                              defaultValue: 'Proposed profiles',
                            })}
                          </div>
                          <div className="font-medium">
                            {formatProfiles(form.enabledProfiles, t)}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t('branchSubscriptions.review.currentMultiplier', {
                              defaultValue: 'Current multiplier',
                            })}
                          </div>
                          <div className="font-medium">
                            {currentFixedFeeMultiplier}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t('branchSubscriptions.review.proposedMultiplier', {
                              defaultValue: 'Proposed multiplier',
                            })}
                          </div>
                          <div className="font-medium">{fixedFeeMultiplier}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 border-t pt-3 text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>
                          {t('branchSubscriptions.fixedFeeRule', {
                            defaultValue:
                              'First profile is 1.0x fixed fee; each extra enabled profile adds 0.5x.',
                          })}
                        </span>
                      </div>
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
                          variant="outline"
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
