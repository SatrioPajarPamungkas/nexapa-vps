import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AppSidebar } from "./AppSidebar";

type MobileNavigationProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timeout = window.setTimeout(() => {
      const focusable = drawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(timeout);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
      id="mobile-navigation"
    >
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[8px]"
        onClick={onClose}
        aria-hidden="true"
        style={{ animation: "backdrop-fade-in 200ms ease-out" }}
      />
      <div
        ref={drawerRef}
        className="relative flex h-full w-[300px] max-w-[85vw] flex-col overflow-hidden rounded-r-2xl border-r border-white/10 bg-slate-950/70 shadow-[12px_0_60px_rgba(2,6,23,0.4)] backdrop-blur-2xl"
        style={{ animation: "sidebar-slide-in 250ms ease-out" }}
      >
        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/70 backdrop-blur-xl transition-colors duration-150 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <AppSidebar variant="mobile" onNavigate={onClose} />
      </div>
    </div>
  );
}
