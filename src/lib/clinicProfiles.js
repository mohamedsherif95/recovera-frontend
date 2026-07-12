import { CLINIC_PROFILES } from "@/lib/constants";

export const CLINIC_PROFILE_CODES = Object.values(CLINIC_PROFILES);

export const CLINIC_PROFILE_WORKFLOWS = {
  VISIT_CATEGORIES: "visitCategories",
  ASSESSMENT_TRACKING: "assessmentTracking",
  TREATMENT_PACKAGES: "treatmentPackages",
  AUTO_FOLLOW_UP_VISITS: "autoFollowUpVisits",
};

export const CLINIC_PROFILE_REGISTRY = {
  [CLINIC_PROFILES.PHYSIOTHERAPY]: {
    code: CLINIC_PROFILES.PHYSIOTHERAPY,
    labelKey: "branchSubscriptions.profiles.physiotherapy",
    labelDefault: "Physiotherapy",
    visitLabelKey: "clinicProfiles.visits.physiotherapy",
    visitLabelDefault: "Session",
    providerLabelKey: "clinicProfiles.providers.physiotherapy",
    providerLabelDefault: "Therapist",
    workflowModules: [
      CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
      CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
      CLINIC_PROFILE_WORKFLOWS.TREATMENT_PACKAGES,
      CLINIC_PROFILE_WORKFLOWS.AUTO_FOLLOW_UP_VISITS,
    ],
    detailFields: [
      {
        key: "diagnosisSummary",
        labelKey: "profileDetails.diagnosisSummary",
        defaultLabel: "Diagnosis summary",
        type: "textarea",
      },
      {
        key: "treatmentFocus",
        labelKey: "profileDetails.treatmentFocus",
        defaultLabel: "Treatment focus",
        type: "textarea",
      },
      {
        key: "homeInstructions",
        labelKey: "profileDetails.homeInstructions",
        defaultLabel: "Home instructions",
        type: "textarea",
      },
    ],
    visitDetailFields: [
      {
        key: "sessionFocus",
        labelKey: "visitDetails.sessionFocus",
        defaultLabel: "Session focus",
        type: "textarea",
      },
      {
        key: "interventionsPerformed",
        labelKey: "visitDetails.interventionsPerformed",
        defaultLabel: "Interventions performed",
        type: "textarea",
      },
      {
        key: "patientResponse",
        labelKey: "visitDetails.patientResponse",
        defaultLabel: "Patient response",
        type: "textarea",
      },
      {
        key: "painLevel",
        labelKey: "visitDetails.painLevel",
        defaultLabel: "Pain level",
        type: "text",
      },
      {
        key: "homeInstructions",
        labelKey: "visitDetails.homeInstructions",
        defaultLabel: "Home instructions",
        type: "textarea",
      },
    ],
  },
  [CLINIC_PROFILES.MEDICAL_DOCTOR]: {
    code: CLINIC_PROFILES.MEDICAL_DOCTOR,
    labelKey: "branchSubscriptions.profiles.medicalDoctor",
    labelDefault: "Medical clinic",
    visitLabelKey: "clinicProfiles.visits.medicalDoctor",
    visitLabelDefault: "Visit",
    providerLabelKey: "clinicProfiles.providers.medicalDoctor",
    providerLabelDefault: "Clinician",
    workflowModules: [],
    detailFields: [
      {
        key: "chiefComplaint",
        labelKey: "profileDetails.chiefComplaint",
        defaultLabel: "Chief complaint",
        type: "textarea",
      },
      {
        key: "historyOfPresentIllness",
        labelKey: "profileDetails.historyOfPresentIllness",
        defaultLabel: "History of present illness",
        type: "textarea",
      },
      {
        key: "examination",
        labelKey: "profileDetails.examination",
        defaultLabel: "Examination",
        type: "textarea",
      },
      {
        key: "diagnosis",
        labelKey: "profileDetails.diagnosis",
        defaultLabel: "Diagnosis",
        type: "textarea",
      },
      {
        key: "prescription",
        labelKey: "profileDetails.prescription",
        defaultLabel: "Prescription",
        type: "textarea",
      },
      {
        key: "followUpPlan",
        labelKey: "profileDetails.followUpPlan",
        defaultLabel: "Follow-up plan",
        type: "textarea",
      },
    ],
    visitDetailFields: [
      {
        key: "chiefComplaint",
        labelKey: "visitDetails.chiefComplaint",
        defaultLabel: "Chief complaint",
        type: "textarea",
      },
      {
        key: "examinationFindings",
        labelKey: "visitDetails.examinationFindings",
        defaultLabel: "Examination findings",
        type: "textarea",
      },
      {
        key: "diagnosis",
        labelKey: "visitDetails.diagnosis",
        defaultLabel: "Diagnosis",
        type: "textarea",
      },
      {
        key: "prescription",
        labelKey: "visitDetails.prescription",
        defaultLabel: "Prescription",
        type: "textarea",
      },
      {
        key: "followUpPlan",
        labelKey: "visitDetails.followUpPlan",
        defaultLabel: "Follow-up plan",
        type: "textarea",
      },
    ],
  },
  [CLINIC_PROFILES.DENTIST]: {
    code: CLINIC_PROFILES.DENTIST,
    labelKey: "branchSubscriptions.profiles.dentist",
    labelDefault: "Dentist",
    visitLabelKey: "clinicProfiles.visits.dentist",
    visitLabelDefault: "Visit",
    providerLabelKey: "clinicProfiles.providers.dentist",
    providerLabelDefault: "Dentist",
    workflowModules: [],
    detailFields: [
      {
        key: "procedure",
        labelKey: "profileDetails.procedure",
        defaultLabel: "Procedure",
        type: "textarea",
      },
      {
        key: "toothOrArea",
        labelKey: "profileDetails.toothOrArea",
        defaultLabel: "Tooth or area",
        type: "text",
      },
      {
        key: "diagnosis",
        labelKey: "profileDetails.diagnosis",
        defaultLabel: "Diagnosis",
        type: "textarea",
      },
      {
        key: "treatmentPlan",
        labelKey: "profileDetails.treatmentPlan",
        defaultLabel: "Treatment plan",
        type: "textarea",
      },
      {
        key: "materialsUsed",
        labelKey: "profileDetails.materialsUsed",
        defaultLabel: "Materials used",
        type: "textarea",
      },
      {
        key: "nextVisitPlan",
        labelKey: "profileDetails.nextVisitPlan",
        defaultLabel: "Next visit plan",
        type: "textarea",
      },
    ],
    visitDetailFields: [
      {
        key: "procedure",
        labelKey: "visitDetails.procedure",
        defaultLabel: "Procedure",
        type: "textarea",
      },
      {
        key: "toothOrArea",
        labelKey: "visitDetails.toothOrArea",
        defaultLabel: "Tooth or area",
        type: "text",
      },
      {
        key: "anesthesia",
        labelKey: "visitDetails.anesthesia",
        defaultLabel: "Anesthesia",
        type: "text",
      },
      {
        key: "materialsUsed",
        labelKey: "visitDetails.materialsUsed",
        defaultLabel: "Materials used",
        type: "textarea",
      },
      {
        key: "postOpInstructions",
        labelKey: "visitDetails.postOpInstructions",
        defaultLabel: "Post-op instructions",
        type: "textarea",
      },
      {
        key: "nextVisitPlan",
        labelKey: "visitDetails.nextVisitPlan",
        defaultLabel: "Next visit plan",
        type: "textarea",
      },
    ],
  },
  [CLINIC_PROFILES.LASER_DERMATOLOGY]: {
    code: CLINIC_PROFILES.LASER_DERMATOLOGY,
    labelKey: "branchSubscriptions.profiles.laserDermatology",
    labelDefault: "Laser and dermatology",
    visitLabelKey: "clinicProfiles.visits.laserDermatology",
    visitLabelDefault: "Session",
    providerLabelKey: "clinicProfiles.providers.laserDermatology",
    providerLabelDefault: "Clinician",
    workflowModules: [],
    detailFields: [
      {
        key: "treatmentArea",
        labelKey: "profileDetails.treatmentArea",
        defaultLabel: "Treatment area",
        type: "text",
      },
      {
        key: "skinType",
        labelKey: "profileDetails.skinType",
        defaultLabel: "Skin type",
        type: "text",
      },
      {
        key: "device",
        labelKey: "profileDetails.device",
        defaultLabel: "Device",
        type: "text",
      },
      {
        key: "settings",
        labelKey: "profileDetails.settings",
        defaultLabel: "Settings",
        type: "textarea",
      },
      {
        key: "sessionNumber",
        labelKey: "profileDetails.sessionNumber",
        defaultLabel: "Session number",
        type: "number",
      },
      {
        key: "clinicalNotes",
        labelKey: "profileDetails.clinicalNotes",
        defaultLabel: "Clinical notes",
        type: "textarea",
      },
      {
        key: "aftercareInstructions",
        labelKey: "profileDetails.aftercareInstructions",
        defaultLabel: "Aftercare instructions",
        type: "textarea",
      },
    ],
    visitDetailFields: [
      {
        key: "treatmentArea",
        labelKey: "visitDetails.treatmentArea",
        defaultLabel: "Treatment area",
        type: "text",
      },
      {
        key: "skinType",
        labelKey: "visitDetails.skinType",
        defaultLabel: "Skin type",
        type: "text",
      },
      {
        key: "device",
        labelKey: "visitDetails.device",
        defaultLabel: "Device",
        type: "text",
      },
      {
        key: "energySettings",
        labelKey: "visitDetails.energySettings",
        defaultLabel: "Energy settings",
        type: "textarea",
      },
      {
        key: "sessionNumber",
        labelKey: "visitDetails.sessionNumber",
        defaultLabel: "Session number",
        type: "number",
      },
      {
        key: "skinReaction",
        labelKey: "visitDetails.skinReaction",
        defaultLabel: "Skin reaction",
        type: "textarea",
      },
      {
        key: "aftercareInstructions",
        labelKey: "visitDetails.aftercareInstructions",
        defaultLabel: "Aftercare instructions",
        type: "textarea",
      },
    ],
  },
};

