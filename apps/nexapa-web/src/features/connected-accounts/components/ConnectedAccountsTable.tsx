import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, RefreshCw, Star, Users } from "lucide-react";
import { PlatformLogo } from "./PlatformLogo";
import { getInitials, formatDateTime } from "../connected-accounts.utils";
import type { ConnectedAccount } from "../connected-accounts.types";
import { STATUS_LABEL } from "../connected-accounts.types";
import type { AccountPlatform } from "../connected-accounts.types";
import { PortalDropdown } from "../../../components/common/PortalDropdown";

type AccountPlatformFilter = "all" | AccountPlatform;

type Props = {
  filteredAccounts: ConnectedAccount[];
  selectedPlatform: AccountPlatformFilter;
  onRefresh: (accountId: string) => void;
  onSetDefault: (accountId: string) => void;
  onRemove: (accountId: string) => void;
  onReconnect: (accountId: string) => void;
  actionLoading: {
    reconnectingId: string | null;
    refreshingId: string | null;
    settingDefaultId: string | null;
    removingId: string | null;
  };
  onConnect: () => void;
  onConnectPlatform: (platform: AccountPlatform) => void;
};

function isFacebookAdmin(account: ConnectedAccount): boolean {
  return account.platform === "facebook" && account.account_type === "facebook_admin";
}

function buildHierarchicalAccounts(accounts: ConnectedAccount[]): ConnectedAccount[] {
  const facebookAdmins = accounts.filter(isFacebookAdmin);
  const otherAccounts = accounts.filter(a => a.platform !== "facebook");

  const result: ConnectedAccount[] = [
    ...facebookAdmins,
    ...otherAccounts,
  ];

  return result;
}

type StatusGlass = {
  label: string;
  tone: string;
};

function getStatusGlassTone(status: string): StatusGlass {
  switch (status) {
    case "connected":
      return { label: "Connected", tone: "bg-emerald-500/12 border border-emerald-500/25 text-emerald-800" };
    case "disconnected":
      return { label: "Disconnected", tone: "bg-red-400/12 border border-red-400/25 text-red-800" };
    case "expired":
      return { label: "Expired", tone: "bg-amber-400/12 border border-amber-400/25 text-amber-800" };
    case "error":
      return { label: "Error", tone: "bg-red-400/12 border border-red-400/25 text-red-800" };
    default:
      return { label: status, tone: "bg-white/10 border border-white/20 text-slate-700" };
  }
}

