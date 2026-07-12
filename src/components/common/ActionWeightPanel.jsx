import { cn } from '@/lib/utils';

const actionWeightToneClasses = {
  neutral: {
    container: 'border-border bg-muted/20',
    icon: 'bg-background text-muted-foreground',
    item: 'border-border bg-background/80',
    marker: 'bg-muted-foreground/30',
    value: 'text-foreground',
  },
  commercial: {
    container:
      'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
    item:
      'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20',
    marker: 'bg-emerald-500 dark:bg-emerald-400',
    value: 'text-emerald-900 dark:text-emerald-100',
  },
  warning: {
    container:
      'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/25',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
    item:
      'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/25',
    marker: 'bg-amber-500 dark:bg-amber-400',
    value: 'text-amber-900 dark:text-amber-100',
  },
  danger: {
    container: 'border-destructive/30 bg-destructive/10',
    icon: 'bg-destructive/10 text-destructive',
    item: 'border-destructive/30 bg-destructive/10',
    marker: 'bg-destructive',
    value: 'text-destructive',
  },
};

function getToneClasses(tone) {
  return actionWeightToneClasses[tone] || actionWeightToneClasses.neutral;
}

export function ActionWeightPanel({
  children,
  className,
  description,
  icon: Icon,
  title,
  tone = 'neutral',
}) {
  const toneClass = getToneClasses(tone);

  return (
    <div className={cn('rounded-md border p-3 sm:p-4', toneClass.container, className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {Icon && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
              toneClass.icon,
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {description && (
            <p className={cn('text-sm text-muted-foreground', title && 'mt-1')}>
              {description}
            </p>
          )}
          {children && <div className="mt-3 grid gap-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function ActionWeightItem({
  className,
  helper,
  label,
  tone = 'neutral',
  value,
}) {
  const toneClass = getToneClasses(tone);

  return (
    <div className={cn('min-w-0 rounded-md border p-3', toneClass.item, className)}>
      <div className="flex items-start gap-2">
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', toneClass.marker)} />
        <div className="min-w-0 flex-1">
          {label && <div className="text-xs font-medium text-muted-foreground">{label}</div>}
          <div className={cn('mt-1 break-words text-sm font-semibold', toneClass.value)}>
            {value ?? '--'}
          </div>
          {helper && (
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {helper}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
