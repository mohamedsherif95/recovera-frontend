import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AsyncSearchableSelect } from '@/components/common/AsyncSearchableSelect';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import DateRangePicker from '@/components/common/DateRangePicker';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePatientLookupOptions } from '@/hooks/useLookupOptions';
import {
  useCreateStatementInvoice,
  useInvoice,
  useInvoices,
  useVoidInvoice,
} from '@/hooks/useInvoices';
import { downloadInvoicePdf } from '@/lib/invoices/pdf';
import { PERMISSIONS, USER_ROLES } from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

const PAGE_SIZE = 10;

const toDateOnlyString = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnlyString = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getStatusBadgeClass = (status) => {
  if (status === 'void') {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
  }

  return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
};

export default function InvoicesPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { can, currentUser } = usePermissions();

  const canViewInvoices = can(PERMISSIONS['invoices:view']);
  const canCreateInvoices = can(PERMISSIONS['invoices:create']);
  const canVoidInvoices = can(PERMISSIONS['invoices:void']);
  const isDoctorOnly = useMemo(() => {
    const roles = currentUser?.roles?.map((role) => role?.name?.toLowerCase()) || [];
    return roles.length > 0 && roles.every((role) => role === USER_ROLES.DOCTOR);
  }, [currentUser]);

  const today = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );
  const currentMonthEnd = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + 1, 0),
    [today],
  );

  const [selectedPatientId, setSelectedPatientId] = useState(
    () => searchParams.get('patientId') || '',
  );
  const [fromDate, setFromDate] = useState(
    () =>
      parseDateOnlyString(searchParams.get('fromDate') || searchParams.get('from')) ||
      currentMonthStart,
  );
  const [toDate, setToDate] = useState(
    () =>
      parseDateOnlyString(searchParams.get('toDate') || searchParams.get('to')) ||
      currentMonthEnd,
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => searchParams.get('invoiceNumber') || '',
  );
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get('status') || 'all',
  );
  const [typeFilter, setTypeFilter] = useState(
    () => searchParams.get('invoiceType') || 'all',
  );
  const [page, setPage] = useState(1);

  const [statementPatientId, setStatementPatientId] = useState(
    () => searchParams.get('patientId') || '',
  );
  const [statementFromDate, setStatementFromDate] = useState(
    () =>
      parseDateOnlyString(searchParams.get('fromDate') || searchParams.get('from')) ||
      currentMonthStart,
  );
  const [statementToDate, setStatementToDate] = useState(
    () =>
      parseDateOnlyString(searchParams.get('toDate') || searchParams.get('to')) ||
      currentMonthEnd,
  );

  const [detailsInvoiceId, setDetailsInvoiceId] = useState(null);
  const [pendingVoidInvoice, setPendingVoidInvoice] = useState(null);

  const patientLookup = usePatientLookupOptions({
    enabled: canViewInvoices,
  });
  const patientOptions = useMemo(() => {
    return patientLookup.records.map((patient) => ({
      value: String(patient.id),
      label: `${patient.fullName || t('patients.patient', { defaultValue: 'Patient' })} - #${
        patient.patientCode || patient.id
      }`,
    }));
  }, [patientLookup.records, t]);

  const selectedPatientOption = useMemo(() => {
    if (!selectedPatientId) return undefined;
    const selected = patientOptions.find(
      (option) => option.value === String(selectedPatientId),
    );
    if (selected) return selected;

    return {
      value: String(selectedPatientId),
      label: `#${selectedPatientId}`,
    };
  }, [patientOptions, selectedPatientId]);

  const statementPatientOption = useMemo(() => {
    if (!statementPatientId) return undefined;
    const selected = patientOptions.find(
      (option) => option.value === String(statementPatientId),
    );
    if (selected) return selected;

    return {
      value: String(statementPatientId),
      label: `#${statementPatientId}`,
    };
  }, [patientOptions, statementPatientId]);

  const invoiceFilters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      patientId: selectedPatientId ? Number(selectedPatientId) : undefined,
      fromDate: fromDate ? toDateOnlyString(fromDate) : undefined,
      toDate: toDate ? toDateOnlyString(toDate) : undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      invoiceType: typeFilter === 'all' ? undefined : typeFilter,
      invoiceNumber: invoiceNumber.trim() || undefined,
    }),
    [page, selectedPatientId, fromDate, toDate, statusFilter, typeFilter, invoiceNumber],
  );

  const {
    data: invoicesData,
    isLoading: isInvoicesLoading,
    isFetching: isInvoicesFetching,
    refetch: refetchInvoices,
  } = useInvoices(invoiceFilters, { enabled: canViewInvoices && !isDoctorOnly });
  const createStatementInvoice = useCreateStatementInvoice();
  const voidInvoice = useVoidInvoice();

  const { data: detailsInvoice, isLoading: isDetailsLoading } = useInvoice(
    detailsInvoiceId,
    {
      enabled: Boolean(detailsInvoiceId),
    },
  );

  const invoices = useMemo(() => {
    if (!invoicesData) return [];
    if (Array.isArray(invoicesData?.data)) return invoicesData.data;
    if (Array.isArray(invoicesData)) return invoicesData;
    return [];
  }, [invoicesData]);

  const selectedInvoice =
    detailsInvoice ||
    invoices.find((invoice) => Number(invoice.id) === Number(detailsInvoiceId)) ||
    null;

  const totalPages = Math.max(invoicesData?.meta?.totalPages || 1, 1);

  const handleDownloadPdf = (invoice) => {
    if (!invoice) return;
    downloadInvoicePdf(invoice);
  };

  const handleCreateStatementInvoice = () => {
    if (!statementPatientId) {
      toast.error(
        t('reports.filterByPatient', {
          defaultValue: 'Please select a patient first.',
        }),
      );
      return;
    }

    createStatementInvoice.mutate(
      {
        patientId: Number(statementPatientId),
        fromDate: statementFromDate ? toDateOnlyString(statementFromDate) : undefined,
        toDate: statementToDate ? toDateOnlyString(statementToDate) : undefined,
      },
      {
        onSuccess: (invoice) => {
          setDetailsInvoiceId(invoice.id);
          downloadInvoicePdf(invoice);
          refetchInvoices();
        },
      },
    );
  };

  const handleVoidInvoice = () => {
    if (!pendingVoidInvoice) return;
    voidInvoice.mutate(
      {
        invoiceId: pendingVoidInvoice.id,
        data: {},
      },
      {
        onSuccess: () => {
          setPendingVoidInvoice(null);
        },
        onError: () => {
          setPendingVoidInvoice(null);
        },
      },
    );
  };

  if (!canViewInvoices || isDoctorOnly) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.invoices', { defaultValue: 'Invoices' })}
        description={t('reports.invoicesDescription', {
          defaultValue:
            'Generate, review, and print transaction or statement invoices.',
        })}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchInvoices()}
            disabled={isInvoicesFetching}
          >
            {isInvoicesFetching ? t('common.loading') : t('common.refresh')}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {t('reports.filters', { defaultValue: 'Filters' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {t('patients.patient', { defaultValue: 'Patient' })}
              </div>
              <AsyncSearchableSelect
                options={[
                  {
                    value: 'all',
                    label: t('common.all', { defaultValue: 'All patients' }),
                  },
                  ...patientOptions,
                ]}
                value={selectedPatientId || 'all'}
                onChange={(value) => {
                  setSelectedPatientId(value === 'all' ? '' : value);
                  setPage(1);
                }}
                onSearchChange={patientLookup.setSearch}
                hasMore={patientLookup.hasNextPage}
                onLoadMore={patientLookup.fetchNextPage}
                isLoading={patientLookup.isLoading}
                isLoadingMore={patientLookup.isFetchingNextPage}
                isError={patientLookup.isError}
                selectedOption={selectedPatientOption}
                placeholder={t('common.all', { defaultValue: 'All patients' })}
                searchPlaceholder={t('sessions.filters.searchPlaceholder')}
              />
            </div>

            <div className="space-y-1 xl:col-span-2">
              <div className="text-xs text-muted-foreground">
                {t('reports.dateRange', { defaultValue: 'Date range' })}
              </div>
              <DateRangePicker
                fromDate={fromDate}
                toDate={toDate}
                onChange={(from, to) => {
                  setFromDate(from);
                  setToDate(to);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {t('reports.invoiceType', { defaultValue: 'Invoice type' })}
              </div>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', { defaultValue: 'All' })}</SelectItem>
                  <SelectItem value="transaction">
                    {t('reports.transactionInvoice', { defaultValue: 'Transaction' })}
                  </SelectItem>
                  <SelectItem value="statement">
                    {t('reports.statementInvoice', { defaultValue: 'Statement' })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {t('reports.status', { defaultValue: 'Status' })}
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', { defaultValue: 'All' })}</SelectItem>
                  <SelectItem value="active">
                    {t('status.active', { defaultValue: 'Active' })}
                  </SelectItem>
                  <SelectItem value="void">
                    {t('reports.voided', { defaultValue: 'Void' })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {t('reports.invoiceNumber', { defaultValue: 'Invoice number' })}
              </div>
              <Input
                value={invoiceNumber}
                onChange={(event) => {
                  setInvoiceNumber(event.target.value);
                  setPage(1);
                }}
                placeholder={t('reports.searchInvoiceNumber', {
                  defaultValue: 'Search invoice number...',
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {canCreateInvoices && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('reports.statementGenerator', {
                defaultValue: 'Statement Invoice Generator',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2">
                <div className="text-xs text-muted-foreground">
                  {t('patients.patient', { defaultValue: 'Patient' })}
                </div>
                <AsyncSearchableSelect
                  options={patientOptions}
                  value={statementPatientId || ''}
                  onChange={(value) => setStatementPatientId(value || '')}
                  onSearchChange={patientLookup.setSearch}
                  hasMore={patientLookup.hasNextPage}
                  onLoadMore={patientLookup.fetchNextPage}
                  isLoading={patientLookup.isLoading}
                  isLoadingMore={patientLookup.isFetchingNextPage}
                  isError={patientLookup.isError}
                  selectedOption={statementPatientOption}
                  placeholder={t('reports.filterByPatient')}
                  searchPlaceholder={t('sessions.filters.searchPlaceholder')}
                />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <div className="text-xs text-muted-foreground">
                  {t('reports.dateRange', { defaultValue: 'Date range' })}
                </div>
                <DateRangePicker
                  fromDate={statementFromDate}
                  toDate={statementToDate}
                  onChange={(from, to) => {
                    setStatementFromDate(from);
                    setStatementToDate(to);
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleCreateStatementInvoice}
                disabled={createStatementInvoice.isPending || !statementPatientId}
              >
                {createStatementInvoice.isPending
                  ? t('common.loading')
                  : t('reports.createStatementInvoice', {
                      defaultValue: 'Create statement invoice',
                    })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {t('nav.invoices', { defaultValue: 'Invoices' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isInvoicesLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('reports.noInvoicesFound', {
                defaultValue: 'No invoices found for the selected filters.',
              })}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">
                        {t('reports.invoiceNumber', { defaultValue: 'Invoice #' })}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t('patients.patient', { defaultValue: 'Patient' })}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t('reports.invoiceType', { defaultValue: 'Type' })}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t('reports.status', { defaultValue: 'Status' })}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t('payments.paymentDate', { defaultValue: 'Issued at' })}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t('payments.amount', { defaultValue: 'Total' })}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t('common.actions', { defaultValue: 'Actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-medium">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-3 py-2">
                          <div>{invoice.patient?.fullName || '--'}</div>
                          <div className="text-xs text-muted-foreground">
                            {invoice.patient?.patientCode
                              ? `#${invoice.patient.patientCode}`
                              : '--'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {invoice.invoiceType === 'statement'
                            ? t('reports.statementInvoice', { defaultValue: 'Statement' })
                            : t('reports.transactionInvoice', {
                                defaultValue: 'Transaction',
                              })}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={getStatusBadgeClass(invoice.status)}>
                            {invoice.status === 'void'
                              ? t('reports.voided', { defaultValue: 'Void' })
                              : t('status.active', { defaultValue: 'Active' })}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {invoice.issuedAt ? formatDateTime(invoice.issuedAt, 'PP p') : '--'}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(invoice.totalAmount || 0)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetailsInvoiceId(invoice.id)}
                            >
                              {t('common.view', { defaultValue: 'View' })}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPdf(invoice)}
                            >
                              {t('common.download', { defaultValue: 'Download' })}
                            </Button>
                            {canVoidInvoices && invoice.status !== 'void' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setPendingVoidInvoice(invoice)}
                              >
                                {t('reports.voidInvoice', {
                                  defaultValue: 'Void',
                                })}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  {t('common.paginationSummary', {
                    from: invoices.length ? (page - 1) * PAGE_SIZE + 1 : 0,
                    to: (page - 1) * PAGE_SIZE + invoices.length,
                    total: invoicesData?.meta?.total || invoices.length,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    {t('common.previous')}
                  </Button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages || 1, prev + 1))
                    }
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(detailsInvoiceId)}
        onOpenChange={(open) => {
          if (!open) setDetailsInvoiceId(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice?.invoiceNumber ||
                t('reports.invoiceDetails', { defaultValue: 'Invoice details' })}
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice?.issuedAt
                ? formatDateTime(selectedInvoice.issuedAt, 'PP p')
                : '--'}
            </DialogDescription>
          </DialogHeader>

          {isDetailsLoading && !selectedInvoice ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : selectedInvoice ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {t('patients.patient', { defaultValue: 'Patient' })}
                  </div>
                  <div className="font-medium">
                    {selectedInvoice.patient?.fullName || '--'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedInvoice.patient?.patientCode
                      ? `#${selectedInvoice.patient.patientCode}`
                      : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    {t('payments.amount', { defaultValue: 'Total' })}
                  </div>
                  <div className="font-medium">
                    {formatCurrency(selectedInvoice.totalAmount || 0)}
                  </div>
                </div>
              </div>

              {Array.isArray(selectedInvoice?.snapshot?.lineItems) &&
                selectedInvoice.snapshot.lineItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium">
                      {t('reports.invoiceLines', { defaultValue: 'Line items' })}
                    </div>
                    <div className="space-y-2">
                      {selectedInvoice.snapshot.lineItems.map((lineItem, index) => (
                        <div key={`${lineItem.sourceType}-${lineItem.sourceId}-${index}`} className="rounded-md border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">
                              {lineItem?.title?.en || lineItem?.title?.ar || '--'}
                            </div>
                            <div>{formatCurrency(lineItem?.amount || 0)}</div>
                          </div>
                          {(lineItem?.details?.en || lineItem?.details?.ar) && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {lineItem?.details?.en || lineItem?.details?.ar}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {lineItem?.date
                              ? formatDateTime(lineItem.date, 'PP p')
                              : '--'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPdf(selectedInvoice)}
                >
                  {t('common.download', { defaultValue: 'Download PDF' })}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-4 text-sm text-muted-foreground">
              {t('messages.noDataFound')}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingVoidInvoice)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingVoidInvoice(null);
          }
        }}
        title={t('reports.voidInvoice', { defaultValue: 'Void invoice' })}
        description={t('reports.voidInvoiceDescription', {
          defaultValue:
            'This invoice will be marked as void and kept for audit history.',
        })}
        confirmText={t('reports.voidInvoice', { defaultValue: 'Void' })}
        isLoading={voidInvoice.isPending}
        onConfirm={handleVoidInvoice}
      />
    </div>
  );
}
