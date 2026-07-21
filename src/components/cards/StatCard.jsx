import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { STAT_TONE_CLASSES } from '@/lib/visualTokens';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  className,
  onClick,
  tone = 'neutral',
}) {
  const isPositiveTrend = trend === 'up';
  const isClickable = typeof onClick === 'function';
  const toneClasses = STAT_TONE_CLASSES[tone] || STAT_TONE_CLASSES.neutral;

  const handleKeyDown = (event) => {
    if (!isClickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
        toneClasses.card,
        isClickable && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1', toneClasses.rail)} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', toneClasses.icon)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || description) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {trend && (
              <span
                className={cn(
                  'flex items-center gap-1',
                  isPositiveTrend ? 'text-success' : 'text-destructive'
                )}
              >
                {isPositiveTrend ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trendValue}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
