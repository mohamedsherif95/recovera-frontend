import { CLINIC_PROFILES, SESSION_STATUS } from '@/lib/constants';

export const PROFILE_BADGE_VARIANTS = {
  [CLINIC_PROFILES.PHYSIOTHERAPY]: 'physiotherapy',
  [CLINIC_PROFILES.MEDICAL_DOCTOR]: 'medical',
  [CLINIC_PROFILES.DENTIST]: 'dental',
  [CLINIC_PROFILES.LASER_DERMATOLOGY]: 'laser',
};

export const SESSION_STATUS_BADGE_VARIANTS = {
  [SESSION_STATUS.SCHEDULED]: 'warning',
  [SESSION_STATUS.ARRIVED]: 'arrival',
  [SESSION_STATUS.IN_PROGRESS]: 'info',
  [SESSION_STATUS.COMPLETED]: 'success',
  [SESSION_STATUS.CANCELLED]: 'danger',
};

export const SESSION_STATUS_SURFACE_CLASSES = {
  [SESSION_STATUS.SCHEDULED]:
    'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100',
  [SESSION_STATUS.ARRIVED]:
    'border-violet-300 bg-violet-50 text-violet-950 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100',
  [SESSION_STATUS.IN_PROGRESS]:
    'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100',
  [SESSION_STATUS.COMPLETED]:
    'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100',
  [SESSION_STATUS.CANCELLED]:
    'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100',
};

export const INVOICE_STATUS_BADGE_VARIANTS = {
  active: 'success',
  issued: 'info',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
  void: 'danger',
  cancelled: 'danger',
};

export const PROFILE_ACCENT_CLASSES = {
  [CLINIC_PROFILES.PHYSIOTHERAPY]:
    'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100',
  [CLINIC_PROFILES.MEDICAL_DOCTOR]:
    'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100',
  [CLINIC_PROFILES.DENTIST]:
    'border-cyan-300 bg-cyan-50 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-100',
  [CLINIC_PROFILES.LASER_DERMATOLOGY]:
    'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100',
};

export const PROFILE_ICON_TILE_CLASSES = {
  [CLINIC_PROFILES.PHYSIOTHERAPY]:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  [CLINIC_PROFILES.MEDICAL_DOCTOR]:
    'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
  [CLINIC_PROFILES.DENTIST]:
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300',
  [CLINIC_PROFILES.LASER_DERMATOLOGY]:
    'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
};

export const STAT_TONE_CLASSES = {
  neutral: {
    card: 'border-border/80 bg-card',
    rail: 'bg-primary/70',
    icon: 'bg-primary/10 text-primary',
  },
  patients: {
    card: 'border-teal-200 bg-teal-50/70 dark:border-teal-900/70 dark:bg-teal-950/20',
    rail: 'bg-teal-500',
    icon: 'bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300',
  },
  visits: {
    card: 'border-sky-200 bg-sky-50/70 dark:border-sky-900/70 dark:bg-sky-950/20',
    rail: 'bg-sky-500',
    icon: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  },
  staff: {
    card: 'border-violet-200 bg-violet-50/70 dark:border-violet-900/70 dark:bg-violet-950/20',
    rail: 'bg-violet-500',
    icon: 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  },
  money: {
    card: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20',
    rail: 'bg-emerald-500',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  },
  warning: {
    card: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20',
    rail: 'bg-amber-500',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  },
  danger: {
    card: 'border-rose-200 bg-rose-50/70 dark:border-rose-900/70 dark:bg-rose-950/20',
    rail: 'bg-rose-500',
    icon: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  },
};

export function getClinicProfileBadgeVariant(profile) {
  return PROFILE_BADGE_VARIANTS[profile] || 'outline';
}

export function getClinicProfileSurfaceClass(profile) {
  return PROFILE_ACCENT_CLASSES[profile] || 'border-border bg-muted/30';
}

export function getClinicProfileIconTileClass(profile) {
  return PROFILE_ICON_TILE_CLASSES[profile] || 'bg-muted text-muted-foreground';
}

export function getSessionStatusBadgeVariant(status) {
  return SESSION_STATUS_BADGE_VARIANTS[status] || 'outline';
}

export function getSessionStatusSurfaceClass(status) {
  return SESSION_STATUS_SURFACE_CLASSES[status] || 'border-border bg-muted/30';
}

export function getInvoiceStatusBadgeVariant(status) {
  return INVOICE_STATUS_BADGE_VARIANTS[status] || 'neutral';
}
