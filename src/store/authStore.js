import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUIStore } from '@/store/uiStore';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken) => {
        useUIStore.getState().clearClinicOverride();
        set(
          {
            user,
            token,
            refreshToken,
            isAuthenticated: true,
          },
          false // Don't replace, merge
        );
      },

      setUser: (user) => set({ user }),

      setToken: (token) => set({ token }),

      logout: () => {
        useUIStore.getState().clearClinicOverride();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        // Clear permissions
        localStorage.removeItem('recovera-permissions');
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      hasRole: (role) => {
        const { user } = get();
        if (!user || !user.roles) return false;
        return user.roles.some((r) => r.name === role);
      },

      hasAnyRole: (roles) => {
        const { user } = get();
        if (!user || !user.roles) return false;
        return user.roles.some((r) => roles.includes(r.name));
      },
    }),
    {
      name: 'recovera-auth-storage',
    }
  )
);
