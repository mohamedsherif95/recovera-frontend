import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency (no decimals for Egyptian pounds)
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date using date-fns
 */
export function formatDate(date, formatStr = 'PP') {
  if (!date) return '';
  return format(new Date(date), formatStr);
}

/**
 * Format date and time
 */
export function formatDateTime(date, formatStr = 'PPp') {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return format(parsed, formatStr, { locale: enUS });
}

/**
 * Format a time string (HH:mm or HH:mm:ss) to 12-hour format.
 * @deprecated Use formatTimeTo12Hour instead
 */
export const formatTimeWithDate = (time) => {
  return formatTimeTo12Hour(time);
};

export const getCurrentLocalTime = () => new Date().toTimeString().split(' ')[0];

/**
 * Convert 24-hour time string to 12-hour format with AM/PM
 * @param {string} time - Time in HH:mm or HH:mm:ss format
 * @returns {string} Time in 12-hour format (e.g., "2:30 PM")
 */
export function formatTimeTo12Hour(time) {
  if (!time) return '--';
  
  const parts = time.split(':');
  if (parts.length < 2) return time;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  
  if (isNaN(hours)) return time;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 to 12 for midnight, 13-23 to 1-11
  
  return `${hours}:${minutes} ${period}`;
}

/**
 * Calculate duration in minutes between two dates
 */
export function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  return Math.floor(diffMs / 1000 / 60);
}

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get status color
 */
export function getStatusColor(status) {
  const colors = {
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    ongoing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return colors[status] || colors.inactive;
}
