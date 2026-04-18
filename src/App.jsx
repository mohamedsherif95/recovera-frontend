import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';
import { router } from '@/routes';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
      onError: (error) => {
        const message = error?.response?.data?.message || 'Failed to load data';
        toast.error(message);
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {t.type !== 'loading' && (
                    <button
                      type="button"
                      onClick={() => toast.dismiss(t.id)}
                      className="ml-3 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
