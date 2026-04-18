import apiClient from '../client';

export const accessApi = {
  getRolesPermissions: async () => {
    const response = await apiClient.get('/access/roles-permissions');
    return response.data;
  },
};
