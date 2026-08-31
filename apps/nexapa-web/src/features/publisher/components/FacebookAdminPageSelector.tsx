import {
  ChevronRight,
  ExternalLink,
  RefreshCcw,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  getConnectedAccountsPaginated,
  type ConnectedAccount,
} from "@/lib/api/connected-accounts";
import type { DestinationAccount } from "../publisher.types";
import { DestinationAccountCard } from "./DestinationAccountCard";

type Props = {
  pages: DestinationAccount[];
  selectedIds: Set<string>;
  search: string;
  onSearch: (value: string) => void;
  onToggle: (id: string) => void;
  onOpenConnectedAccounts: () => void;
  onRefresh?: () => void;
  refreshLoading?: boolean;
};

export function FacebookAdminPageSelector({
  pages,
  selectedIds,
  search,
  onSearch,
  onToggle,
  onOpenConnectedAccounts,
  onRefresh,
  refreshLoading,
}: Props) {
  const [admins, setAdmins] = useState<ConnectedAccount[]>([]);
  const [selectedAdminId, setSelectedAdminId] =
    useState<string | null>(null);
  const [pageSearch, setPageSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAdmins(signal?: AbortSignal) {
    setLoading(true);
    setError(null);

    try {
      const first = await getConnectedAccountsPaginated({
        platform: "facebook",
        account_type: "facebook_admin",
        status: "connected",
        page: 1,
        per_page: 100,
        signal,
      });

      const all = [...(first.data ?? [])];
      const lastPage = first.pagination?.last_page ?? 1;

      for (
        let currentPage = 2;
        currentPage <= lastPage;
        currentPage++
      ) {
        const response =
          await getConnectedAccountsPaginated({
            platform: "facebook",
            account_type: "facebook_admin",
            status: "connected",
            page: currentPage,
            per_page: 100,
            signal,
          });

        all.push(...(response.data ?? []));
      }

      setAdmins(all);
    } catch (reason) {
      if (signal?.aborted) return;

      setError(
        reason instanceof Error
          ? reason.message
          : "Gagal mengambil akun Facebook Admin.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadAdmins(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedAdminId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }

    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedAdminId]);

  const selectedAdmin =
    admins.find((admin) => admin.id === selectedAdminId) ??
    null;

  const adminKeyword = search.trim().toLowerCase();

  const visibleAdmins = useMemo(() => {
    if (!adminKeyword) return admins;

    return admins.filter((admin) =>
      [
        admin.display_name,
        admin.username,
        admin.external_account_id,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(adminKeyword),
        ),
    );
  }, [admins, adminKeyword]);

  const adminPages = useMemo(() => {
    if (!selectedAdminId) return [];

    return pages.filter(
      (page) =>
        page.parentConnectedAccountId === selectedAdminId,
    );
  }, [pages, selectedAdminId]);

  const visiblePages = useMemo(() => {
    const keyword = pageSearch.trim().toLowerCase();
    if (!keyword) return adminPages;

    return adminPages.filter((page) =>
      `${page.label} ${page.identifier}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [adminPages, pageSearch]);

  function openModal(adminId: string) {
    setSelectedAdminId(adminId);
    setPageSearch("");
  }

  function closeModal() {
    setSelectedAdminId(null);
    setPageSearch("");
  }

  function selectPage(pageId: string) {
    onToggle(pageId);
    closeModal();
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
        <div className="border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-slate-500" />
              <div>
                <h3 className="text-[13px] font-semibold text-slate-900">
                  Facebook Accounts
                </h3>
                <p className="text-[10px] text-slate-500">
                  Click an account to choose a Page
                </p>
              </div>
            </div>

            <div className="flex gap-2 text-[10px]">
              <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-slate-600">
                {admins.length} accounts
              </span>
              <span className="rounded-full border border-blue-400/25 bg-blue-500/12 px-2 py-0.5 font-medium text-blue-800">
                {selectedIds.size} selected
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {admins.length > 0 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  onSearch(event.target.value)
                }
                placeholder="Search Facebook accounts..."
                className="h-9 w-full rounded-xl border border-white/20 bg-white/12 pl-8 pr-3 text-[12px] outline-none placeholder:text-slate-500 focus:border-blue-400/60 focus:bg-white/20 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          )}

          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <RefreshCcw className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-5 text-center">
              <p className="text-[12px] text-red-800">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadAdmins()}
                className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white"
              >
                Try again
              </button>
            </div>
          ) : visibleAdmins.length === 0 ? (
            <EmptyState
              onManage={onOpenConnectedAccounts}
              onRefresh={onRefresh}
              refreshLoading={refreshLoading}
            />
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {visibleAdmins.map((admin) => {
                const accountPages = pages.filter(
                  (page) =>
                    page.parentConnectedAccountId ===
                    admin.id,
                );

                const selectedPage = accountPages.find(
                  (page) => selectedIds.has(page.id),
                );

                return (
                  <button
                    key={admin.id}
                    type="button"
                    onClick={() => openModal(admin.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selectedPage
                        ? "border-blue-400/35 bg-blue-500/12 ring-1 ring-blue-400/20"
                        : "border-white/10 bg-white/6 hover:border-blue-400/25 hover:bg-white/15"
                    }`}
                  >
                    {admin.avatar_url ? (
                      <img
                        src={admin.avatar_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                        {initials(admin.display_name)}
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-slate-900">
                        {admin.display_name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {selectedPage
                          ? `Selected: ${selectedPage.label}`
                          : `${accountPages.length} Facebook Pages`}
                      </span>
                    </span>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selectedAdmin &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="facebook-page-modal-title"
              className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950/95 text-white shadow-2xl ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {selectedAdmin.avatar_url && (
                    <img
                      src={selectedAdmin.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}

                  <div className="min-w-0">
                    <h2
                      id="facebook-page-modal-title"
                      className="truncate text-[16px] font-semibold"
                    >
                      {selectedAdmin.display_name}
                    </h2>
                    <p className="text-[11px] text-white/60">
                      Select one of {adminPages.length} Facebook
                      Pages
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
                  aria-label="Close Page selector"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="border-b border-white/10 px-5 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    autoFocus
                    type="search"
                    value={pageSearch}
                    onChange={(event) =>
                      setPageSearch(event.target.value)
                    }
                    placeholder="Search Facebook Pages..."
                    className="h-10 w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-3 text-[12px] text-white outline-none placeholder:text-white/40 focus:border-blue-400/60 focus:bg-white/15 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {visiblePages.length === 0 ? (
                  <div className="flex min-h-52 items-center justify-center text-center">
                    <div>
                      <UsersRound className="mx-auto h-8 w-8 text-white/30" />
                      <p className="mt-3 text-[13px] text-white/65">
                        {pageSearch
                          ? "No Page matches your search."
                          : "No Facebook Page is synchronized."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visiblePages.map((page) => (
                      <DestinationAccountCard
                        key={page.id}
                        account={page}
                        selected={selectedIds.has(page.id)}
                        onToggle={selectPage}
                        singleSelect
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-[11px] text-white/60">
                <span>
                  {visiblePages.length} Page
                  {visiblePages.length !== 1 ? "s" : ""}
                </span>
                <span>ESC to close</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function EmptyState({
  onManage,
  onRefresh,
  refreshLoading,
}: {
  onManage: () => void;
  onRefresh?: () => void;
  refreshLoading?: boolean;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/8 p-6 text-center">
      <p className="text-[13px] font-medium text-slate-800">
        No Facebook Admin accounts
      </p>
      <p className="mt-1 text-[11px] text-slate-600">
        Reconnect Facebook to synchronize accounts and Pages.
      </p>

      <div className="mt-4 flex justify-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${
                refreshLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        )}

        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Manage
        </button>
      </div>
    </div>
  );
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
