import { useMemo } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  canOverrideBranchScope,
  getAssignedBranches,
  resolveEffectiveBranchId,
  resolveEffectiveClinicId,
} from '@/lib/branchScope';
import { BRANCH_SUBSCRIPTION_ACCESS_STATUS } from '@/lib/constants';

export function useBranchAccessState() {
  const { user } = useAuthStore();
  const { clinicOverrideId, branchOverrideId } = useUIStore();

  const canOverrideBranch = canOverrideBranchScope(user);
  const assignedBranches = useMemo(() => getAssignedBranches(user), [user]);
  const effectiveClinicId = resolveEffectiveClinicId(user, clinicOverrideId);
  const effectiveBranchId = resolveEffectiveBranchId(user, branchOverrideId);
  const hasScopedBranchData = Boolean(
    canOverrideBranch ? effectiveClinicId : effectiveBranchId,
  );

  const { data: branchesData } = useBranches({
    enabled: Boolean(user && hasScopedBranchData),
  });

  const fetchedBranches = hasScopedBranchData
    ? Array.isArray(branchesData)
      ? branchesData
      : Array.isArray(branchesData?.data)
        ? branchesData.data
        : []
    : [];
  const branches = fetchedBranches.length > 0 ? fetchedBranches : assignedBranches;
  const currentBranch =
    canOverrideBranch && !effectiveClinicId
      ? null
      : branches.find((branch) => Number(branch.id) === Number(effectiveBranchId)) ||
        branches.find((branch) => branch.isDefault) ||
        (!canOverrideBranch ? user?.branch : null) ||
        null;
  const branchAccessStatus =
    currentBranch?.subscription?.accessStatus ||
    currentBranch?.accessStatus ||
    null;
  const isReadOnlyBranch =
    branchAccessStatus === BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED;

  return {
    currentBranch,
    branchAccessStatus,
    isReadOnlyBranch,
    readOnlyTitleKey: 'app.readOnlyTitle',
    readOnlyDescriptionKey: 'app.readOnlyDescription',
    readOnlyTitle: 'Read-only branch',
    readOnlyDescription:
      'This branch is currently in read-only mode. You can view existing records, but changes are disabled. Please contact your administrator.',
  };
}
