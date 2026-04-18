import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Shield, Search, Filter, Eye, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useActionLogs } from '@/hooks/useActionLogs';
import ActionLogDetailsModal from '@/components/reports/ActionLogDetailsModal';
import { Badge } from '@/components/ui/badge';

export default function SystemLogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryParams = useMemo(() => ({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
  }), [page, pageSize, search, status]);

  const {
    data: logsData,
    isLoading,
  } = useActionLogs(queryParams);

  const logs = logsData?.data ?? [];
  const totalItems = logsData?.meta?.total ?? 0;
  const totalPages = logsData?.meta?.totalPages ?? 1;

  const handleRowClick = (id) => {
    setSelectedLogId(id);
    setIsModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('reports.systemLogsTitle', { defaultValue: 'System Logs' })} 
        description={t('reports.systemLogsDesc', { defaultValue: 'Monitor all system actions and user activities' })}
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('reports.logs.tableTitle', { defaultValue: 'Action History' })}</CardTitle>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search', { defaultValue: 'Search logs...' })}
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t('common.allStatuses', { defaultValue: 'All Statuses' })}</option>
                <option value="success">{t('common.success', { defaultValue: 'Success' })}</option>
                <option value="error">{t('common.error', { defaultValue: 'Error' })}</option>
              </select>

              {(search || status) && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9">
                  <X className="h-4 w-4 mr-1" />
                  {t('common.clear', { defaultValue: 'Clear' })}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : logs.length ? (
            <>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground font-semibold">
                      <th className="px-4 py-3">{t('reports.columns.time')}</th>
                      <th className="px-4 py-3">{t('reports.columns.user')}</th>
                      <th className="px-4 py-3">{t('reports.columns.action')}</th>
                      <th className="px-4 py-3">{t('reports.columns.module')}</th>
                      <th className="px-4 py-3">{t('reports.columns.target', { defaultValue: 'Target' })}</th>
                      <th className="px-4 py-3">{t('reports.columns.status')}</th>
                      <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(log.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm:ss') : '--'}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {log.user?.fullName || '--'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-secondary">
                            {log.actionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">
                          {log.module || '--'}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={log.description}>
                          {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}` : '--'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={log.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                            {log.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  {t('common.paginationSummary', {
                    from: logs.length ? (page - 1) * pageSize + 1 : 0,
                    to: (page - 1) * pageSize + logs.length,
                    total: totalItems,
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
                  <span className="px-2">
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
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-md border-dashed">
              <Filter className="h-10 w-10 mb-2 opacity-20" />
              <p>{t('reports.logs.noResults', { defaultValue: 'No logs found matching your criteria.' })}</p>
              {(search || status) && (
                <Button variant="link" onClick={handleClearFilters}>
                  {t('common.clearFilters', { defaultValue: 'Clear all filters' })}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ActionLogDetailsModal 
        id={selectedLogId} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  );
}
