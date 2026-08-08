import { Bell, Menu, Search, Layers, UserRound, Users, Settings, Palette, LifeBuoy, LogOut, ChevronDown, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { routeLabels } from "@/lib/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getUnreadNotificationCount } from "@/lib/api/notifications";
import { useState, useRef, useEffect } from "react";

type AppTopbarProps = {
  onMenuClick: () => void;
  menuExpanded: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function AppTopbar({
  onMenuClick,
  menuExpanded,
}: AppTopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLabel =
    routeLabels[location.pathname] ??
    location.pathname.split("/").filter(Boolean).pop() ??
    "Dashboard";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleProfileClick = () => {
    setDropdownOpen((o) => !o);
  };

  const closeDropdown = () => setDropdownOpen(false);

  const handleNavigate = (path: string) => {
    closeDropdown();
    navigate(path);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    closeDropdown();
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDropdown();
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    closeDropdown();
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let activeController: AbortController | null = null;

    const loadUnreadCount = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const count = await getUnreadNotificationCount(controller.signal);

        if (!controller.signal.aborted) {
          setUnreadCount(
            Number.isFinite(count) ? Math.max(0, count) : 0,
          );
        }
      } catch {
        // Notification count must never break the topbar.
      }
    };

    const handleWindowFocus = () => {
      void loadUnreadCount();
    };

    const handleNotificationsUpdated = () => {
      void loadUnreadCount();
    };

    void loadUnreadCount();

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener(
      "nexapa:notifications-updated",
      handleNotificationsUpdated,
    );

    return () => {
      activeController?.abort();
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener(
        "nexapa:notifications-updated",
        handleNotificationsUpdated,
      );
    };
  }, [user?.id, location.pathname]);

  return (
    <header className="nexapa-topbar-glass sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/15 px-4 shadow-sm backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={menuExpanded}
          aria-controls="mobile-navigation"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/10 text-slate-700 shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-white/20 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_4px_12px_rgba(59,130,246,0.35)] ring-1 ring-white/20">
            <Layers className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-[14px] font-bold tracking-wide text-navy-900">
            NEXAPA
          </span>
        </div>

        {/* Desktop title */}
        <div className="hidden lg:flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-navy-900">
              {currentLabel}
            </h1>
            <p className="text-[12px] text-slate-500/80">
              Nexapa — media workflow
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="hidden items-center lg:flex">
          <label htmlFor="global-search" className="sr-only">
            Search Nexapa
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500/70"
              aria-hidden="true"
            />
            <input
              id="global-search"
              placeholder="Search Nexapa"
              disabled
              className="h-9 w-[220px] rounded-xl border border-white/20 bg-white/10 pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-500/60 backdrop-blur-xl transition-all duration-200 hover:bg-white/15 focus:border-white/30 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </div>

        {/* Notification button */}
        <button
          type="button"
          onClick={() => navigate("/inbox")}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-slate-600 shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-white/20 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />

          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white/90">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Profile trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleProfileClick}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-1.5 py-1 text-slate-700 shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-white/20 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-[11px] font-semibold text-white ring-1 ring-white/30">
              {user?.google_avatar_url ? (
                <img
                  src={user.google_avatar_url}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span>{user ? getInitials(user.name) : "U"}</span>
              )}
            </div>
            <span className="hidden pr-1 text-[13px] font-medium text-navy-900 md:inline">
              {user?.name?.split(" ")[0] ?? "User"}
            </span>
            <ChevronDown className="mr-1 h-3.5 w-3.5 text-slate-500" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-[0_24px_70px_rgba(15,23,42,0.35)] ring-1 ring-white/30 backdrop-blur-[64px] backdrop-saturate-200">
              <div className="flex items-center gap-3 border-b border-white/20 bg-white/10 px-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white ring-1 ring-white/30">
                  {user?.google_avatar_url ? (
                    <img
                      src={user.google_avatar_url}
                      alt={user.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{user ? getInitials(user.name) : "U"}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-600">{user?.email}</p>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => handleNavigate("/profile")}
                  className="flex w-full items-center gap-3 bg-transparent px-4 py-2.5 text-sm text-slate-800 transition-colors hover:bg-white/45"
                >
                  <UserRound className="h-4 w-4 text-slate-600" /> User Profile
                </button>

                <button
                  onClick={() => handleNavigate("/inbox")}
                  className="flex w-full items-center gap-3 bg-transparent px-4 py-2.5 text-sm text-slate-800 transition-colors hover:bg-white/45"
                >
                  <Mail className="h-4 w-4 text-slate-600" />
                  <span>Inbox</span>

                  {unreadCount > 0 && (
                    <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNavigate("/accounts")}
                  className="flex w-full items-center gap-3 bg-transparent px-4 py-2.5 text-sm text-slate-800 transition-colors hover:bg-white/45"
                >
                  <Users className="h-4 w-4 text-slate-600" /> Connected Accounts
                </button>
                <button
                  onClick={() => handleNavigate("/settings")}
                  className="flex w-full items-center gap-3 bg-transparent px-4 py-2.5 text-sm text-slate-800 transition-colors hover:bg-white/45"
                >
                  <Settings className="h-4 w-4 text-slate-600" /> Settings
                </button>
                <button
                  onClick={() => handleNavigate("/settings/appearance")}
                  className="flex w-full items-center gap-3 bg-transparent px-4 py-2.5 text-sm text-slate-800 transition-colors hover:bg-white/45"
                >
                  <Palette className="h-4 w-4 text-slate-600" /> Appearance
                </button>
                <button
                  onClick={() => {
                    closeDropdown();
                    window.location.href = "mailto:support@nexapa.me?subject=Nexapa%20Support";
                  }}
                  className="flex w-full items-center gap-3 bg-transparent px-4 py-2.5 text-sm text-slate-800 transition-colors hover:bg-white/45"
                >
                  <LifeBuoy className="h-4 w-4 text-slate-600" />
                  <div className="flex flex-col items-start">
                    <span>Help &amp; Support</span>
                    <span className="text-[11px] text-slate-600">support@nexapa.me</span>
                  </div>
                </button>
              </div>

              <div className="border-t border-white/20 pt-1">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" /> {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
