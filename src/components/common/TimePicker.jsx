import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple, user-friendly time picker based on a dropdown list of times.
// Works with 24h "HH:mm" string values but displays localized labels.
export function TimePicker({
  id,
  value,
  onChange,
  disabled,
  className,
  placeholder,
  stepMinutes = 15,
  startHour = 8,
  endHour = 22,
}) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const options = useMemo(() => {
    const items = [];
    for (let hour = startHour; hour <= endHour; hour += 1) {
      const minuteValues = hour === 24 ? [0] : [];

      for (let minute = 0; hour !== 24 && minute < 60; minute += stepMinutes) {
        minuteValues.push(minute);
      }

      for (const minute of minuteValues) {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        const raw = `${h}:${m}`;
        const normalizedHour = hour === 24 ? 0 : hour;
        const labelHour = normalizedHour % 12 || 12;
        const suffix = normalizedHour >= 12 ? 'PM' : 'AM';
        const label = `${labelHour}:${m} ${suffix}`;
        items.push({ value: raw, label });
      }
    }
    return items;
  }, [startHour, endHour, stepMinutes]);

  const selectedOption = options.find((opt) => opt.value === value);

  const displayLabel = selectedOption?.label || placeholder || '';

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block w-full', className)}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
        )}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        <span
          className={cn(
            'truncate',
            isRtl ? 'text-right' : 'text-left',
            !selectedOption && 'text-muted-foreground'
          )}
        >
          {displayLabel || '\u00A0'}
        </span>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-sm',
            isRtl ? 'right-0' : 'left-0'
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1 text-xs',
                'hover:bg-accent hover:text-accent-foreground',
                opt.value === value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => {
                onChange?.(opt.value);
                setOpen(false);
              }}
            >
              <span>{opt.label}</span>
              <span className="font-mono text-[11px] opacity-70">{opt.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
