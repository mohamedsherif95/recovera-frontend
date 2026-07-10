import { Link } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  Receipt,
  ShieldCheck,
  Users,
  Workflow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/constants';

const modules = [
  {
    title: 'Clinics',
    description: 'Create clinic groups and provision their first admin users.',
    href: '/platform-admin/clinics',
    icon: Building2,
    permission: PERMISSIONS['clinics:viewAll'],
  },
  {
    title: 'Branches',
    description: 'Review branch setup and cross-branch reconciliation queues.',
    href: '/platform-admin/branches',
    icon: Workflow,
    permission: PERMISSIONS['branches:view'],
    requiresScope: true,
  },
  {
    title: 'Users',
    description: 'Provision managers and branch staff from the admin console.',
    href: '/platform-admin/users',
    icon: Users,
    permission: PERMISSIONS['users:viewAll'],
    requiresScope: true,
  },
  {
    title: 'Branch subscriptions',
    description: 'Control branch access, enabled clinic profiles, and pricing terms.',
    href: '/platform-admin/branch-subscriptions',
    icon: CreditCard,
    permission: PERMISSIONS['branchSubscriptions:view'],
    requiresScope: true,
  },
  {
    title: 'Platform billing',
    description: 'Generate branch invoices, download artifacts, and record collections.',
    href: '/platform-admin/billing',
    icon: Receipt,
    permission: PERMISSIONS['platformBilling:view'],
    requiresScope: true,
  },
];

export default function PlatformAdminPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const visibleModules = modules.filter((module) => can(module.permission));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {t('platformAdmin.modeLabel', { defaultValue: 'Platform mode' })}
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">
            {t('platformAdmin.overviewTitle', {
              defaultValue: 'Platform admin console',
            })}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t('platformAdmin.overviewDescription', {
              defaultValue:
                'Use this area for tenant setup, branch subscriptions, and billing operations without entering a clinic workspace.',
            })}
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {t('platformAdmin.isolatedBadge', { defaultValue: 'Isolated console' })}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} to={module.href} className="block">
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/40">
                <CardHeader className="space-y-3 pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{module.description}</p>
                  {module.requiresScope && (
                    <Badge variant="outline" className="text-[11px]">
                      {t('platformAdmin.scopeRequired', {
                        defaultValue: 'Uses admin scope',
                      })}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
