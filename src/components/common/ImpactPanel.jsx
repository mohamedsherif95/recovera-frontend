import { cn } from '@/lib/utils';

const impactToneClasses = {
  neutral: {
    container: 'border-border/80 bg-card/90',
    icon: 'bg-primary/10 text-primary',
  },
  info: {
    container:
      'border-sky-200 bg-sky-50/70 dark:border-sky-900/70 dark:bg-sky-950/20',
    icon: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  },
  commercial: {
    container:
      'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  },
  warning: {
    container:
      'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/25',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  },
  danger: {
    container: 'border-destructive/30 bg-destructive/10',
    icon: 'bg-destructive/10 text-destructive',
  },
};

export function ImpactPanel({
  children,
  className,
  description,
  icon: Icon,
  title,
  tone = 'neutral',
}) {
  const toneClass = impactToneClasses[tone] || impactToneClasses.neutral;

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
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function ImpactMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-md border bg-background/85 p-3 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold">{value ?? '--'}</div>
    </div>
  );
}
