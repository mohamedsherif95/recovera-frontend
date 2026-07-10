export const buildScopedRequestConfig = (options = {}) => {
  const config = {};

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
