import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Circle,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  Loader2,
  Plus,
  RefreshCcw,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { platformBillingApi } from '@/api/endpoints/platformBilling';
import { useBranches } from '@/hooks/useBranches';
import {
  useCreatePlatformAdjustment,
  useGeneratePlatformInvoice,
  usePlatformBillingPreview,
  usePlatformInvoice,
  usePlatformInvoices,
  usePlatformUsageEvents,
  useRecordPlatformCollection,
  useVoidPlatformInvoice,
} from '@/hooks/usePlatformBilling';
import { usePermissions } from '@/hooks/usePermissions';
import { useUIStore } from '@/store/uiStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PERMISSIONS } from '@/lib/constants';

const activeStatuses = new Set(['issued', 'partially_paid', 'paid']);

const lifecycleOrder = [
  'not_ready',
  'ready_to_preview',
  'preview_generated',
  'invoice_generated',
  'partially_collected',
  'paid',
  'voided',
];

const lifecycleStepKeys = [
  'context',
  'preview',
  'invoice',
  'collection',
  'closed',
];

const lifecycleStepIndex = {
  not_ready: 0,
  ready_to_preview: 1,
  preview_generated: 1,
  invoice_generated: 2,
  partially_collected: 3,
  paid: 4,
  voided: 2,
};

const lifecycleBadgeVariant = {
  not_ready: 'outline',
  ready_to_preview: 'secondary',
  preview_generated: 'secondary',
  invoice_generated: 'outline',
  partially_collected: 'secondary',
  paid: 'default',
  voided: 'destructive',
};

const currentMonthInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const toBillingMonth = (value) => (value ? `${value}-01` : '');

const formatMonth = (value) => (value ? String(value).slice(0, 7) : '--');

const formatNumber = (value) =>
  value === null || value === undefined
    ? '--'
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

const PROFILE_LABELS = {
  physiotherapy: {
    key: 'platformBilling.profiles.physiotherapy',
    defaultValue: 'Physiotherapy',
  },
  medical_doctor: {
    key: 'platformBilling.profiles.medicalDoctor',
    defaultValue: 'Medical doctor',
  },
  dentist: {
    key: 'platformBilling.profiles.dentist',
    defaultValue: 'Dentist',
  },
  laser_dermatology: {
    key: 'platformBilling.profiles.laserDermatology',
    defaultValue: 'Laser and dermatology',
  },
};

const INVOICE_STATUS_LABELS = {
  issued: {
    key: 'platformBilling.invoiceStatuses.issued',
    defaultValue: 'Issued',
  },
  partially_paid: {
    key: 'platformBilling.invoiceStatuses.partiallyPaid',
    defaultValue: 'Partially paid',
  },
  paid: {
    key: 'platformBilling.invoiceStatuses.paid',
    defaultValue: 'Paid',
  },
  voided: {
    key: 'platformBilling.invoiceStatuses.voided',
    defaultValue: 'Voided',
  },
};

const getInvoiceFromPackage = (invoicePackage) =>
  invoicePackage?.invoice || invoicePackage || null;

const statusBadgeVariant = (status) => {
  if (status === 'paid') return 'default';
  if (status === 'voided') return 'destructive';
  if (status === 'partially_paid') return 'secondary';
  return 'outline';
};

const getProfileLabel = (profile, t) => {
  const label = PROFILE_LABELS[profile];
  return label ? t(label.key, { defaultValue: label.defaultValue }) : profile || '--';
};

const getInvoiceStatusLabel = (status, t) => {
  const label = INVOICE_STATUS_LABELS[status];
  return label ? t(label.key, { defaultValue: label.defaultValue }) : status;
};

const getCompletedByName = (usageEvent) =>
  usageEvent?.completedBy?.fullName ||
  usageEvent?.completedByName ||
  usageEvent?.completedBy?.name ||
  '--';

const getTimestamp = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const maxTimestamp = (values) =>
  values.reduce((latest, value) => Math.max(latest, getTimestamp(value)), 0);

const getLifecycleState = ({
  needsClinicSelection,
  selectedBranchId,
  billingMonth,
  preview,
  calculation,
  activeInvoice,
  previewQuery,
}) => {
  if (needsClinicSelection || !selectedBranchId || !billingMonth || previewQuery.isError) {
    return 'not_ready';
  }

  if (!preview && !calculation) {
    return 'ready_to_preview';
  }

  if (!activeInvoice) {
    return 'preview_generated';
  }

  if (activeInvoice.status === 'paid') {
    return 'paid';
  }

  if (activeInvoice.status === 'partially_paid') {
    return 'partially_collected';
  }

  if (activeInvoice.status === 'voided') {
    return 'voided';
  }

  return 'invoice_generated';
};

