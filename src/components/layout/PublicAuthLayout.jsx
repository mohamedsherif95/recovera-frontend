import { PublicTopBar } from '@/components/layout/PublicTopBar';
import { cn } from '@/lib/utils';

export function PublicAuthLayout({ children, className }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_34rem)]" />
      <div className="pointer-events-none absolute inset-y-0 start-0 -z-10 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(125,211,252,0.14),_transparent_60%)] lg:block" />
      <PublicTopBar mode="auth" />
      <main
        className={cn(
          'mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8',
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
