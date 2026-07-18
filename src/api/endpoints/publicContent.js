import apiClient from "../client";

export const publicContentApi = {
  getLandingBanner: async () => {
    const response = await apiClient.get("/public/content/landing-banner", {
      suppressErrorToast: true,
    });
    return response.data;
  },
};
