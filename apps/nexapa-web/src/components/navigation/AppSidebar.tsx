import { NavLink, useLocation } from "react-router-dom";
import { navigationGroups } from "@/lib/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/features/auth/AuthContext";
import { useEffect, useRef, useState } from "react";

type AppSidebarProps = {
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type TooltipState = {
  label: string;
  top: number;
} | null;

export function AppSidebar({
  onNavigate,
  variant = "desktop",
  collapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
  const { user } = useAuth();
  const isAdmin =
    user?.role === "admin" ||
    user?.is_admin === true ||
    (user as any)?.is_admin === 1;
  const isCollapsed = collapsed && variant === "desktop";
  const isMobile = variant === "mobile";
  const location = useLocation();
  const [activeTooltip, setActiveTooltip] = useState<TooltipState>(null);
  const tooltipTimeout = useRef<number | null>(null);

  // Close tooltip on route change
  useEffect(() => {
    setActiveTooltip(null);
  }, [location.pathname]);

  const showTooltip = (label: string, rectTop: number) => {
    if (!isCollapsed) return;
    if (tooltipTimeout.current) window.clearTimeout(tooltipTimeout.current);
    setActiveTooltip({ label, top: rectTop });
  };

  const hideTooltip = () => {
    if (tooltipTimeout.current) window.clearTimeout(tooltipTimeout.current);
    tooltipTimeout.current = window.setTimeout(() => setActiveTooltip(null), 80) as unknown as number;
  };

  return (
    <div
      className={cn(
        "nexapa-sidebar-glass flex h-full flex-col transition-all duration-300 ease-in-out",
        // opacity driven by css var
        "backdrop-blur-2xl",
        variant === "desktop"
          ? "border-r border-white/10 shadow-[12px_0_40px_rgba(2,6,23,0.22)]"
          : "border-r-0",
        isCollapsed && !isMobile ? "w-[80px]" : "w-full",
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex h-[64px] shrink-0 items-center border-b border-white/10 transition-all duration-300",
          isCollapsed && !isMobile ? "justify-center gap-0 px-2" : "justify-between px-4",
        )}
      >
        <div className={cn("flex items-center", isCollapsed && !isMobile ? "justify-center" : "gap-3")}>
          <img
            src="/assets/branding/nexapa-app-logo.svg"
            alt="Nexapa"
            className="h-9 w-9 shrink-0 rounded-xl border border-white/20 object-contain shadow-sm"
          />
          {(!isCollapsed || isMobile) && (
            <div className="sidebar-collapse-enter min-w-0">
              <p className="text-[13px] font-bold tracking-[0.12em] text-white">
                NEXAPA
              </p>
              <p className="-mt-0.5 text-[9px] font-semibold tracking-[0.18em] text-white/45">
                WEB WORKFLOW
              </p>
            </div>
          )}
        </div>

        {!isMobile && onToggleCollapse && (
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapse}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 backdrop-blur-xl transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
              isCollapsed && "h-7 w-7",
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        aria-label="Primary"
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin",
          isCollapsed && !isMobile ? "px-2 py-4" : "px-3 py-4",
        )}
      >
        <div className={cn("space-y-6", isCollapsed && !isMobile && "space-y-5")}>
          {navigationGroups.map((group) => (
            <div key={group.title}>
              {(!isCollapsed || isMobile) && (
                <p className="mb-2.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  {group.title}
                </p>
              )}
              <ul className={cn("space-y-1", isCollapsed && !isMobile && "space-y-1.5")}>
                {group.items
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href} className="relative">
                        <NavLink
                          to={item.href}
                          onClick={onNavigate}
                          aria-current="page"
                          onMouseEnter={(e) => {
                            if (!isCollapsed) return;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            showTooltip(item.label, rect.top + rect.height / 2);
                          }}
                          onMouseLeave={hideTooltip}
                          onFocus={(e) => {
                            if (!isCollapsed) return;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            showTooltip(item.label, rect.top + rect.height / 2);
                          }}
                          onBlur={hideTooltip}
                          className={({ isActive }) =>
                            cn(
                              "group relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                              isCollapsed && !isMobile
                                ? "h-11 w-11 justify-center px-0 mx-auto"
                                : "gap-3 px-3 py-2.5 min-h-[42px]",
                              isActive
                                ? "bg-white/10 border border-white/20 border-l-2 border-blue-400 text-white shadow-sm"
                                : "border border-transparent text-white/80 hover:bg-slate-800/40 hover:text-white",
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && !isCollapsed && (
                                <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)]" aria-hidden="true" />
                              )}
                              <Icon
                                className={cn(
                                  "nav-item-icon h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                                  isCollapsed ? "h-[19px] w-[19px]" : "",
                                  // keep icon contrast
                                  isActive ? "text-white" : "text-white/55 group-hover:text-white/85",
                                )}
                                aria-hidden="true"
                              />
                              {(!isCollapsed || isMobile) && (
                                <span className="sidebar-collapse-enter truncate">{item.label}</span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom area - only user, no technical info */}
      <div className={cn("shrink-0 border-t border-white/10 p-3", isCollapsed && !isMobile && "p-2.5")}>
        {(!isCollapsed || isMobile) ? (
          <div className="sidebar-collapse-enter flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-[11px] font-bold text-white ring-1 ring-white/20">
              NW
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white/90">
                Nexapa Workspace
              </p>
              <p className="truncate text-[11px] text-white/55">
                {user?.email ? user.email.slice(0, 22) : "Workspace"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-[11px] font-bold text-white ring-1 ring-white/20"
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                showTooltip(user?.email ?? "Nexapa Workspace", rect.top + rect.height / 2);
              }}
              onMouseLeave={hideTooltip}
            >
              NW
            </div>
          </div>
        )}
      </div>

      {/* Floating tooltip when collapsed - single nav has no submenu so use tooltip only */}
      {isCollapsed && activeTooltip && !isMobile && (
        <div
          className="pointer-events-none fixed z-[60] -translate-y-1/2 rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-[12px] font-medium text-white shadow-[0_20px_60px_rgba(2,6,23,0.35)] backdrop-blur-2xl"
          style={{
            left: 84,
            top: activeTooltip.top,
          }}
          role="tooltip"
        >
          {activeTooltip.label}
        </div>
      )}
    </div>
  );
}
