import {
  CLINIC_PROFILE_CODES,
  getClinicProfileVisitDetailFields,
} from "@/lib/clinicProfiles";

export const PROFILE_DETAIL_FIELDS = Object.fromEntries(
  CLINIC_PROFILE_CODES.map((profile) => [
    profile,
    getClinicProfileVisitDetailFields(profile),
  ]),
);

export function getProfileDetailFields(profile) {
  return getClinicProfileVisitDetailFields(profile);
}
