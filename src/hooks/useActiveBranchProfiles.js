import { useMemo } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { CLINIC_PROFILES } from '@/lib/constants';
import { clinicProfileSupportsWorkflow } from '@/lib/clinicProfiles';
import {
  canOverrideBranchScope,
  resolveEffectiveBranchId,
  resolveEffectiveClinicId,
} from '@/lib/branchScope';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export function normalizeBranchProfiles(branch) {
  const profiles = branch?.subscription?.profiles;
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return [CLINIC_PROFILES.PHYSIOTHERAPY];
  }

  return profiles
    .filter((profile) => profile?.isEnabled !== false)
    .map((profile) =>
      typeof profile === 'string'
        ? profile
        : profile?.profile || profile?.profileCode || profile?.code || profile?.name,
    )
    .filter(Boolean);
}

export function useActiveBranchProfiles() {
  const { user } = useAuthStore();
  const { clinicOverrideId, branchOverrideId } = useUIStore();
  const canOverrideBranch = canOverrideBranchScope(user);
  const effectiveClinicId = resolveEffectiveClinicId(user, clinicOverrideId);
  const effectiveBranchId = resolveEffectiveBranchId(user, branchOverrideId);
  const { data: branchesData, ...query } = useBranches({
    enabled: Boolean(
      user &&
        (canOverrideBranch ? effectiveClinicId : effectiveBranchId),
    ),
  });
  const branches = useMemo(() => {
    if (canOverrideBranch && !effectiveClinicId) return [];
    if (Array.isArray(branchesData)) return branchesData;
    if (Array.isArray(branchesData?.data)) return branchesData.data;
    return [];
  }, [branchesData, canOverrideBranch, effectiveClinicId]);
  const currentBranch = useMemo(
    () =>
      branches.find((branch) => Number(branch.id) === Number(effectiveBranchId)) ||
      branches.find((branch) => branch.isDefault) ||
      (!canOverrideBranch ? user?.branch : null) ||
      null,
    [branches, canOverrideBranch, effectiveBranchId, user?.branch],
  );
  const enabledProfiles = useMemo(
    () => normalizeBranchProfiles(currentBranch),
    [currentBranch],
  );

  return {
    ...query,
    branches,
    currentBranch,
    enabledProfiles,
    effectiveBranchId,
    supportsProfile: (profile) => enabledProfiles.includes(profile),
    supportsWorkflow: (workflow) =>
      enabledProfiles.some((profile) =>
        clinicProfileSupportsWorkflow(profile, workflow),
      ),
  };
}