export const CLINIC_PROFILE_OPTIONS = CLINIC_PROFILE_CODES.map((code) => {
  const profile = CLINIC_PROFILE_REGISTRY[code];
  return {
    value: profile.code,
    labelKey: profile.labelKey,
    labelDefault: profile.labelDefault,
  };
});

export function getClinicProfileConfig(profile) {
  return CLINIC_PROFILE_REGISTRY[profile] || null;
}

export function getClinicProfileLabel(profile, t) {
  const config = getClinicProfileConfig(profile);
  if (!config) return profile ? String(profile) : "";

  return typeof t === "function"
    ? t(config.labelKey, { defaultValue: config.labelDefault })
    : config.labelDefault;
}

export function getClinicProfileVisitLabel(profile, t) {
  const config = getClinicProfileConfig(profile);
  if (!config) return "Visit";

  return typeof t === "function"
    ? t(config.visitLabelKey, { defaultValue: config.visitLabelDefault })
    : config.visitLabelDefault;
}

export function getClinicProfileProviderLabel(profile, t) {
  const config = getClinicProfileConfig(profile);
  if (!config) return "Provider";

  return typeof t === "function"
    ? t(config.providerLabelKey, {
        defaultValue: config.providerLabelDefault,
      })
    : config.providerLabelDefault;
}

export function getClinicProfileDetailFields(profile) {
  return getClinicProfileConfig(profile)?.detailFields || [];
}

export function getClinicProfileVisitDetailFields(profile) {
  return getClinicProfileConfig(profile)?.visitDetailFields || [];
}

export function clinicProfileSupportsWorkflow(profile, workflow) {
  return Boolean(
    getClinicProfileConfig(profile)?.workflowModules.includes(workflow),
  );
}

export function isClinicProfile(profile) {
  return CLINIC_PROFILE_CODES.includes(profile);
}
