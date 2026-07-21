import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function PageHeader({ title, description, actions, className, onBack }) {
  const { t, i18n } = useTranslation();
  const BackIcon = i18n.language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 pb-4 md:flex-row md:items-start md:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
            aria-label={t('common.back')}
          >
            <BackIcon className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0 border-s-4 border-primary/70 ps-3">
          <h1 className="break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
