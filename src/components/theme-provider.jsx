import { createContext, useContext, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

const ThemeProviderContext = createContext({});
const RECOVERA_FAVICON =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2218%22 fill=%22%230ea5e9%22/%3E%3Cpath d=%22M18 45V17h16c7 0 12 4 12 10 0 4-2 7-6 9l8 9H37l-7-8h-3v8H18zm9-16h7c3 0 5-1 5-4s-2-4-5-4h-7v8z%22 fill=%22white%22/%3E%3C/svg%3E';

export function ThemeProvider({ children, ...props }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.setAttribute('type', 'image/svg+xml');
      favicon.setAttribute('href', RECOVERA_FAVICON);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: useUIStore.getState().setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
