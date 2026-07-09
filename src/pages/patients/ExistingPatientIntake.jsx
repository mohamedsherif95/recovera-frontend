import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchInput } from '@/components/common/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useAttachPatientToCurrentBranch,
  useCompanyPatientSearch,
} from '@/hooks/usePatients';

export function ExistingPatientIntake({ onCancel, onAttached }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [attachingPatientId, setAttachingPatientId] = useState(null);
  const debouncedSearch = useDebounce(search, 400);
  const canSearch = debouncedSearch.trim().length >= 2;
  const searchQuery = useCompanyPatientSearch(
    {
      search: debouncedSearch,
      page: 1,
      limit: 8,
    },
    {
      enabled: canSearch,
    },
  );
  const attachPatient = useAttachPatientToCurrentBranch();

  const patients = useMemo(() => {
    const data = searchQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.patients)) return data.patients;
    return [];
  }, [searchQuery.data]);

  const handleAttach = (patientId) => {
    setAttachingPatientId(patientId);
    attachPatient.mutate(patientId, {
      onSuccess: (patient) => {
        setAttachingPatientId(null);
        onAttached?.(patient);
      },
      onError: () => {
        setAttachingPatientId(null);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('patients.useExistingPatient')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('patients.existingPatientSearchPlaceholder')}
          className="max-w-none"
        />

        {!canSearch && (
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            {t('patients.existingPatientSearchHint')}
          </div>
        )}

        {canSearch && searchQuery.isLoading && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        )}

        {canSearch && searchQuery.isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {t('patients.existingPatientSearchError')}
          </div>
        )}

        {canSearch && !searchQuery.isLoading && !searchQuery.isError && patients.length === 0 && (
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            {t('patients.noExistingPatientMatches')}
          </div>
        )}

        {patients.length > 0 && (
          <div className="divide-y rounded-md border">
            {patients.map((patient) => {
              const isAttaching =
                attachPatient.isPending && attachingPatientId === patient.id;

              return (
                <div
                  key={patient.id}
                  className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{patient.patientCode || '--'}</Badge>
                      <span className="font-medium">{patient.fullName}</span>
                    </div>
                    <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                      <span>
                        {t('patients.phone')}: {patient.phone || '--'}
                      </span>
                      <span>
                        {t('patients.age')}: {patient.age != null ? patient.age : '--'}
                      </span>
                      <span className="sm:col-span-2">
                        {t('patients.primaryBranch')}:{' '}
                        {patient.primaryBranch?.name || '--'}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleAttach(patient.id)}
                    disabled={attachPatient.isPending}
                  >
                    {isAttaching ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    {t('patients.addToThisBranch')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={attachPatient.isPending}
        >
          {t('common.cancel')}
        </Button>
      </CardFooter>
    </Card>
  );
}
