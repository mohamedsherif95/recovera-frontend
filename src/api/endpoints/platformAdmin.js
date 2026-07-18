import apiClient from '../client';
import { buildScopedRequestConfig } from '../scopeConfig';

const LANDING_BANNER_UPDATE_FIELDS = [
  'enabled',
  'kicker',
  'message',
  'details',
  'ctaLabel',
  'ctaHref',
  'variant',
  'density',
  'backgroundColor',
  'textColor',
  'accentColor',
  'accentTextColor',
  'borderColor',
  'speedSeconds',
  'direction',
  'pauseOnHover',
  'showIcon',
];

const toLandingBannerUpdatePayload = (payload = {}) =>
  LANDING_BANNER_UPDATE_FIELDS.reduce((cleanPayload, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      cleanPayload[field] = payload[field];
    }

    return cleanPayload;
  }, {});

export const platformAdminApi = {
  getOverview: async (options = {}) => {
    const response = await apiClient.get(
      '/platform/admin/overview',
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  getClinicGroups: async (options = {}) => {
    const response = await apiClient.get(
      '/platform/admin/clinic-groups',
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  getAuditEvents: async (params = {}, options = {}) => {
    const config = buildScopedRequestConfig(options);
    config.params = params;

    const response = await apiClient.get('/platform/admin/audit', config);
    return response.data;
  },

  getLandingBanner: async () => {
    const response = await apiClient.get('/platform/admin/content/landing-banner');
    return response.data;
  },

  updateLandingBanner: async (payload) => {
    const response = await apiClient.put(
      '/platform/admin/content/landing-banner',
      toLandingBannerUpdatePayload(payload),
    );
    return response.data;
  },
};
