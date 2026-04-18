import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActionLog } from '@/hooks/useActionLogs';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Badge } from '@/components/ui/badge';

export default function ActionLogDetailsModal({ id, open, onOpenChange }) {
  const { t } = useTranslation();
  const { data: log, isLoading } = useActionLog(id);

  const renderJson = (data) => {
    if (!data) return <span className="text-muted-foreground italic">None</span>;
    return (
      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-60 mt-2">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('reports.logs.detailTitle', { defaultValue: 'Action log details' })} #{id}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : log ? (
          <div className="flex-1 pr-4 overflow-y-auto">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('reports.columns.time')}</h4>
                  <p className="text-sm">{log.createdAt ? format(new Date(log.createdAt), 'PPpp') : '--'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('reports.columns.user')}</h4>
                  <p className="text-sm">{log.user?.fullName || '--'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('reports.columns.action')}</h4>
                  <Badge variant={log.status === 'error' ? 'destructive' : 'outline'} className="mt-1">
                    {log.actionType}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('reports.columns.module')}</h4>
                  <p className="text-sm capitalize">{log.module || '--'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{t('reports.columns.description', { defaultValue: 'Description' })}</h4>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{log.description || '--'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('reports.columns.status', { defaultValue: 'Status' })}</h4>
                  <p className="text-sm uppercase font-semibold">{log.status}</p>
                </div>
              </div>


              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{t('reports.columns.payload', { defaultValue: 'Request payload' })}</h4>
                {renderJson(log.payload)}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{t('reports.columns.changes', { defaultValue: 'Changes/Response data' })}</h4>
                {renderJson(log.changes)}
              </div>

              {log.errorMessage && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive">{t('reports.columns.errorMessage', { defaultValue: 'Error message' })}</h4>
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 font-mono">
                    {log.errorMessage}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            {t('common.errorLoadingData', { defaultValue: 'Error loading details' })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
