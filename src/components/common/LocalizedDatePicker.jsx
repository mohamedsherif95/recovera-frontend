import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  addDays,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dateOnlyToDate, getClinicTodayDateOnly } from '@/lib/time';

// Reusable, localized date picker that works with ISO date strings (YYYY-MM-DD)
// value: string | '' | null
// onChange: (isoString) => void
export function LocalizedDatePicker({
  id,
  value,
  onChange,
  disabled,
  className,
  placeholder,
}) {
  const { i18n } = useTranslation();

  const locale = useMemo(() => {
    if (i18n.language === 'ar') return arSA;
    return enUS;
  }, [i18n.language]);

  const isRtl = i18n.language === 'ar';

  const selectedDate = useMemo(() => {
    if (!value) return null;
    return dateOnlyToDate(value);
  }, [value]);

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(
    () => selectedDate || dateOnlyToDate(getClinicTodayDateOnly()),
  );

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale });
  const calendarEnd = endOfWeek(monthEnd, { locale });

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDayLabels = useMemo(() => {
    const start = startOfWeek(dateOnlyToDate(getClinicTodayDateOnly()), { locale });
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = addDays(start, idx);
      return format(d, 'EE', { locale });
    });
  }, [locale]);

  const handleSelectDate = (date) => {
    if (disabled) return;

    if (selectedDate && isSameDay(date, selectedDate)) {
      onChange?.('');
    } else {
      const iso = format(date, 'yyyy-MM-dd');
      onChange?.(iso);
    }

    setOpen(false);
  };

  const displayLabel = selectedDate
    ? format(selectedDate, 'PP', { locale })
    : placeholder || '';

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
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm',
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
            !selectedDate && 'text-muted-foreground'
          )}
        >
          {displayLabel || '\u00A0'}
        </span>
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 w-[260px] rounded-md border bg-popover p-3 shadow-sm',
            isRtl ? 'right-0' : 'left-0',
            'animate-in fade-in-0 zoom-in-95'
          )}
        >
        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
            disabled={disabled}
          >
            {isRtl ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
          <div className="flex-1 text-center text-xs font-medium">
            {format(monthStart, 'MMMM yyyy', { locale })}
          </div>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            disabled={disabled}
          >
            {isRtl ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground">
          {weekDayLabels.map((label, idx) => (
            <div key={idx} className="flex items-center justify-center py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 text-xs">
          {days.map((dateObj) => {
            const inMonth = isSameMonth(dateObj, monthStart);
            const isSelected = selectedDate && isSameDay(dateObj, selectedDate);
            const isToday = isSameDay(
              dateObj,
              dateOnlyToDate(getClinicTodayDateOnly()),
            );

            return (
              <button
                key={dateObj.toISOString()}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectDate(dateObj)}
                className={cn(
                  'h-8 w-8 rounded-md flex items-center justify-center',
                  'transition-colors',
                  !inMonth && 'text-muted-foreground/50',
                  inMonth && !isSelected && 'hover:bg-accent hover:text-accent-foreground',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  !isSelected && isToday && 'border border-primary/70'
                )}
              >
                {format(dateObj, 'd', { locale })}
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
