const REQUEST_CONTROL_OPTIONS = [
  'suppressErrorToast',
  'suppressPermissionToast',
  'suppressNotFoundToast',
];

export const applyRequestControlOptions = (options = {}, config = {}) => {
  REQUEST_CONTROL_OPTIONS.forEach((key) => {
    if (options[key] !== undefined) {
      config[key] = options[key];
    }
  });

  return config;
};

export const buildRequestControlConfig = (options = {}) =>
  applyRequestControlOptions(options, {});

export const buildScopedRequestConfig = (options = {}) => {
  const config = {};
  applyRequestControlOptions(options, config);

  if (options.platformClinicId !== undefined) {
    config.clinicOverrideId = null;
    config.branchOverrideId = null;

    if (options.platformClinicId !== null) {
      config.headers = {
        ...config.headers,
        'X-Platform-Clinic-Scope': String(options.platformClinicId),
      };
    }

    return config;
  }

  if (options.clinicOverrideId !== undefined) {
    config.clinicOverrideId = options.clinicOverrideId;
  }

  if (options.branchOverrideId !== undefined) {
    config.branchOverrideId = options.branchOverrideId;
  }

  return config;
};
