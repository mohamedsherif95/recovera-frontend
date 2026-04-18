import apiClient from '../client';

export const actionLogsApi = {
    /**
     * Get paginated action logs
     */
    getLogs: async (params = {}) => {
        const response = await apiClient.get('/action-logs', { params });
        return response.data;
    },

    /**
     * Get a single action log by id
     */
    getLog: async (id) => {
        const response = await apiClient.get(`/action-logs/${id}`);
        return response.data;
    },
};
