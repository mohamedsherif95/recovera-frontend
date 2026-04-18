import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, ar } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from '@/lib/utils';

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const next = new Date(value);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const getStartOfToday = () => {
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  return next;
};

function DateRangePicker({ 
  fromDate, 
  toDate, 
  onChange,
  showPresets = true,
  className = '',
  placeholder = '' 
}) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => parseDateValue(fromDate));
  const [endDate, setEndDate] = useState(() => parseDateValue(toDate));
  const dropdownRef = useRef(null);

  const isRtl = i18n.language === 'ar';
  const locale = isRtl ? ar : enUS;

  // Presets for date ranges
  const presets = {
    today: {
      label: t('dateRange.today', { defaultValue: 'Today' }),
      fromDate: () => getStartOfToday(),
      toDate: () => getStartOfToday(),
    },
    yesterday: {
      label: t('dateRange.yesterday', { defaultValue: 'Yesterday' }),
      fromDate: () => {
        const yesterday = getStartOfToday();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
      },
      toDate: () => {
        const yesterday = getStartOfToday();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
      }
    },
    thisWeek: {
      label: t('dateRange.thisWeek', { defaultValue: 'This Week' }),
      fromDate: () => {
        const startOfWeek = getStartOfToday();
        const day = startOfWeek.getDay();
        // Convert to Saturday start (0=Sunday, 1=Monday, ..., 6=Saturday)
        // If day is Sunday (0), go back 1 day to Saturday
        // If day is Saturday (6), use today
        // Otherwise, go back to the last Saturday
        const diff = day === 6 ? 0 : (day === 0 ? -1 : -(day + 1));
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        return startOfWeek;
      },
      toDate: () => {
        const endOfWeek = getStartOfToday();
        const day = endOfWeek.getDay();
        // End on Thursday (day 4)
        // If day is before Thursday, go to this week's Thursday
        // If day is Thursday or later, go to next week's Thursday
        const diff = day <= 4 ? (4 - day) : (4 - day + 7);
        endOfWeek.setDate(endOfWeek.getDate() + diff);
        return endOfWeek;
      }
    },
    thisMonth: {
      label: t('dateRange.thisMonth', { defaultValue: 'This Month' }),
      fromDate: () => {
        const now = getStartOfToday();
        return new Date(now.getFullYear(), now.getMonth(), 1);
      },
      toDate: () => {
        const now = getStartOfToday();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    },
    lastMonth: {
      label: t('dateRange.lastMonth', { defaultValue: 'Last Month' }),
      fromDate: () => {
        const now = getStartOfToday();
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
      },
      toDate: () => {
        const now = getStartOfToday();
        return new Date(now.getFullYear(), now.getMonth(), 0);
      }
    },
    thisYear: {
      label: t('dateRange.thisYear', { defaultValue: 'This Year' }),
      fromDate: () => {
        const now = getStartOfToday();
        return new Date(now.getFullYear(), 0, 1);
      },
      toDate: () => {
        const now = getStartOfToday();
        return new Date(now.getFullYear(), 11, 31);
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setStartDate(parseDateValue(fromDate));
    setEndDate(parseDateValue(toDate));
  }, [fromDate, toDate]);

  const handlePresetClick = (presetKey) => {
    const preset = presets[presetKey];
    const from = preset.fromDate();
    const to = preset.toDate();
    setStartDate(from);
    setEndDate(to);
    onChange(from, to);
    setIsOpen(false);
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    if (start && end) {
      onChange(start, end);
    }
  };

  const formatDisplayDate = () => {
    if (!startDate || !endDate) {
      return placeholder || t('dateRange.selectRange', { defaultValue: 'Select date range' });
    }
    const from = format(startDate, 'PP', { locale });
    const to = format(endDate, 'PP', { locale });
    return `${from} - ${to}`;
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    onChange(null, null);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-sm bg-background border border-input rounded-md shadow-sm hover:bg-accent/50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
          isOpen && 'ring-2 ring-ring border-ring'
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className={cn(
          'flex-1 text-left',
          (!startDate || !endDate) && 'text-muted-foreground'
        )}>
          {formatDisplayDate()}
        </span>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute top-full mt-1 bg-background border border-input rounded-md shadow-lg z-50 p-4 min-w-[320px]',
          isRtl ? 'right-0' : 'left-0'
        )}>
          {showPresets && (
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t('dateRange.quickSelect', { defaultValue: 'Quick select' })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(presets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetClick(key)}
                    className={cn(
                      'px-3 py-2 text-sm bg-muted hover:bg-accent hover:text-accent-foreground rounded-md transition-colors',
                      'text-left'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <DatePicker
              selected={startDate}
              onChange={handleDateChange}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              inline
              locale={locale}
              dateFormat="PP"
              calendarClassName={cn(
                '!border-0 !bg-transparent',
                '[&_.react-datepicker__day]:text-sm [&_.react-datepicker__day]:h-8 [&_.react-datepicker__day]:w-8',
                '[&_.react-datepicker__day--selected]:bg-primary [&_.react-datepicker__day--selected]:text-primary-foreground [&_.react-datepicker__day--selected]:font-medium',
                '[&_.react-datepicker__day--range-start]:bg-primary [&_.react-datepicker__day--range-start]:text-primary-foreground',
                '[&_.react-datepicker__day--range-end]:bg-primary [&_.react-datepicker__day--range-end]:text-primary-foreground',
                '[&_.react-datepicker__day--in-range]:bg-accent [&_.react-datepicker__day--in-range]:text-accent-foreground',
                '[&_.react-datepicker__header]:text-xs [&_.react-datepicker__header]:font-medium',
                '[&_.react-datepicker__current-month]:text-sm [&_.react-datepicker__current-month]:font-medium',
                '[&_.react-datepicker__navigation]:hover:bg-accent'
              )}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-border flex justify-between gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              {t('common.clear', { defaultValue: 'Clear' })}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
            >
              {t('common.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
