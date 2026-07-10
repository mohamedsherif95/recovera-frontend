import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCcw,
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
import { PERMISSIONS, PLATFORM_INVOICE_STATUS_LABELS } from '@/lib/constants';

const activeStatuses = new Set(['issued', 'partially_paid', 'paid']);

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
  physiotherapy: 'Physiotherapy',
  medical_doctor: 'Medical doctor',
  dentist: 'Dentist',
  laser_dermatology: 'Laser and dermatology',
};

const getInvoiceFromPackage = (invoicePackage) =>
  invoicePackage?.invoice || invoicePackage || null;

const statusBadgeVariant = (status) => {
  if (status === 'paid') return 'default';
  if (status === 'voided') return 'destructive';
  if (status === 'partially_paid') return 'secondary';
  return 'outline';
};

const getProfileLabel = (profile) => PROFILE_LABELS[profile] || profile || '--';

const getCompletedByName = (usageEvent) =>
  usageEvent?.completedBy?.fullName ||
  usageEvent?.completedByName ||
  usageEvent?.completedBy?.name ||
  '--';

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

function UsageAuditTable({ usageEvents, includedMonthlyVisits }) {
  if (!usageEvents?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No billable visits are logged for this branch-month.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Patient</th>
            <th className="px-3 py-2 font-medium">Completed</th>
            <th className="px-3 py-2 font-medium">Profile</th>
            <th className="px-3 py-2 font-medium">Visit type</th>
            <th className="px-3 py-2 font-medium">Completed by</th>
            <th className="px-3 py-2 font-medium">Billing</th>
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
                <td className="px-3 py-2">{getProfileLabel(event.profile)}</td>
                <td className="px-3 py-2">{event.visitType || '--'}</td>
                <td className="px-3 py-2">{getCompletedByName(event)}</td>
                <td className="px-3 py-2">
                  <Badge variant={included ? 'secondary' : 'outline'}>
                    {included ? 'Allowance' : 'Overage'}
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
          <DialogTitle>Record adjustment</DialogTitle>
          <DialogDescription>
            Use positive amounts for extra charges and negative amounts for credits.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjustment-amount">Amount</Label>
            <Input
              id="adjustment-amount"
              type="number"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjustment-reason">Reason</Label>
            <Textarea
              id="adjustment-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ amount: Number(amount), reason })}
            disabled={isLoading || !amount || reason.trim().length < 10}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CollectionDialog({ open, onOpenChange, onSubmit, isLoading }) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record collection</DialogTitle>
          <DialogDescription>
            Track the offline payment after the money is collected.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="collection-amount">Amount</Label>
            <Input
              id="collection-amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-at">Collected at</Label>
            <Input
              id="collection-at"
              type="datetime-local"
              value={collectedAt}
              onChange={(event) => setCollectedAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-method">Method</Label>
            <Input
              id="collection-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-reference">Reference</Label>
            <Input
              id="collection-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="collection-notes">Notes</Label>
            <Textarea
              id="collection-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
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
            disabled={isLoading || Number(amount) <= 0 || !method.trim()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidDialog({ open, onOpenChange, onSubmit, isLoading }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void invoice</DialogTitle>
          <DialogDescription>
            Voiding releases the branch-month lock only when no collections exist.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="void-reason">Reason</Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onSubmit({ reason })}
            disabled={isLoading || reason.trim().length < 10}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Void invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformBillingPage() {
  const { platformAdminClinicId } = useUIStore();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS['platformBilling:view']);
  const canManage = can(PERMISSIONS['platformBilling:manage']);
  const needsClinicSelection = !platformAdminClinicId;
  const platformScopeOptions = platformAdminClinicId
    ? { platformClinicId: platformAdminClinicId }
    : {};
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [month, setMonth] = useState(currentMonthInput);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
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

    const stillExists = branches.some(
      (branch) => String(branch.id) === String(selectedBranchId),
    );
    if (!stillExists) {
      const defaultBranch = branches.find((branch) => branch.isDefault) || branches[0];
      setSelectedBranchId(String(defaultBranch.id));
    }
  }, [branches, needsClinicSelection, selectedBranchId]);

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
  const invoices = Array.isArray(invoicesQuery.data) ? invoicesQuery.data : [];
  const usageEvents = Array.isArray(usageEventsQuery.data)
    ? usageEventsQuery.data
    : [];
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
      toast.error(error?.response?.data?.message || 'Failed to download artifact');
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

  const handleCollection = (payload) => {
    if (!selectedInvoice?.id) return;

    recordCollection.mutate(
      {
        invoiceId: selectedInvoice.id,
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
        title="Platform billing"
        description="Generate branch invoice packages, review usage, and record offline collections."
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
            Select a clinic in the top bar to manage platform billing.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Branch billing context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(220px,360px)_180px_auto] md:items-end">
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
              disabled={!canView || branchesLoading || needsClinicSelection}
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
          <div className="space-y-2">
            <Label htmlFor="billing-month">Month</Label>
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
            Refresh preview
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
                    Invoice package
                  </CardTitle>
                  {activeInvoice ? (
                    <Badge variant="secondary">
                      Active invoice: {activeInvoice.invoiceNumber}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Ready to generate</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading preview...
                  </div>
                ) : !calculation ? (
                  <p className="text-sm text-muted-foreground">
                    Select a branch and month to preview billing.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Metric
                        label="Fixed fee"
                        value={formatCurrency(calculation.fixedFeeAmount)}
                      />
                      <Metric
                        label="Included visits"
                        value={formatNumber(calculation.includedMonthlyVisits)}
                      />
                      <Metric
                        label="Billable visits"
                        value={formatNumber(calculation.billableVisitCount)}
                      />
                      <Metric
                        label="Overage amount"
                        value={formatCurrency(calculation.overageAmount)}
                      />
                      <Metric
                        label="Adjustments"
                        value={formatCurrency(calculation.adjustmentAmount)}
                      />
                      <Metric
                        label="Total"
                        value={formatCurrency(calculation.totalAmount)}
                        emphasis
                      />
                      <Metric
                        label="Profiles"
                        value={`${calculation.enabledProfileCount} x ${calculation.fixedFeeMultiplier}`}
                      />
                      <Metric
                        label="Overage blocks"
                        value={formatNumber(calculation.overageBlockCount)}
                      />
                    </div>
                    {activeInvoice ? (
                      <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          This branch-month already has an active invoice package.
                          Use invoice detail to download artifacts or record collections.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Generation locks this branch-month and creates the invoice
                          PDF plus the Excel data sheet.
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
                            Generate PDF + data sheet
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAdjustmentOpen(true)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Adjustment
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
                    Billable usage audit
                  </CardTitle>
                  <Badge variant="outline">
                    {formatNumber(usageEvents.length)} visits
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {usageEventsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading usage...
                  </div>
                ) : (
                  <UsageAuditTable
                    usageEvents={usageEvents}
                    includedMonthlyVisits={calculation?.includedMonthlyVisits}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Invoice ledger</CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading invoices...
                  </div>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No platform invoices for this branch-month.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Invoice</th>
                          <th className="px-3 py-2 font-medium">Month</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 text-right font-medium">Total</th>
                          <th className="px-3 py-2 text-right font-medium">Balance</th>
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
                                {PLATFORM_INVOICE_STATUS_LABELS[invoice.status] ||
                                  invoice.status}
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
              <CardTitle className="text-base">Invoice detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedInvoiceQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading invoice...
                </div>
              ) : !selectedInvoice ? (
                <p className="text-sm text-muted-foreground">
                  Select an invoice to view details.
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
                            'Branch'}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(selectedInvoice.status)}>
                        {PLATFORM_INVOICE_STATUS_LABELS[selectedInvoice.status] ||
                          selectedInvoice.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Metric
                        label="Total"
                        value={formatCurrency(selectedInvoice.totalAmount)}
                      />
                      <Metric
                        label="Balance"
                        value={formatCurrency(selectedInvoice.balanceAmount)}
                      />
                      <Metric
                        label="Collected"
                        value={formatCurrency(selectedInvoice.collectedAmount)}
                      />
                      <Metric
                        label="Visits"
                        value={formatNumber(selectedInvoice.billableVisitCount)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload('pdf')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload('excel')}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    {canManage && selectedInvoice.status !== 'voided' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionOpen(true)}
                        >
                          <WalletCards className="mr-2 h-4 w-4" />
                          Collection
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setVoidOpen(true)}
                          disabled={Number(selectedInvoice.collectedAmount) > 0}
                        >
                          Void
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Usage lines</p>
                    {(selectedInvoicePackage?.usageLines || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No usage lines were captured on this invoice.
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/60 text-left">
                            <tr>
                              <th className="px-3 py-2 font-medium">Patient</th>
                              <th className="px-3 py-2 font-medium">Profile</th>
                              <th className="px-3 py-2 font-medium">Visit type</th>
                              <th className="px-3 py-2 font-medium">Billing</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedInvoicePackage?.usageLines || []).map((line) => (
                              <tr key={line.id} className="border-t">
                                <td className="px-3 py-2 font-medium">
                                  {line.patientName}
                                </td>
                                <td className="px-3 py-2">
                                  {getProfileLabel(line.profile)}
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
                                      ? 'Allowance'
                                      : 'Overage'}
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
                    <p className="text-sm font-semibold">Collections</p>
                    {(selectedInvoicePackage?.collections || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No collection records yet.
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
