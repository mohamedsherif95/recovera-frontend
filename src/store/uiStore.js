import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      // Theme state
      theme: 'light',
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          // Apply theme to document
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { theme: newTheme };
        });
      },

      // Sidebar state
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Mobile menu state
      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

      clinicOverrideId: null,
      branchOverrideId: null,
      setClinicOverrideId: (clinicOverrideId) =>
        set((state) => ({
          clinicOverrideId,
          branchOverrideId:
            state.clinicOverrideId === clinicOverrideId ? state.branchOverrideId : null,
        })),
      setBranchOverrideId: (branchOverrideId) => set({ branchOverrideId }),
      clearClinicOverride: () => set({ clinicOverrideId: null, branchOverrideId: null }),
      clearBranchOverride: () => set({ branchOverrideId: null }),
    }),
    {
      name: 'recovera-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        clinicOverrideId: state.clinicOverrideId,
        branchOverrideId: state.branchOverrideId,
      }),
    }
  )
);

// Initialize theme on load
const storedTheme = localStorage.getItem('recovera-ui-storage');
if (storedTheme) {
  try {
    const { state } = JSON.parse(storedTheme);
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    console.error('Failed to parse stored theme:', e);
  }
}
