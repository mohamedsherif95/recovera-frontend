import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LocalizedDatePicker } from '@/components/common/LocalizedDatePicker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useSessions, useSession } from '@/hooks/useSessions';
import { useCreatePayment } from '@/hooks/usePayments';
import { useBranchAccessState } from '@/hooks/useBranchAccessState';
import { CLINIC_PROFILES } from '@/lib/constants';
import { getClinicProfileLabel } from '@/lib/clinicProfiles';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    isReadOnlyBranch,
    readOnlyTitle,
    readOnlyTitleKey,
    readOnlyDescription,
    readOnlyDescriptionKey,
  } = useBranchAccessState();
  const readOnlyTooltip = t(readOnlyTitleKey, { defaultValue: readOnlyTitle });
  const readOnlyHelper = t(readOnlyDescriptionKey, {
    defaultValue: readOnlyDescription,
  });

  const preselectedSessionId = searchParams.get('sessionId');
  const preselectedAmount = searchParams.get('amount');
  const isSessionLocked = !!preselectedSessionId;

  const { data: sessionsData, isLoading: isSessionsLoading } = useSessions({ page: 1, limit: 50 });
  const { data: specificSession, isLoading: isSpecificSessionLoading } = useSession(preselectedSessionId, {
    enabled: isSessionLocked,
  });
  const createPayment = useCreatePayment();

  const [sessionId, setSessionId] = useState(preselectedSessionId || '');
  const [amount, setAmount] = useState(preselectedAmount || '');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (preselectedSessionId) {
      setSessionId(preselectedSessionId);
    }
    if (preselectedAmount) {
      setAmount(preselectedAmount);
    }
  }, [preselectedSessionId, preselectedAmount]);

  const sessions = useMemo(() => {
    const data = sessionsData;
    let list = [];
    if (!data) list = [];
    else if (Array.isArray(data)) list = data;
    else if (Array.isArray(data?.data)) list = data.data;
    else if (Array.isArray(data?.sessions)) list = data.sessions;

    // If we have a specific session that's not in the list, add it
    if (specificSession && !list.some(s => String(s.id) === String(specificSession.id))) {
      list = [specificSession, ...list];
    }

    return list;
  }, [sessionsData, specificSession]);

  const sessionOptions = useMemo(
    () =>
      sessions.map((s) => ({
        value: String(s.id),
        label: `${s.patient?.fullName || 'Unknown patient'} - ${
          s.sessionDate || t('sessions.date')
        } - ${getClinicProfileLabel(s.profile || CLINIC_PROFILES.PHYSIOTHERAPY, t)}`,
      })),
    [sessions, t]
  );

  const sessionSummary = useMemo(() => {
    if (!isSessionLocked || !specificSession) return null;
    const cost = Number(specificSession.cost ?? 0);
    const totalPaid =
      specificSession.payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
    const remaining = Math.max(cost - totalPaid, 0);
    return { cost, remaining };
  }, [isSessionLocked, specificSession]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isReadOnlyBranch || !sessionId || !amount || !paymentMethod) return;

    createPayment.mutate(
      {
        sessionId: Number(sessionId),
        amount: Number(amount),
        paymentMethod,
        referenceNumber: referenceNumber || undefined,
        paymentDate: paymentDate || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setAmount('');
          setReferenceNumber('');
          setPaymentDate('');
          setNotes('');
          navigate(-1);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('payments.title')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('payments.createPayment')}</CardTitle>
          {isReadOnlyBranch && (
            <p className="text-sm text-muted-foreground">{readOnlyHelper}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {isSessionLocked && (
              <div className="md:col-span-2 rounded-md border bg-muted/30 px-4 py-3 text-sm">
                {isSpecificSessionLoading ? (
                  <span className="text-muted-foreground">{t('common.loading')}</span>
                ) : sessionSummary ? (
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <span className="font-medium">
                        {t('payments.sessionCost', { defaultValue: 'Visit cost' })}:
                      </span>{' '}
                      {sessionSummary.cost}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t('payments.remaining', { defaultValue: 'Remaining' })}:
                      </span>{' '}
                      {sessionSummary.remaining}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">{t('messages.noDataFound')}</span>
                )}
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sessionId">{t('payments.session')}</Label>
              <Select
                value={sessionId}
                onValueChange={setSessionId}
                disabled={
                  isReadOnlyBranch ||
                  isSessionsLoading ||
                  createPayment.isPending ||
                  isSessionLocked
                }
              >
                <SelectTrigger id="sessionId">
                  <SelectValue
                    placeholder={t('payments.selectSessionPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sessionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{t('payments.amount')}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isReadOnlyBranch || createPayment.isPending}
                title={isReadOnlyBranch ? readOnlyTooltip : undefined}
                max={
                  preselectedAmount
                    ? Number(preselectedAmount)
                    : sessionSummary?.remaining
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">{t('payments.method')}</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={isReadOnlyBranch || createPayment.isPending}
              >
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('payments.cash')}</SelectItem>
                  <SelectItem value="instapay">{t('payments.instapay')}</SelectItem>
                  <SelectItem value="eWallet">{t('payments.eWallet')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">{t('payments.paymentDate')}</Label>
              <LocalizedDatePicker
                id="paymentDate"
                value={paymentDate}
                onChange={setPaymentDate}
                disabled={isReadOnlyBranch || createPayment.isPending}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="referenceNumber">{t('payments.referenceNumber')}</Label>
              <Input
                id="referenceNumber"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={isReadOnlyBranch || createPayment.isPending}
                title={isReadOnlyBranch ? readOnlyTooltip : undefined}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">{t('sessions.notes')}</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isReadOnlyBranch || createPayment.isPending}
                title={isReadOnlyBranch ? readOnlyTooltip : undefined}
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={
                  isReadOnlyBranch ||
                  createPayment.isPending ||
                  !sessionId ||
                  !amount
                }
                title={isReadOnlyBranch ? readOnlyTooltip : undefined}
              >
                {createPayment.isPending ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
