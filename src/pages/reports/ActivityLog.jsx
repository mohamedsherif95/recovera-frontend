import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuditLogs } from '@/hooks/useAudit';

export default function ActivityLogReportPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const {
    data: auditData,
    isLoading: isAuditLoading,
  } = useAuditLogs({ page, limit: pageSize });

  const logs = auditData?.logs ?? [];
  const totalLogs = auditData?.total ?? logs.length;
  const totalPages = auditData?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader title={t('reports.activityLogTitle', { defaultValue: 'Activity log' })} />

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle>{t('dashboard.activityLog', { defaultValue: 'Activity log' })}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuditLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : logs.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t('reports.columns.time', { defaultValue: 'Time' })}</th>
                      <th className="px-3 py-2 font-medium">{t('reports.columns.user', { defaultValue: 'User' })}</th>
                      <th className="px-3 py-2 font-medium">{t('reports.columns.action', { defaultValue: 'Action' })}</th>
                      <th className="px-3 py-2 font-medium">{t('reports.columns.target', { defaultValue: 'Target' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {log.timestamp
                            ? format(new Date(log.timestamp), 'PPpp')
                            : '--'}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {log.actor?.name || log.userName || '--'}
                        </td>
                        <td className="px-3 py-2 text-xs uppercase text-muted-foreground">
                          {log.action || '--'}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {log.entity?.type || log.entityType || '--'}
                          {log.entity?.id || log.entityId
                            ? ` #${log.entity?.id ?? log.entityId}`
                            : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  {t('common.paginationSummary', {
                    from: logs.length ? (page - 1) * pageSize + 1 : 0,
                    to: (page - 1) * pageSize + logs.length,
                    total: totalLogs,
                  })}
                </span>
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
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t('dashboard.noActivity', { defaultValue: 'No activity yet.' })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
