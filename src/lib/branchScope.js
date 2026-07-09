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

export function getAssignedBranches(user) {
  if (Array.isArray(user?.assignedBranches) && user.assignedBranches.length > 0) {
    return user.assignedBranches;
  }

  if (Array.isArray(user?.branchAssignments) && user.branchAssignments.length > 0) {
    return user.branchAssignments
      .map((assignment) => ({
        ...assignment.branch,
        isPrimary: assignment.isPrimary === true,
      }))
      .filter((branch) => branch?.id != null);
  }

  if (user?.branch?.id != null) {
    return [
      {
        ...user.branch,
        isPrimary: true,
      },
    ];
  }

  return [];
}

export function canSwitchAssignedBranches(user) {
  return !canOverrideBranchScope(user) && getAssignedBranches(user).length > 1;
}

export function resolveEffectiveBranchId(user, branchOverrideId) {
  if ((canOverrideBranchScope(user) || canSwitchAssignedBranches(user)) && branchOverrideId) {
    return Number(branchOverrideId);
  }

  if (user?.primaryBranchId != null) {
    return Number(user.primaryBranchId);
  }

  const primaryAssignedBranch = getAssignedBranches(user).find(
    (branch) => branch.isPrimary === true,
  );
  if (primaryAssignedBranch?.id != null) {
    return Number(primaryAssignedBranch.id);
  }

  return user?.branchId ?? user?.branch?.id ?? null;
}

export function resolveEffectiveClinicId(user, clinicOverrideId) {
  if (canOverrideClinicScope(user) && clinicOverrideId) {
    return Number(clinicOverrideId);
  }

  return user?.clinicId ?? null;
}
