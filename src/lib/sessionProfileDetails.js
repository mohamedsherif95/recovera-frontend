import {
  CLINIC_PROFILE_CODES,
  getClinicProfileDetailFields,
} from '@/lib/clinicProfiles';

export const PROFILE_DETAIL_FIELDS = Object.fromEntries(
  CLINIC_PROFILE_CODES.map((profile) => [
    profile,
    getClinicProfileDetailFields(profile),
  ]),
);

export function getProfileDetailFields(profile) {
  return getClinicProfileDetailFields(profile);
}
