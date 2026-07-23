import { useState, useEffect, useRef } from 'react';
import { Info, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppFooter() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const handleCopy = (value) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleScroll = () => {
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  return (
    <footer
      dir="ltr"
      className="border-t mt-4 px-4 md:px-8 py-3 text-[11px] text-muted-foreground"
    >
      <div className="flex flex-col items-center gap-1">
        <span>
          Recovera by DevNest © {new Date().getFullYear()}. All rights reserved.
        </span>
        <div ref={containerRef} className="flex items-center gap-1 relative">
          {/* <span>Developed by DevFlow</span>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border bg-card text-foreground h-5 w-5"
          >
            <Info className="h-3 w-3" />
          </button> */}
          {/* {open && (
            <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-md bg-black/80 text-white text-[11px] px-3 py-2 shadow-lg z-50 w-64 space-y-2 animate-in fade-in-0 zoom-in-95 duration-200 ease-out">
                <span>
                    For Inquiries:
                </span>
              <div className="flex items-center justify-between gap-2 pl-2 border rounded-md">
                <span className="truncate">mohamedsherif2395@gmail.com</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/10"
                  onClick={() => handleCopy('mohamedsherif2395@gmail.com')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 pl-2 border rounded-md">
                <span className="truncate">201090987870</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/10"
                  onClick={() => handleCopy('201090987870')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )} */}
        </div>
      </div>
    </footer>
  );
}
