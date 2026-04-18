import { USER_ROLES } from '@/lib/constants';

function getRoleNames(user) {
  if (!Array.isArray(user?.roles)) {
    return [];
  }

  return user.roles.map((role) => role?.name).filter(Boolean);
}

export function canOverrideClinicScope(user) {
  return Boolean(
    user?.isSuperAdmin || getRoleNames(user).includes(USER_ROLES.SUPER_ADMIN),
  );
}

export function canOverrideBranchScope(user) {
  const roleNames = getRoleNames(user);

  return Boolean(
    user?.isSuperAdmin ||
      roleNames.includes(USER_ROLES.SUPER_ADMIN) ||
      roleNames.includes(USER_ROLES.ADMIN),
  );
}

export function resolveEffectiveBranchId(user, branchOverrideId) {
  if (canOverrideBranchScope(user) && branchOverrideId) {
    return Number(branchOverrideId);
  }

  return user?.branchId ?? user?.branch?.id ?? null;
}

export function resolveEffectiveClinicId(user, clinicOverrideId) {
  if (canOverrideClinicScope(user) && clinicOverrideId) {
    return Number(clinicOverrideId);
  }

  return user?.clinicId ?? null;
}
