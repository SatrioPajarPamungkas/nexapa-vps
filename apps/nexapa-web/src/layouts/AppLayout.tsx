import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/navigation/AppSidebar";
import { AppTopbar } from "@/components/navigation/AppTopbar";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { useAppearance } from "@/features/appearance/AppearanceContext";
import { PRESET_MAP } from "@/features/appearance/appearance.presets";
import wallpaperFallback from "@/assets/backgrounds/nexapa-wallpaper.webp";

const SIDEBAR_EXPANDED = 264;
const SIDEBAR_COLLAPSED = 80;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}

function usePersistedCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = window.localStorage.getItem("nexapa:sidebar:collapsed");
      return saved === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("nexapa:sidebar:collapsed", collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  return [collapsed, setCollapsed] as const;
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedCollapsed();
  const isDesktop = useIsDesktop();
  const { theme } = useAppearance();

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const mainMarginLeft = isDesktop ? sidebarWidth : 0;

  const preset = theme.preset_key ? PRESET_MAP[theme.preset_key] : undefined;
  const isAnimated = preset?.backgroundType === "animated_gradient";
  const wallpaperUrl = (() => {
    if (theme.background_url) return theme.background_url;
    if (preset?.fullAsset) return preset.fullAsset;
    return wallpaperFallback;
  })();

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden">
      {/* Wallpaper layer - driven by CSS vars + preset */}
      <div
        className="nexapa-wallpaper-layer pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={
          isAnimated
            ? {
                backgroundImage: preset?.gradientCss,
                backgroundSize: "200% 200%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : {
                backgroundImage: `url(${wallpaperUrl})`,
                backgroundSize: "var(--nexapa-wallpaper-size, cover)",
                backgroundPosition: "var(--nexapa-wallpaper-position, center)",
                backgroundRepeat: "no-repeat",
                backgroundAttachment: "var(--nexapa-wallpaper-attachment, fixed)" as any,
              }
        }
      />
      {/* Overlay veil driven by var */}
      <div
        className="nexapa-overlay-veil pointer-events-none fixed inset-0 z-[1]"
        aria-hidden="true"
      />

      {/* Desktop fixed sidebar - dark glass */}
      <div
        className="hidden lg:block"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 30,
          height: "100%",
          width: sidebarWidth,
        }}
      >
        <AppSidebar
          variant="desktop"
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* Main content */}
      <div
        className="relative z-[2] flex min-h-screen flex-col transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: mainMarginLeft }}
      >
        <AppTopbar
          menuExpanded={mobileOpen}
          onMenuClick={() => setMobileOpen((o) => !o)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />

        <main
          id="main-content"
          className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
          tabIndex={-1}
        >
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] text-white/70 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium tracking-wide text-white/80">Nexapa</span>
            <span className="text-white/40">Media workflow platform</span>
          </div>
        </footer>
      </div>

      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  );
}
