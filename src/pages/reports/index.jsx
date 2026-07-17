import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Banknote,
  ClipboardList,
  GitBranch,
  ReceiptText,
  Shield,
  Stethoscope,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/constants';

export default function ReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAny } = usePermissions();
  const canOpenMoneyReports = canAny([
    PERMISSIONS['payments:viewAll'],
    PERMISSIONS['payments:viewReports'],
  ]);
  const canOpenProviderReports = canAny([PERMISSIONS['reports:view']]);
  const canOpenBranchCenter = canAny([
    PERMISSIONS['branches:view'],
    PERMISSIONS['branchCredits:view'],
  ]);
  const canOpenExpenseReports = canAny([PERMISSIONS['expenses:view']]);
  const financialWorkbenchCount =
    (canOpenMoneyReports ? 2 : 0) + (canOpenExpenseReports ? 1 : 0);

  const reportCards = [
    ...(canOpenMoneyReports
      ? [
          {
            key: 'income',
            icon: Banknote,
            title: t('reports.incomeWorkbenchTitle', {
              defaultValue: 'Income and payments',
            }),
            description: t('reports.incomeWorkbenchDescription', {
              defaultValue:
                'Review collected payments, unpaid visits, patient statements, and daily income focus.',
            }),
            to: '/patient-payments',
            tone: 'primary',
          },
          {
            key: 'balances',
            icon: Wallet,
            title: t('reports.patientBalancesTitle', {
              defaultValue: 'Patient unused balances',
            }),
            description: t('reports.patientBalancesDescription', {
              defaultValue:
                'Find patients with positive balance and open their balance history.',
            }),
            to: '/patient-payments/balances',
          },
        ]
      : []),
    ...(canOpenExpenseReports
      ? [
          {
            key: 'expenses',
            icon: ReceiptText,
            title: t('branchExpenses.title', {
              defaultValue: 'Branch expenses',
            }),
            description: t('branchExpenses.reportCardDescription', {
              defaultValue:
                'Record branch operating expenses, categories, voided corrections, and spend analysis.',
            }),
            to: '/branch-expenses',
          },
        ]
      : []),
    ...(canOpenProviderReports
      ? [
          {
            key: 'providers',
            icon: Stethoscope,
            title: t('reports.providerVisitsTitle', {
              defaultValue: 'Doctor visits',
            }),
            description: t('reports.providerVisitsDescription', {
              defaultValue:
                'Inspect doctor schedules, visit status, timing, and revenue context.',
            }),
            to: '/doctors',
          },
        ]
      : []),
    {
      key: 'activity',
      icon: Activity,
      title: t('reports.activityLogTitle', { defaultValue: 'Activity log' }),
      description: t('reports.activityLogDescription', {
        defaultValue: 'View a chronological log of key actions taken in the system.',
      }),
      to: '/reports/activity-log',
    },
    {
      key: 'system',
      icon: Shield,
      title: t('reports.systemLogsTitle', { defaultValue: 'System logs' }),
      description: t('reports.systemLogsDescription', {
        defaultValue:
          'Comprehensive tracking of all system actions, changes, and user activities.',
      }),
      to: '/reports/system-logs',
      tone: 'primary',
    },
    ...(canOpenBranchCenter
      ? [
          {
            key: 'branches',
            icon: GitBranch,
            title: t('nav.branches', { defaultValue: 'Branches' }),
            description: t('branches.reportCardDescription', {
              defaultValue:
                'Review branch setup and reconcile cross-branch balance credits.',
            }),
            to: '/branches',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.commandCenterDescription', {
          defaultValue:
            'Operational, financial, and audit views for managers who need to investigate what happened and what needs action.',
        })}
      />

      <ImpactPanel
        icon={ClipboardList}
        title={t('reports.commandCenterTitle', {
          defaultValue: 'Reports command center',
        })}
        description={t('reports.commandCenterSummary', {
          defaultValue:
            'Start with the report that matches the operational question: money, patient balances, doctor work, audit trail, or branch reconciliation.',
        })}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <ImpactMetric
            label={t('reports.availableReports', {
              defaultValue: 'Available reports',
            })}
            value={reportCards.length}
          />
          <ImpactMetric
            label={t('reports.financialReports', {
              defaultValue: 'Financial workbenches',
            })}
            value={financialWorkbenchCount}
          />
          <ImpactMetric
            label={t('reports.auditReports', { defaultValue: 'Audit reports' })}
            value={2}
          />
        </div>
      </ImpactPanel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportCards.map((report) => {
          const Icon = report.icon;
          const highlighted = report.tone === 'primary';
          const openReport = () => navigate(report.to);

          return (
            <Card
              key={report.key}
              role="button"
              tabIndex={0}
              className={`cursor-pointer transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                highlighted ? 'border-primary/20 bg-primary/5' : ''
              }`}
              onClick={openReport}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openReport();
                }
              }}
            >
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <Icon
                  className={`h-5 w-5 ${
                    highlighted ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <CardTitle className="text-base leading-snug">
                  {report.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {report.description}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
