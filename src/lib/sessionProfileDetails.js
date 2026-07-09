import { CLINIC_PROFILES } from '@/lib/constants';

export const PROFILE_DETAIL_FIELDS = {
  [CLINIC_PROFILES.PHYSIOTHERAPY]: [
    {
      key: 'diagnosisSummary',
      labelKey: 'profileDetails.diagnosisSummary',
      defaultLabel: 'Diagnosis summary',
      type: 'textarea',
    },
    {
      key: 'treatmentFocus',
      labelKey: 'profileDetails.treatmentFocus',
      defaultLabel: 'Treatment focus',
      type: 'textarea',
    },
    {
      key: 'homeInstructions',
      labelKey: 'profileDetails.homeInstructions',
      defaultLabel: 'Home instructions',
      type: 'textarea',
    },
  ],
  [CLINIC_PROFILES.MEDICAL_DOCTOR]: [
    {
      key: 'chiefComplaint',
      labelKey: 'profileDetails.chiefComplaint',
      defaultLabel: 'Chief complaint',
      type: 'textarea',
    },
    {
      key: 'historyOfPresentIllness',
      labelKey: 'profileDetails.historyOfPresentIllness',
      defaultLabel: 'History of present illness',
      type: 'textarea',
    },
    {
      key: 'examination',
      labelKey: 'profileDetails.examination',
      defaultLabel: 'Examination',
      type: 'textarea',
    },
    {
      key: 'diagnosis',
      labelKey: 'profileDetails.diagnosis',
      defaultLabel: 'Diagnosis',
      type: 'textarea',
    },
    {
      key: 'prescription',
      labelKey: 'profileDetails.prescription',
      defaultLabel: 'Prescription',
      type: 'textarea',
    },
    {
      key: 'followUpPlan',
      labelKey: 'profileDetails.followUpPlan',
      defaultLabel: 'Follow-up plan',
      type: 'textarea',
    },
  ],
  [CLINIC_PROFILES.DENTIST]: [
    {
      key: 'procedure',
      labelKey: 'profileDetails.procedure',
      defaultLabel: 'Procedure',
      type: 'textarea',
    },
    {
      key: 'toothOrArea',
      labelKey: 'profileDetails.toothOrArea',
      defaultLabel: 'Tooth or area',
      type: 'text',
    },
    {
      key: 'diagnosis',
      labelKey: 'profileDetails.diagnosis',
      defaultLabel: 'Diagnosis',
      type: 'textarea',
    },
    {
      key: 'treatmentPlan',
      labelKey: 'profileDetails.treatmentPlan',
      defaultLabel: 'Treatment plan',
      type: 'textarea',
    },
    {
      key: 'materialsUsed',
      labelKey: 'profileDetails.materialsUsed',
      defaultLabel: 'Materials used',
      type: 'textarea',
    },
    {
      key: 'nextVisitPlan',
      labelKey: 'profileDetails.nextVisitPlan',
      defaultLabel: 'Next visit plan',
      type: 'textarea',
    },
  ],
  [CLINIC_PROFILES.LASER_DERMATOLOGY]: [
    {
      key: 'treatmentArea',
      labelKey: 'profileDetails.treatmentArea',
      defaultLabel: 'Treatment area',
      type: 'text',
    },
    {
      key: 'skinType',
      labelKey: 'profileDetails.skinType',
      defaultLabel: 'Skin type',
      type: 'text',
    },
    {
      key: 'device',
      labelKey: 'profileDetails.device',
      defaultLabel: 'Device',
      type: 'text',
    },
    {
      key: 'settings',
      labelKey: 'profileDetails.settings',
      defaultLabel: 'Settings',
      type: 'textarea',
    },
    {
      key: 'sessionNumber',
      labelKey: 'profileDetails.sessionNumber',
      defaultLabel: 'Session number',
      type: 'number',
    },
    {
      key: 'clinicalNotes',
      labelKey: 'profileDetails.clinicalNotes',
      defaultLabel: 'Clinical notes',
      type: 'textarea',
    },
    {
      key: 'aftercareInstructions',
      labelKey: 'profileDetails.aftercareInstructions',
      defaultLabel: 'Aftercare instructions',
      type: 'textarea',
    },
  ],
};

export function getProfileDetailFields(profile) {
  return PROFILE_DETAIL_FIELDS[profile] || [];
}