export function ConnectedAccountsTable({
  filteredAccounts,
  selectedPlatform,
  onRefresh,
  onSetDefault,
  onRemove,
  onReconnect,
  actionLoading,
  onConnect,
  onConnectPlatform,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const navigate = useNavigate();
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const hierarchicalAccounts = buildHierarchicalAccounts(filteredAccounts);
  const facebookAdminAccounts = hierarchicalAccounts.filter(isFacebookAdmin);
  const nonFacebookAccounts = hierarchicalAccounts.filter((a) => a.platform !== "facebook");
  // Keep original grouping: facebook_pages are intentionally excluded here as per legacy logic, but support orphan display
  const facebookPageAccounts = filteredAccounts.filter((a) => a.platform === "facebook" && a.account_type === "facebook_page");
  const orphanPages = facebookPageAccounts.filter((page) => {
    const parentId = page.parent_connected_account_id;
    if (!parentId) return true;
    return !facebookAdminAccounts.some((admin) => admin.id === parentId || admin.external_account_id === parentId);
  });

  const getHeaderInfo = () => {
    switch (selectedPlatform) {
      case "tiktok":
        return {
          title: "Connected Accounts",
          subtitle: "TikTok accounts available for publishing.",
          count: filteredAccounts.length,
          countLabel: "TikTok accounts",
        };
      case "facebook":
        return {
          title: "Connected Accounts",
          subtitle: "Facebook admin accounts with managed Pages hierarchy.",
          count: filteredAccounts.length,
          countLabel: "Facebook accounts",
        };
      case "all":
      default:
        return {
          title: "Connected Accounts",
          subtitle: "All accounts available for publishing.",
          count: filteredAccounts.length,
          countLabel: "All accounts",
        };
    }
  };

  const getEmptyState = () => {
    switch (selectedPlatform) {
      case "tiktok":
        return {
          title: "No TikTok accounts connected",
          description: "Connect a TikTok account to start publishing and scheduling.",
          button: "Connect TikTok",
          onClick: () => onConnectPlatform("tiktok"),
        };
      case "facebook":
        return {
          title: "No Facebook Pages connected",
          description: "Connect a Facebook Page to start publishing and scheduling.",
          button: "Connect Facebook",
          onClick: () => onConnectPlatform("facebook"),
        };
      case "all":
      default:
        return {
          title: "No connected accounts yet",
          description: "Connect TikTok or Facebook to start publishing.",
          button: "Connect Account",
          onClick: onConnect,
        };
    }
  };

  const headerInfo = getHeaderInfo();
  const emptyState = getEmptyState();

  const renderAccountCard = (account: ConnectedAccount) => {
    const isAdmin = isFacebookAdmin(account);
    const isPage = account.platform === "facebook" && account.account_type === "facebook_page";
    const isReconnecting = actionLoading.reconnectingId === account.id;
    const isRefreshing = actionLoading.refreshingId === account.id;
    const isSettingDefault = actionLoading.settingDefaultId === account.id;
    const isRemoving = actionLoading.removingId === account.id;
    const isOpen = openMenuId === account.id;
    const statusGlass = getStatusGlassTone(account.status);

    const setTriggerRef = (element: HTMLButtonElement | null) => {
      if (element) {
        triggerRefs.current.set(account.id, element);
      } else {
        triggerRefs.current.delete(account.id);
      }
    };

    const triggerRefForAccount = {
      current: triggerRefs.current.get(account.id) || null,
    };

    if (isAdmin) {
      const childPages = facebookPageAccounts.filter((p) => {
        const parentId = p.parent_connected_account_id;
        return parentId && (parentId === account.id || parentId === account.external_account_id);
      });

      return (
        <div key={account.id} className="space-y-3">
          {/* Admin parent - light glass identical to TikTok per new spec */}
          <div
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/accounts/facebook/${account.id}/pages`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/accounts/facebook/${account.id}/pages`);
              }
            }}
            className="glass-card group cursor-pointer rounded-xl border border-white/20 p-4 shadow-card ring-1 ring-white/10 transition-all duration-200 hover:bg-white/15 hover:border-white/30"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/20 shadow-sm backdrop-blur-xl">
                  {account.avatar_url ? (
                    <img src={account.avatar_url} alt={account.display_name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-700">{getInitials(account.display_name)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="truncate text-[13px] font-semibold text-slate-950">{account.display_name}</div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-medium text-blue-800 backdrop-blur-xl">
                      <Users className="h-2.5 w-2.5" /> Admin
                    </span>
                    {childPages.length > 0 && (
                      <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 backdrop-blur-xl">
                        {childPages.length} {childPages.length === 1 ? "Page" : "Pages"}
                      </span>
                    )}
                  </div>
                  {account.username && <div className="truncate text-[11px] text-slate-600">@{account.username}</div>}
                  <div className="mt-1 text-[10px] font-medium text-slate-600">Tidak untuk Publish</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-xl ${statusGlass.tone}`}>
                      {STATUS_LABEL[account.status] ?? statusGlass.label}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[10px] text-slate-700 backdrop-blur-xl">
                      {account.connection_method === "oauth" ? "OAuth" : account.connection_method}
                    </span>
                    {account.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-800 backdrop-blur-xl">
                        <Star className="h-3 w-3 fill-amber-500" /> Default
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[10px] text-slate-600">{account.last_validated_at ? formatDateTime(account.last_validated_at) : "Never checked"}</div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 self-start">
                <button
                  ref={setTriggerRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(isOpen ? null : account.id);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-slate-700 backdrop-blur-xl transition hover:bg-white/25 hover:text-slate-900"
                  aria-label="Account actions"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                <PortalDropdown isOpen={isOpen} onClose={() => setOpenMenuId(null)} triggerRef={triggerRefForAccount}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onRefresh(account.id);
                      setOpenMenuId(null);
                    }}
                    disabled={isRefreshing}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-slate-700 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onReconnect(account.id);
                      setOpenMenuId(null);
                    }}
                    disabled={isReconnecting}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-slate-700 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? "animate-spin" : ""}`} />
                    Reconnect & Sync Pages
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpenMenuId(null); window.setTimeout(() => onRemove(account.id), 0); }}
                    disabled={isRemoving}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-rose-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </PortalDropdown>
              </div>
            </div>
          </div>

          {/* Child pages */}
          {childPages.length > 0 && (
            <div className="relative ml-3 border-l border-white/20 pl-5 sm:ml-6 sm:pl-6">
              <div className="space-y-2.5">
                {childPages.map((page) => {
                  const pageStatus = getStatusGlassTone(page.status);
                  const pIsOpen = openMenuId === page.id;
                  const pIsRefreshing = actionLoading.refreshingId === page.id;
                  const pIsSettingDefault = actionLoading.settingDefaultId === page.id;
                  const pIsRemoving = actionLoading.removingId === page.id;
                  const pSetRef = (el: HTMLButtonElement | null) => {
                    if (el) triggerRefs.current.set(page.id, el);
                    else triggerRefs.current.delete(page.id);
                  };
                  const pTriggerRef = { current: triggerRefs.current.get(page.id) || null };

                  return (
                    <div
                      key={page.id}
                      className="glass-subtle group rounded-lg border border-white/15 p-3 transition-all duration-200 hover:bg-white/12 hover:border-white/25"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/20 backdrop-blur-xl">
                            {page.avatar_url ? (
                              <img src={page.avatar_url} alt={page.display_name} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-700">{getInitials(page.display_name)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-[12px] font-semibold text-slate-900">{page.display_name}</span>
                              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 backdrop-blur-xl">Page</span>
                            </div>
                            {page.username && <div className="truncate text-[10px] text-slate-500">@{page.username}</div>}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xl ${pageStatus.tone}`}>
                                {STATUS_LABEL[page.status] ?? pageStatus.label}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-500">
                                <PlatformLogo platform={page.platform} className="h-3 w-3" />
                                {page.platform}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            ref={pSetRef}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(pIsOpen ? null : page.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-500 backdrop-blur-xl transition hover:bg-white/18 hover:text-slate-700"
                            aria-label="Page actions"
                            aria-haspopup="menu"
                            aria-expanded={pIsOpen}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          <PortalDropdown isOpen={pIsOpen} onClose={() => setOpenMenuId(null)} triggerRef={pTriggerRef}>
                            <button type="button" role="menuitem" onClick={() => { onRefresh(page.id); setOpenMenuId(null); }} disabled={pIsRefreshing} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-slate-700 hover:bg-white/10 disabled:opacity-50">
                              <RefreshCw className={`h-3.5 w-3.5 ${pIsRefreshing ? "animate-spin" : ""}`} /> Refresh
                            </button>
                            {!page.is_default && (
                              <button type="button" role="menuitem" onClick={() => { onSetDefault(page.id); setOpenMenuId(null); }} disabled={pIsSettingDefault} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-slate-700 hover:bg-white/10 disabled:opacity-50">
                                <Star className="h-3.5 w-3.5" /> Set as Default
                              </button>
                            )}
                            <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpenMenuId(null); window.setTimeout(() => onRemove(page.id), 0); }} disabled={pIsRemoving} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-rose-600 hover:bg-red-500/10 disabled:opacity-50">Remove</button>
                          </PortalDropdown>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Non-admin accounts - glass card 10%
    return (
      <div
        key={account.id}
        className={`glass-card group rounded-xl border p-4 shadow-card ring-1 ring-white/10 transition-all duration-200 hover:bg-white/15 hover:border-white/30 ${isPage ? "ml-3 border-l-2 border-l-white/20 sm:ml-6" : "border-white/20"}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/20 shadow-sm backdrop-blur-xl">
              {account.avatar_url ? (
                <img src={account.avatar_url} alt={account.display_name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-slate-700">{getInitials(account.display_name)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="truncate text-[13px] font-semibold text-slate-900">{account.display_name}</div>
                {isPage && <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 backdrop-blur-xl">Page</span>}
              </div>
              {account.username && <div className="truncate text-[11px] text-slate-500">@{account.username}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xl ${statusGlass.tone}`}>
                  {STATUS_LABEL[account.status] ?? statusGlass.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] text-slate-600 backdrop-blur-xl">
                  <PlatformLogo platform={account.platform} className="h-3.5 w-3.5" />
                  {account.platform}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                  {account.connection_method === "oauth" ? "OAuth" : account.connection_method}
                </span>
                {account.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-800 backdrop-blur-xl">
                    <Star className="h-3 w-3 fill-amber-500" /> Default
                  </span>
                )}
              </div>
              <div className="mt-1.5 text-[10px] text-slate-500">{account.last_validated_at ? formatDateTime(account.last_validated_at) : "Never checked"}</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 self-start">
            <button
              ref={setTriggerRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isOpen ? null : account.id);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-500 backdrop-blur-xl transition hover:bg-white/18 hover:text-slate-700"
              aria-label="Account actions"
              aria-haspopup="menu"
              aria-expanded={isOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            <PortalDropdown isOpen={isOpen} onClose={() => setOpenMenuId(null)} triggerRef={triggerRefForAccount}>
              <button type="button" role="menuitem" onClick={() => { onRefresh(account.id); setOpenMenuId(null); }} disabled={isRefreshing} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-slate-700 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
              {account.platform === "tiktok" && (
                <button type="button" role="menuitem" onClick={() => { onReconnect(account.id); setOpenMenuId(null); }} disabled={isReconnecting} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-slate-700 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? "animate-spin" : ""}`} /> Reconnect TikTok
                </button>
              )}
              {!isFacebookAdmin(account) && !account.is_default && (
                <button type="button" role="menuitem" onClick={() => { onSetDefault(account.id); setOpenMenuId(null); }} disabled={isSettingDefault} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-slate-700 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                  <Star className="h-3.5 w-3.5" /> Set as Default
                </button>
              )}
              <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpenMenuId(null); window.setTimeout(() => onRemove(account.id), 0); }} disabled={isRemoving} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-rose-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50">
                Remove
              </button>
            </PortalDropdown>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="mt-5 space-y-4 bg-transparent">
      <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-slate-900">{headerInfo.title}</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">{headerInfo.countLabel} ({headerInfo.count}) • {headerInfo.subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {hierarchicalAccounts.length} total
        </div>
      </div>

      {hierarchicalAccounts.length === 0 && orphanPages.length === 0 ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/20 shadow-sm backdrop-blur-xl">
              <Users className="h-5 w-5 text-slate-500" />
            </div>
            <h3 className="text-[13px] font-semibold text-slate-900">{emptyState.title}</h3>
            <p className="mt-1 max-w-[320px] text-[11px] leading-4 text-slate-600">{emptyState.description}</p>
            <button type="button" onClick={emptyState.onClick} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              {emptyState.button}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 bg-transparent">
          {facebookAdminAccounts.map((acc) => renderAccountCard(acc))}
          {nonFacebookAccounts.map((acc) => renderAccountCard(acc))}
          {orphanPages.length > 0 && selectedPlatform !== "tiktok" && (
            <>
              <div className="pt-2">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/15" />
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-500 backdrop-blur-xl">Orphan Pages</span>
                  <div className="h-px flex-1 bg-white/15" />
                </div>
              </div>
              {orphanPages.map((acc) => renderAccountCard(acc))}
            </>
          )}
        </div>
      )}

      <div
        data-connect-buttons-below-list
        className="flex flex-wrap gap-2 border-t border-white/15 pt-4"
      >
        {(selectedPlatform === "all" || selectedPlatform === "tiktok") && (
          <button
            type="button"
            onClick={() => onConnectPlatform("tiktok")}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            + Connect TikTok
          </button>
        )}

        {(selectedPlatform === "all" || selectedPlatform === "facebook") && (
          <button
            type="button"
            onClick={() => onConnectPlatform("facebook")}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            + Connect Facebook
          </button>
        )}
      </div>
    </section>
  );
}
