import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';

export function StatBox({ label, value, children, className, blackAndWhiteText = false }) {
  const { theme } = useTheme();
  const textColorClass = blackAndWhiteText
    ? theme === 'dark'
      ? 'text-white'
      : 'text-black'
    : 'text-primary';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl border bg-gradient-to-br from-primary/10 via-secondary/10 to-background shadow-sm px-4 py-6',
        'transition-colors',
        className
      )}
    >
      <div className="absolute left-3 top-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'text-xl font-semibold flex items-center justify-center w-full',
          textColorClass,
        )}
      >
        {children ?? value}
      </div>
    </div>
  );
}
