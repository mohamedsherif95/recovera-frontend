import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Activity, GitBranch, Shield } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/constants';

export default function ReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAny } = usePermissions();
  const canOpenBranchCenter = canAny([
    PERMISSIONS['branches:view'],
    PERMISSIONS['branchCredits:view'],
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('reports.title')} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer transition hover:shadow-md"
          onClick={() => navigate('/reports/activity-log')}
        >
          <CardHeader className="flex items-center gap-2 space-y-0">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">
              {t('reports.activityLogTitle', { defaultValue: 'Activity log' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t('reports.activityLogDescription', {
              defaultValue: 'View a chronological log of key actions taken in the system.',
            })}
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition hover:shadow-md border-primary/20 bg-primary/5"
          onClick={() => navigate('/reports/system-logs')}
        >
          <CardHeader className="flex items-center gap-2 space-y-0">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {t('reports.systemLogsTitle', { defaultValue: 'System logs' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t('reports.systemLogsDescription', {
              defaultValue: 'Comprehensive tracking of all system actions, changes, and user activities.',
            })}
          </CardContent>
        </Card>

        {canOpenBranchCenter && (
          <Card
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => navigate('/branches')}
          >
            <CardHeader className="flex items-center gap-2 space-y-0">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">
                {t('nav.branches', { defaultValue: 'Branches' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t('branches.reportCardDescription', {
                defaultValue:
                  'Review branch setup and reconcile cross-branch balance credits.',
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
