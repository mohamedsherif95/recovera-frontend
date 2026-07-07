export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Recovera';

// Doctor shifts
export const DOCTOR_SHIFT = {
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
};

// Session statuses
export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Schedule statuses
export const SCHEDULE_STATUS = {
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
};

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  INSTAPAY: 'instapay',
  E_WALLET: 'e_wallet',
};

// User roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  BRANCH_MANAGER: 'branch_manager',
  DOCTOR: 'doctor',
  SECRETARY: 'secretary',
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Query keys
export const QUERY_KEYS = {
  AUTH: 'auth',
  USERS: 'users',
  PATIENTS: 'patients',
  SESSIONS: 'sessions',
  SCHEDULES: 'schedules',
  PAYMENTS: 'payments',
  REPORTS: 'reports',
  DASHBOARD: 'dashboard',
  AUDIT: 'audit',
  PERMISSIONS: 'permissions',
  CLINICS: 'clinics',
  BRANCHES: 'branches',
  INVOICES: 'invoices',
};

export const PERMISSIONS = {
  "clinics:viewAll": "clinics:viewAll",
  "clinics:create": "clinics:create",
  "clinics:update": "clinics:update",
  "clinics:override": "clinics:override",
  "users:viewAll": "users:viewAll",
  "users:create": "users:create",
  "users:update": "users:update",
  "users:updateOwn": "users:updateOwn",
  "users:delete": "users:delete",
  "users:manageRoles": "users:manageRoles",
  "access:viewPending": "access:viewPending",
  "access:grant": "access:grant",
  "access:revoke": "access:revoke",
  "patients:viewAll": "patients:viewAll",
  "patients:viewAssigned": "patients:viewAssigned",
  "patients:create": "patients:create",
  "patients:update": "patients:update",
  "patients:updateAssigned": "patients:updateAssigned",
  "patients:delete": "patients:delete",
  "sessions:viewAll": "sessions:viewAll",
  "sessions:viewOwn": "sessions:viewOwn",
  "sessions:create": "sessions:create",
  "sessions:updateStatus": "sessions:updateStatus",
  "sessions:updateStatusOwn": "sessions:updateStatusOwn",
  "sessions:updateProgram": "sessions:updateProgram",
  "sessions:delete": "sessions:delete",
  "schedules:viewAll": "schedules:viewAll",
  "schedules:viewOwn": "schedules:viewOwn",
  "schedules:create": "schedules:create",
  "schedules:update": "schedules:update",
  "schedules:delete": "schedules:delete",
  "payments:viewAll": "payments:viewAll",
  "payments:create": "payments:create",
  "payments:update": "payments:update",
  "payments:delete": "payments:delete",
  "payments:viewReports": "payments:viewReports",
  "invoices:view": "invoices:view",
  "invoices:create": "invoices:create",
  "invoices:void": "invoices:void",
  "branches:view": "branches:view",
  "branches:create": "branches:create",
  "branches:update": "branches:update",
  "branchCredits:view": "branchCredits:view",
  "branchCredits:reconcile": "branchCredits:reconcile",
  "reports:view": "reports:view",
  "sessions:update": "sessions:update",
  "reports:viewDailyOperations": "reports:viewDailyOperations"
}