const getArtifactByType = (artifacts = [], artifactType) =>
  artifacts.find((artifact) => artifact.artifactType === artifactType);

const getLatestInvoiceActivityTimestamp = (invoicePackage) => {
  const invoice = getInvoiceFromPackage(invoicePackage);
  if (!invoice) return 0;

  return maxTimestamp([
    invoice.generatedAt,
    invoice.voidedAt,
    ...(invoicePackage?.adjustments || []).map(
      (adjustment) => adjustment.updatedAt || adjustment.createdAt,
    ),
    ...(invoicePackage?.collections || []).map(
      (collection) => collection.updatedAt || collection.createdAt,
    ),
  ]);
};

const getArtifactFreshness = (artifact, latestActivityTimestamp) => {
  if (!artifact) return 'missing';

  const artifactTimestamp = getTimestamp(artifact.generatedAt);
  if (!artifactTimestamp) return 'unknown';
  if (!latestActivityTimestamp || artifactTimestamp + 1000 >= latestActivityTimestamp) {
    return 'current';
  }

  return 'stale';
};

function Metric({ label, value, emphasis = false }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        emphasis ? 'border-primary/30 bg-primary/5' : ''
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function LifecyclePanel({ state, t }) {
  const currentStep = lifecycleStepIndex[state] ?? 0;
  const orderedState = lifecycleOrder.includes(state) ? state : 'not_ready';

  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {t('platformBilling.lifecycle.label', {
              defaultValue: 'Billing lifecycle',
            })}
          </p>
          <p className="mt-1 text-base font-semibold">
            {t(`platformBilling.lifecycle.states.${orderedState}.label`)}
          </p>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t(`platformBilling.lifecycle.states.${orderedState}.description`)}
          </p>
        </div>
        <Badge variant={lifecycleBadgeVariant[state] || 'outline'}>
          {t(`platformBilling.lifecycle.states.${orderedState}.label`)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {lifecycleStepKeys.map((stepKey, index) => {
          const complete = state !== 'voided' && index < currentStep;
          const current = index === currentStep;
          const Icon = complete ? CheckCircle2 : current ? FileCheck2 : Circle;

          return (
            <div
              key={stepKey}
              className={`rounded-md border px-3 py-2 ${
                current ? 'border-primary/40 bg-primary/5' : 'bg-background'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 ${
                    complete || current ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <p className="text-sm font-medium">
                  {t(`platformBilling.lifecycle.steps.${stepKey}.label`)}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(`platformBilling.lifecycle.steps.${stepKey}.description`)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArtifactStatusRow({
  artifact,
  artifactType,
  icon: Icon,
  label,
  latestActivityTimestamp,
  onDownload,
  t,
}) {
  const freshness = getArtifactFreshness(artifact, latestActivityTimestamp);
  const badgeVariant =
    freshness === 'current'
      ? 'default'
      : freshness === 'stale'
        ? 'secondary'
        : 'destructive';

  return (
    <div className="flex flex-wrap items-center justify-between gap-1 border-b px-3 py-3 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-md border bg-background p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{label}</p>
            <Badge variant={badgeVariant}>
              {t(`platformBilling.artifacts.freshness.${freshness}`)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {artifact?.generatedAt
              ? t('platformBilling.artifacts.generatedAt', {
                  date: formatDateTime(artifact.generatedAt),
                  defaultValue: 'Generated {{date}}',
                })
              : t('platformBilling.artifacts.notGenerated', {
                  defaultValue: 'Not generated yet',
                })}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDownload(artifactType)}
        disabled={!artifact}
      >
        <Download className=" h-4 w-4" />
        {t('platformBilling.artifacts.download', { defaultValue: 'Download' })}
      </Button>
    </div>
  );
}

function UsageAuditTable({ usageEvents, includedMonthlyVisits, t }) {
  if (!usageEvents?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('platformBilling.noBillableVisits', {
          defaultValue: 'No billable visits are logged for this branch-month.',
        })}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">
              {t('platformBilling.table.patient', { defaultValue: 'Patient' })}
            </th>
            <th className="px-3 py-2 font-medium">
              {t('platformBilling.table.completed', { defaultValue: 'Completed' })}
            </th>
            <th className="px-3 py-2 font-medium">
              {t('platformBilling.table.profile', { defaultValue: 'Profile' })}
            </th>
            <th className="px-3 py-2 font-medium">
              {t('platformBilling.table.visitType', { defaultValue: 'Visit type' })}
            </th>
            <th className="px-3 py-2 font-medium">
              {t('platformBilling.table.completedBy', {
                defaultValue: 'Completed by',
              })}
            </th>
            <th className="px-3 py-2 font-medium">
              {t('platformBilling.table.billing', { defaultValue: 'Billing' })}
            </th>
          </tr>
        </thead>
        <tbody>
          {usageEvents.map((event, index) => {
            const included = index < Number(includedMonthlyVisits || 0);
            return (
              <tr key={event.id} className="border-t">
                <td className="px-3 py-2 font-medium">
                  {event.patientName || event.patient?.fullName || '--'}
                </td>
                <td className="px-3 py-2">{formatDateTime(event.completedAt)}</td>
                <td className="px-3 py-2">{getProfileLabel(event.profile, t)}</td>
                <td className="px-3 py-2">{event.visitType || '--'}</td>
                <td className="px-3 py-2">{getCompletedByName(event)}</td>
                <td className="px-3 py-2">
                  <Badge variant={included ? 'secondary' : 'outline'}>
                    {included
                      ? t('platformBilling.billingLabels.allowance', {
                          defaultValue: 'Allowance',
                        })
                      : t('platformBilling.billingLabels.overage', {
                          defaultValue: 'Overage',
                        })}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdjustmentDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setAmount('');
      setReason('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('platformBilling.adjustmentDialog.title', {
              defaultValue: 'Record adjustment',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('platformBilling.adjustmentDialog.description', {
              defaultValue:
                'Use positive amounts for extra charges and negative amounts for credits.',
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjustment-amount">
              {t('common.amount')}
            </Label>
            <Input
              id="adjustment-amount"
              type="number"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjustment-reason">
              {t('platformBilling.reason', { defaultValue: 'Reason' })}
            </Label>
            <Textarea
              id="adjustment-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => onSubmit({ amount: Number(amount), reason })}
            disabled={isLoading || !amount || reason.trim().length < 10}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('platformBilling.adjustmentDialog.submit', {
              defaultValue: 'Save adjustment',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CollectionDialog({ open, onOpenChange, onSubmit, isLoading, maxAmount }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [collectedAt, setCollectedAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) {
      setAmount('');
      setCollectedAt(new Date().toISOString().slice(0, 16));
      setMethod('cash');
      setReference('');
      setNotes('');
    }
  }, [open]);

  const numericAmount = Number(amount);
  const exceedsBalance =
    Number.isFinite(numericAmount) &&
    Number.isFinite(Number(maxAmount)) &&
    Number(maxAmount) > 0 &&
    numericAmount > Number(maxAmount);
  const invalidAmount = !Number.isFinite(numericAmount) || numericAmount <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('platformBilling.collectionDialog.title', {
              defaultValue: 'Record collection',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('platformBilling.collectionDialog.description', {
              defaultValue: 'Track the offline payment after the money is collected.',
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="collection-amount">
              {t('common.amount')}
            </Label>
            <Input
              id="collection-amount"
              type="number"
              min="1"
              max={maxAmount || undefined}
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            {Number(maxAmount) > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('platformBilling.collectionDialog.remainingBalance', {
                  amount: formatCurrency(maxAmount),
                  defaultValue: 'Remaining balance: {{amount}}',
                })}
              </p>
            )}
            {exceedsBalance && (
              <p className="text-xs text-destructive">
                {t('platformBilling.collectionDialog.exceedsBalance', {
                  defaultValue:
                    'Collection amount cannot exceed the remaining balance.',
                })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-at">
              {t('platformBilling.collectionDialog.collectedAt', {
                defaultValue: 'Collected at',
              })}
            </Label>
            <Input
              id="collection-at"
              type="datetime-local"
              value={collectedAt}
              onChange={(event) => setCollectedAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-method">
              {t('platformBilling.collectionDialog.method', {
                defaultValue: 'Method',
              })}
            </Label>
            <Input
              id="collection-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-reference">
              {t('platformBilling.collectionDialog.reference', {
                defaultValue: 'Reference',
              })}
            </Label>
            <Input
              id="collection-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="collection-notes">{t('common.notes')}</Label>
            <Textarea
              id="collection-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                amount: Number(amount),
                collectedAt: new Date(collectedAt).toISOString(),
                method,
                reference,
                notes,
              })
            }
            disabled={isLoading || invalidAmount || exceedsBalance || !method.trim()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('platformBilling.collectionDialog.submit', {
              defaultValue: 'Record collection',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidDialog({ open, onOpenChange, onSubmit, isLoading }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('platformBilling.voidDialog.title', {
              defaultValue: 'Void invoice',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('platformBilling.voidDialog.description', {
              defaultValue:
                'Voiding releases the branch-month lock only when no collections exist.',
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="void-reason">
            {t('platformBilling.reason', { defaultValue: 'Reason' })}
          </Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onSubmit({ reason })}
            disabled={isLoading || reason.trim().length < 10}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('platformBilling.voidDialog.submit', {
              defaultValue: 'Void invoice',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformBillingPage() {
  const { t } = useTranslation();
  const { platformAdminClinicId } = useUIStore();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const canView = can(PERMISSIONS['platformBilling:view']);
  const canManage = can(PERMISSIONS['platformBilling:manage']);
  const needsClinicSelection = !platformAdminClinicId;
  const platformScopeOptions = platformAdminClinicId
    ? { platformClinicId: platformAdminClinicId }
    : {};
  const linkedBranchId = searchParams.get('branchId') || '';
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [month, setMonth] = useState(currentMonthInput);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionTargetInvoice, setCollectionTargetInvoice] = useState(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const billingMonth = toBillingMonth(month);

  const { data: branchesData, isLoading: branchesLoading } = useBranches(
    {
      enabled: Boolean(canView && !needsClinicSelection),
      ...platformScopeOptions,
    },
  );
  const branches = useMemo(() => {
    if (needsClinicSelection) return [];
    if (Array.isArray(branchesData)) return branchesData;
    if (Array.isArray(branchesData?.data)) return branchesData.data;
    return [];
  }, [branchesData, needsClinicSelection]);

  useEffect(() => {
    if (needsClinicSelection || !branches.length) {
      setSelectedBranchId('');
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

    const stillExists = branches.some(
      (branch) => String(branch.id) === String(selectedBranchId),
    );
    if (!stillExists) {
      const defaultBranch = branches.find((branch) => branch.isDefault) || branches[0];
      setSelectedBranchId(String(defaultBranch.id));
    }
  }, [branches, linkedBranchId, needsClinicSelection, selectedBranchId]);

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

  const previewQuery = usePlatformBillingPreview(
    selectedBranchId,
    billingMonth,
    {
      enabled: Boolean(
        canView &&
          selectedBranchId &&
          billingMonth &&
          !needsClinicSelection,
      ),
      ...platformScopeOptions,
    },
  );
  const invoicesQuery = usePlatformInvoices(
    { branchId: selectedBranchId || undefined, billingMonth },
    {
      enabled: Boolean(
        canView &&
          selectedBranchId &&
          billingMonth &&
          !needsClinicSelection,
      ),
      ...platformScopeOptions,
    },
  );
  const usageEventsQuery = usePlatformUsageEvents(
    { branchId: selectedBranchId || undefined, billingMonth },
    {
      enabled: Boolean(
        canView &&
          selectedBranchId &&
          billingMonth &&
          !needsClinicSelection,
      ),
      ...platformScopeOptions,
    },
  );
  const invoices = useMemo(
    () => (Array.isArray(invoicesQuery.data) ? invoicesQuery.data : []),
    [invoicesQuery.data],
  );
  const usageEvents = useMemo(
    () =>
      Array.isArray(usageEventsQuery.data) ? usageEventsQuery.data : [],
    [usageEventsQuery.data],
  );
  const selectedInvoiceQuery = usePlatformInvoice(selectedInvoiceId, {
    enabled: Boolean(canView && selectedInvoiceId && !needsClinicSelection),
    ...platformScopeOptions,
  });
  const selectedInvoicePackage = selectedInvoiceQuery.data;
  const selectedInvoice = getInvoiceFromPackage(selectedInvoicePackage);
  const preview = previewQuery.data;
  const calculation = preview?.calculation;
  const activeInvoice =
    preview?.activeInvoice ||
    invoices.find((invoice) => activeStatuses.has(invoice.status)) ||
    null;
  const lifecycleState = getLifecycleState({
    needsClinicSelection,
    selectedBranchId,
    billingMonth,
    preview,
    calculation,
    activeInvoice,
    previewQuery,
  });
  const selectedArtifacts = selectedInvoicePackage?.artifacts || [];
  const latestInvoiceActivityTimestamp =
    getLatestInvoiceActivityTimestamp(selectedInvoicePackage);
  const pdfArtifact = getArtifactByType(selectedArtifacts, 'pdf');
  const excelArtifact = getArtifactByType(selectedArtifacts, 'excel');
  const resolvedCollectionInvoice =
    selectedInvoice?.id === collectionTargetInvoice?.id
      ? selectedInvoice
      : collectionTargetInvoice;
  const selectedInvoiceBalance = Number(selectedInvoice?.balanceAmount || 0);
  const collectionInvoiceBalance = Number(
    resolvedCollectionInvoice?.balanceAmount || 0,
  );
  const canCollectSelectedInvoice =
    canManage &&
    selectedInvoice &&
    selectedInvoice.status !== 'voided' &&
    selectedInvoiceBalance > 0;
  const canVoidSelectedInvoice =
    canManage &&
    selectedInvoice &&
    selectedInvoice.status !== 'voided' &&
    Number(selectedInvoice.collectedAmount || 0) === 0;

  useEffect(() => {
    if (!invoices.length) {
      setSelectedInvoiceId(null);
      return;
    }

    const stillExists = invoices.some(
      (invoice) => Number(invoice.id) === Number(selectedInvoiceId),
    );
    if (!stillExists) {
      setSelectedInvoiceId(invoices[0].id);
    }
  }, [invoices, selectedInvoiceId]);

  useEffect(() => {
    if (!collectionOpen) {
      setCollectionTargetInvoice(null);
    }
  }, [collectionOpen]);

  const generateInvoice = useGeneratePlatformInvoice();
  const createAdjustment = useCreatePlatformAdjustment();
  const recordCollection = useRecordPlatformCollection();
  const voidInvoice = useVoidPlatformInvoice();

  const refreshAll = () => {
    previewQuery.refetch();
    usageEventsQuery.refetch();
    invoicesQuery.refetch();
    if (selectedInvoiceId) selectedInvoiceQuery.refetch();
  };

  const handleDownload = async (artifactType) => {
    if (!selectedInvoice?.id) return;

    try {
      await platformBillingApi.downloadArtifact(
        selectedInvoice.id,
        artifactType,
        platformScopeOptions,
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t('platformBilling.downloadFailed', {
            defaultValue: 'Failed to download artifact',
          }),
      );
    }
  };

  const handleGenerate = () => {
    generateInvoice.mutate(
      {
        data: {
          branchId: Number(selectedBranchId),
          billingMonth,
        },
        options: platformScopeOptions,
      },
      {
        onSuccess: (data) => {
          const invoice = getInvoiceFromPackage(data);
          setSelectedInvoiceId(invoice?.id || null);
        },
      },
    );
  };

  const handleAdjustment = ({ amount, reason }) => {
    createAdjustment.mutate(
      {
        data: {
          branchId: Number(selectedBranchId),
          billingMonth,
          amount,
          reason,
        },
        options: platformScopeOptions,
      },
      {
        onSuccess: () => {
          setAdjustmentOpen(false);
        },
      },
    );
  };

  const openCollectionDialog = (invoice) => {
    if (!invoice?.id) return;

    setCollectionTargetInvoice(invoice);
    setSelectedInvoiceId(invoice.id);
    setCollectionOpen(true);
  };

  const handleCollection = (payload) => {
    if (!resolvedCollectionInvoice?.id) return;

    recordCollection.mutate(
      {
        invoiceId: resolvedCollectionInvoice.id,
        data: payload,
        options: platformScopeOptions,
      },
      {
        onSuccess: () => {
          setCollectionOpen(false);
        },
      },
    );
  };

  const handleVoid = (payload) => {
    if (!selectedInvoice?.id) return;

    voidInvoice.mutate(
      {
        invoiceId: selectedInvoice.id,
        data: payload,
        options: platformScopeOptions,
      },
      {
        onSuccess: () => {
          setVoidOpen(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformBilling.title', { defaultValue: 'Platform billing' })}
        description={t('platformBilling.description', {
          defaultValue:
            'Generate branch invoice packages, review usage, and record offline collections.',
        })}
        actions={
          <Button
            variant="outline"
            size="icon"
            onClick={refreshAll}
            disabled={
              previewQuery.isFetching ||
              usageEventsQuery.isFetching ||
              invoicesQuery.isFetching ||
              selectedInvoiceQuery.isFetching
            }
            aria-label={t('platformBilling.refreshAria', {
              defaultValue: 'Refresh platform billing data',
            })}
          >
            <RefreshCcw
              className={`h-4 w-4 ${
                previewQuery.isFetching ||
                usageEventsQuery.isFetching ||
                invoicesQuery.isFetching ||
                selectedInvoiceQuery.isFetching
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </Button>
        }
      />

      {needsClinicSelection && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
            {t('platformBilling.selectClinicNotice', {
              defaultValue:
                'Select a clinic in the top bar to manage platform billing.',
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            {t('platformBilling.billingContext', {
              defaultValue: 'Branch billing context',
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(220px,360px)_180px_auto] md:items-end">
          <div className="space-y-2">
            <Label>{t('platformBilling.branch', { defaultValue: 'Branch' })}</Label>
            <Select
              value={selectedBranchId}
              onValueChange={handleBranchSelectionChange}
              disabled={!canView || branchesLoading || needsClinicSelection}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t('platformBilling.selectBranch', {
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
          <div className="space-y-2">
            <Label htmlFor="billing-month">
              {t('platformBilling.month', { defaultValue: 'Month' })}
            </Label>
            <Input
              id="billing-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              disabled={!canView}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              previewQuery.refetch();
              usageEventsQuery.refetch();
            }}
            disabled={
              !selectedBranchId ||
              !billingMonth ||
              previewQuery.isFetching ||
              usageEventsQuery.isFetching
            }
          >
            {(previewQuery.isFetching || usageEventsQuery.isFetching) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {calculation
              ? t('platformBilling.refreshPreview', {
                  defaultValue: 'Refresh preview',
                })
              : t('platformBilling.previewInvoice', {
                  defaultValue: 'Preview invoice',
                })}
          </Button>
        </CardContent>
      </Card>

      {selectedBranchId && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    {t('platformBilling.invoicePackage', {
                      defaultValue: 'Invoice package',
                    })}
                  </CardTitle>
                  <Badge variant={lifecycleBadgeVariant[lifecycleState] || 'outline'}>
                    {t(`platformBilling.lifecycle.states.${lifecycleState}.label`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <LifecyclePanel state={lifecycleState} t={t} />

                {previewQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('platformBilling.loadingPreview', {
                      defaultValue: 'Loading preview...',
                    })}
                  </div>
                ) : previewQuery.isError ? (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {previewQuery.error?.response?.data?.message ||
                        t('platformBilling.previewFailed', {
                          defaultValue:
                            'Billing preview could not be generated for this branch-month.',
                        })}
                    </span>
                  </div>
                ) : !calculation ? (
                  <p className="text-sm text-muted-foreground">
                    {t('platformBilling.selectBranchMonthPreview', {
                      defaultValue: 'Select a branch and month to preview billing.',
                    })}
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Metric
                        label={t('platformBilling.metrics.fixedFee', {
                          defaultValue: 'Fixed fee',
                        })}
                        value={formatCurrency(calculation.fixedFeeAmount)}
                      />
                      <Metric
                        label={t('platformBilling.metrics.includedVisits', {
                          defaultValue: 'Included visits',
                        })}
                        value={formatNumber(calculation.includedMonthlyVisits)}
                      />
                      <Metric
                        label={t('platformBilling.metrics.billableVisits', {
                          defaultValue: 'Billable visits',
                        })}
                        value={formatNumber(calculation.billableVisitCount)}
                      />
                      <Metric
                        label={t('platformBilling.metrics.overageAmount', {
                          defaultValue: 'Overage amount',
                        })}
                        value={formatCurrency(calculation.overageAmount)}
                      />
                      <Metric
                        label={t('platformBilling.metrics.adjustments', {
                          defaultValue: 'Adjustments',
                        })}
                        value={formatCurrency(calculation.adjustmentAmount)}
                      />
                      <Metric
                        label={t('platformBilling.metrics.total', {
                          defaultValue: 'Total',
                        })}
                        value={formatCurrency(calculation.totalAmount)}
                        emphasis
                      />
                      <Metric
                        label={t('platformBilling.metrics.profiles', {
                          defaultValue: 'Profiles',
                        })}
                        value={`${calculation.enabledProfileCount} x ${calculation.fixedFeeMultiplier}`}
                      />
                      <Metric
                        label={t('platformBilling.metrics.overageBlocks', {
                          defaultValue: 'Overage blocks',
                        })}
                        value={formatNumber(calculation.overageBlockCount)}
                      />
                    </div>
                    {activeInvoice ? (
                      <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                          <span>
                            {t('platformBilling.activeInvoiceNotice', {
                              defaultValue:
                                'This branch-month already has an active invoice package. Use invoice detail to download artifacts or record collections.',
                            })}
                          </span>
                          {canManage &&
                            activeInvoice.status !== 'voided' && (
                              <Button
                                type="button"
                                size="sm"
                                disabled= {Number(activeInvoice.balanceAmount || 0) <= 0}
                                onClick={() => openCollectionDialog(activeInvoice)}
                              >
                                <WalletCards className="mr-2 h-4 w-4" />
                                {t('platformBilling.recordCollection', {
                                  defaultValue: 'Record collection',
                                })}
                              </Button>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {t('platformBilling.generationNotice', {
                            defaultValue:
                              'Generation locks this branch-month and creates the invoice PDF plus the Excel data sheet.',
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {canManage && (
                        <>
                          <Button
                            onClick={handleGenerate}
                            disabled={
                              generateInvoice.isPending ||
                              Boolean(activeInvoice) ||
                              !calculation
                            }
                          >
                            {generateInvoice.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="mr-2 h-4 w-4" />
                            )}
                            {t('platformBilling.generatePackage', {
                              defaultValue: 'Generate PDF + data sheet',
                            })}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAdjustmentOpen(true)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('platformBilling.adjustment', {
                              defaultValue: 'Adjustment',
                            })}
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-4 w-4" />
                    {t('platformBilling.usageAudit', {
                      defaultValue: 'Billable usage audit',
                    })}
                  </CardTitle>
                  <Badge variant="outline">
                    {t('platformBilling.visitsCount', {
                      count: formatNumber(usageEvents.length),
                      defaultValue: '{{count}} visits',
                    })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {usageEventsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('platformBilling.loadingUsage', {
                      defaultValue: 'Loading usage...',
                    })}
                  </div>
                ) : (
                  <UsageAuditTable
                    usageEvents={usageEvents}
                    includedMonthlyVisits={calculation?.includedMonthlyVisits}
                    t={t}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">
                  {t('platformBilling.invoiceLedger', {
                    defaultValue: 'Invoice ledger',
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('platformBilling.loadingInvoices', {
                      defaultValue: 'Loading invoices...',
                    })}
                  </div>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('platformBilling.noInvoices', {
                      defaultValue: 'No platform invoices for this branch-month.',
                    })}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">
                            {t('platformBilling.table.invoice', {
                              defaultValue: 'Invoice',
                            })}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('platformBilling.table.month', {
                              defaultValue: 'Month',
                            })}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('platformBilling.table.status', {
                              defaultValue: 'Status',
                            })}
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            {t('platformBilling.table.total', {
                              defaultValue: 'Total',
                            })}
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            {t('platformBilling.table.balance', {
                              defaultValue: 'Balance',
                            })}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            className={`cursor-pointer border-t hover:bg-muted/40 ${
                              Number(selectedInvoiceId) === Number(invoice.id)
                                ? 'bg-muted/50'
                                : ''
                            }`}
                            onClick={() => setSelectedInvoiceId(invoice.id)}
                          >
                            <td className="px-3 py-2 font-medium">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-3 py-2">
                              {formatMonth(invoice.billingMonth)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={statusBadgeVariant(invoice.status)}>
                                {getInvoiceStatusLabel(invoice.status, t)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(invoice.totalAmount)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(invoice.balanceAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                {t('platformBilling.invoiceDetail', {
                  defaultValue: 'Invoice detail',
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedInvoiceQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('platformBilling.loadingInvoice', {
                    defaultValue: 'Loading invoice...',
                  })}
                </div>
              ) : !selectedInvoice ? (
                <p className="text-sm text-muted-foreground">
                  {t('platformBilling.selectInvoice', {
                    defaultValue: 'Select an invoice to view details.',
                  })}
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedInvoicePackage?.branchName ||
                            selectedInvoice.branch?.name ||
                            t('platformBilling.branchFallback', {
                              defaultValue: 'Branch',
                            })}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(selectedInvoice.status)}>
                        {getInvoiceStatusLabel(selectedInvoice.status, t)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Metric
                        label={t('platformBilling.metrics.total', {
                          defaultValue: 'Total',
                        })}
                        value={formatCurrency(selectedInvoice.totalAmount)}
                      />
                      <Metric
                        label={t('platformBilling.table.balance', {
                          defaultValue: 'Balance',
                        })}
                        value={formatCurrency(selectedInvoice.balanceAmount)}
                      />
                      <Metric
                        label={t('platformBilling.metrics.collected', {
                          defaultValue: 'Collected',
                        })}
                        value={formatCurrency(selectedInvoice.collectedAmount)}
                      />
                      <Metric
                        label={t('platformBilling.metrics.visits', {
                          defaultValue: 'Visits',
                        })}
                        value={formatNumber(selectedInvoice.billableVisitCount)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">
                        {t('platformBilling.artifacts.title', {
                          defaultValue: 'Current artifacts',
                        })}
                      </p>
                      <Badge variant="outline">
                        {t('platformBilling.artifacts.currentVersion', {
                          defaultValue: 'Latest generated version',
                        })}
                      </Badge>
                    </div>
                    <div className="rounded-md border">
                      <ArtifactStatusRow
                        artifact={pdfArtifact}
                        artifactType="pdf"
                        icon={FileText}
                        label={t('platformBilling.artifacts.pdf', {
                          defaultValue: 'PDF',
                        })}
                        latestActivityTimestamp={latestInvoiceActivityTimestamp}
                        onDownload={handleDownload}
                        t={t}
                      />
                      <ArtifactStatusRow
                        artifact={excelArtifact}
                        artifactType="excel"
                        icon={FileSpreadsheet}
                        label={t('platformBilling.artifacts.excel', {
                          defaultValue: 'data sheet',
                        })}
                        latestActivityTimestamp={latestInvoiceActivityTimestamp}
                        onDownload={handleDownload}
                        t={t}
                      />
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        disabled={!canCollectSelectedInvoice}
                        onClick={() => openCollectionDialog(selectedInvoice)}
                      >
                        <WalletCards className="mr-2 h-4 w-4" />
                        {t('platformBilling.recordCollection', {
                          defaultValue: 'Record collection',
                        })}
                      </Button>
                      {canManage && selectedInvoice.status === 'paid' && (
                        <Badge variant="default">
                          <ReceiptText className="mr-1 h-3 w-3" />
                          {t('platformBilling.fullyCollected', {
                            defaultValue: 'Fully collected',
                          })}
                        </Badge>
                      )}
                      {canManage && selectedInvoice.status === 'voided' && (
                        <Badge variant="destructive">
                          {t('platformBilling.voidedInvoice', {
                            defaultValue: 'Voided invoice',
                          })}
                        </Badge>
                      )}
                      {canManage && selectedInvoice.status !== 'voided' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setVoidOpen(true)}
                          disabled={!canVoidSelectedInvoice}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          {t('platformBilling.void', { defaultValue: 'Void' })}
                        </Button>
                      )}
                    </div>
                    {canManage &&
                      selectedInvoice.status !== 'voided' &&
                      !canVoidSelectedInvoice && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <LockKeyhole className="h-3.5 w-3.5" />
                          {t('platformBilling.voidLockedNotice', {
                            defaultValue:
                              'Void is locked after collection records exist.',
                          })}
                        </p>
                      )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">
                      {t('platformBilling.usageLines', {
                        defaultValue: 'Usage lines',
                      })}
                    </p>
                    {(selectedInvoicePackage?.usageLines || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('platformBilling.noUsageLines', {
                          defaultValue: 'No usage lines were captured on this invoice.',
                        })}
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/60 text-left">
                            <tr>
                              <th className="px-3 py-2 font-medium">
                                {t('platformBilling.table.patient', {
                                  defaultValue: 'Patient',
                                })}
                              </th>
                              <th className="px-3 py-2 font-medium">
                                {t('platformBilling.table.profile', {
                                  defaultValue: 'Profile',
                                })}
                              </th>
                              <th className="px-3 py-2 font-medium">
                                {t('platformBilling.table.visitType', {
                                  defaultValue: 'Visit type',
                                })}
                              </th>
                              <th className="px-3 py-2 font-medium">
                                {t('platformBilling.table.billing', {
                                  defaultValue: 'Billing',
                                })}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedInvoicePackage?.usageLines || []).map((line) => (
                              <tr key={line.id} className="border-t">
                                <td className="px-3 py-2 font-medium">
                                  {line.patientName}
                                </td>
                                <td className="px-3 py-2">
                                  {getProfileLabel(line.profile, t)}
                                </td>
                                <td className="px-3 py-2">
                                  {line.visitType || '--'}
                                </td>
                                <td className="px-3 py-2">
                                  <Badge
                                    variant={
                                      line.includedInAllowance
                                        ? 'secondary'
                                        : 'outline'
                                    }
                                  >
                                    {line.includedInAllowance
                                      ? t('platformBilling.billingLabels.allowance', {
                                          defaultValue: 'Allowance',
                                        })
                                      : t('platformBilling.billingLabels.overage', {
                                          defaultValue: 'Overage',
                                        })}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">
                      {t('platformBilling.collections', {
                        defaultValue: 'Collections',
                      })}
                    </p>
                    {(selectedInvoicePackage?.collections || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('platformBilling.noCollections', {
                          defaultValue: 'No collection records yet.',
                        })}
                      </p>
                    ) : (
                      <div className="rounded-md border">
                        {(selectedInvoicePackage.collections || []).map((collection) => (
                          <div
                            key={collection.id}
                            className="border-b px-3 py-2 text-sm last:border-b-0"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span>{formatCurrency(collection.amount)}</span>
                              <span className="text-muted-foreground">
                                {formatDateTime(collection.collectedAt)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {collection.method}
                              {collection.reference ? ` / ${collection.reference}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AdjustmentDialog
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        onSubmit={handleAdjustment}
        isLoading={createAdjustment.isPending}
      />
      <CollectionDialog
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
        onSubmit={handleCollection}
        isLoading={recordCollection.isPending}
        maxAmount={collectionInvoiceBalance}
      />
      <VoidDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        onSubmit={handleVoid}
        isLoading={voidInvoice.isPending}
      />
    </div>
  );
}
