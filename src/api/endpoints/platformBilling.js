import apiClient from '../client';
import { buildScopedRequestConfig } from '../scopeConfig';

const downloadBlob = async (url, options = {}) => {
  const response = await apiClient.get(url, {
    ...buildScopedRequestConfig(options),
    responseType: 'blob',
  });
  const disposition = response.headers?.['content-disposition'] || '';
  const encodedFileNameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const quotedFileNameMatch = disposition.match(/filename="([^"]+)"/i);
  const plainFileNameMatch = disposition.match(/filename=([^;]+)/i);
  const fileName = encodedFileNameMatch?.[1]
    ? decodeURIComponent(encodedFileNameMatch[1])
    : quotedFileNameMatch?.[1] ||
      plainFileNameMatch?.[1]?.trim() ||
      'platform-billing-artifact';
  const blobUrl = window.URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const platformBillingApi = {
  preview: async ({ branchId, billingMonth }, options = {}) => {
    const response = await apiClient.get('/platform/billing/preview', {
      ...buildScopedRequestConfig(options),
      params: { branchId, billingMonth },
    });
    return response.data;
  },

  generateInvoice: async (payload, options = {}) => {
    const response = await apiClient.post(
      '/platform/billing/invoices',
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  listInvoices: async (params = {}, options = {}) => {
    const response = await apiClient.get('/platform/billing/invoices', {
      ...buildScopedRequestConfig(options),
      params,
    });
    return response.data;
  },

  listUsageEvents: async (params = {}, options = {}) => {
    const response = await apiClient.get('/platform/billing/usage-events', {
      ...buildScopedRequestConfig(options),
      params,
    });
    return response.data;
  },

  getInvoice: async (id, options = {}) => {
    const response = await apiClient.get(
      `/platform/billing/invoices/${id}`,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  downloadArtifact: async (id, artifactType, options = {}) =>
    downloadBlob(
      `/platform/billing/invoices/${id}/artifacts/${artifactType}`,
      options,
    ),

  createAdjustment: async (payload, options = {}) => {
    const response = await apiClient.post(
      '/platform/billing/adjustments',
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  recordCollection: async (id, payload, options = {}) => {
    const response = await apiClient.post(
      `/platform/billing/invoices/${id}/collections`,
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  voidInvoice: async (id, payload, options = {}) => {
    const response = await apiClient.post(
      `/platform/billing/invoices/${id}/void`,
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },
};
