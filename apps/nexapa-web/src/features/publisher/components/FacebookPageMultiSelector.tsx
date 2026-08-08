import { useState, useMemo, useRef, useEffect } from "react";
import { X, Check, Search, RotateCcw } from "lucide-react";
import {
  getConnectedAccountsPaginated,
  type ConnectedAccount,
} from "@/lib/api/connected-accounts";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  parentAccountId?: string | null;
  onPagesFetched?: (pages: ConnectedAccount[]) => void;
};

export function FacebookPageMultiSelector({ open, onClose, selectedIds, onChange, parentAccountId, onPagesFetched }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "selected">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<ConnectedAccount[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Reset state when dialog opens
  useEffect(() => {
    if (!open) {
      setLoading(false);
      return;
    }

    if (!parentAccountId) {
      setPages([]);
      setError("Facebook Admin account is unavailable.");
      setLoading(false);
      return;
    }

    setSearch("");
    setActiveTab("all");
    // Load pages through search effect below
  }, [open, parentAccountId, retryCount]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch Facebook Pages belonging to the selected Facebook admin account.
  useEffect(() => {
    if (!open || !parentAccountId) return;

    const controller = new AbortController();

    const loadPages = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getConnectedAccountsPaginated({
          platform: "facebook",
          account_type: "facebook_page",
          status: "connected",
          is_publishable: true,
          parent_connected_account_id: parentAccountId,
          per_page: 100,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setPages(response.data ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;

        console.error("Failed to load Facebook Pages", fetchError);
        setPages([]);
        setError("Failed to load Facebook Pages.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadPages();

    return () => controller.abort();
  }, [open, parentAccountId, retryCount]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const selectedCount = selectedIds.length;

  const visiblePages = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const searchedPages = normalizedSearch
      ? pages.filter((page) => page.display_name.toLowerCase().includes(normalizedSearch))
      : pages;
    return activeTab === "selected"
      ? searchedPages.filter((page) => selectedIds.includes(page.id))
      : searchedPages;
  }, [activeTab, pages, search, selectedIds]);

  const togglePage = (pageId: string) => {
    if (selectedIds.includes(pageId)) {
      onChange(selectedIds.filter((id) => id !== pageId));
    } else if (selectedIds.length < 10) {
      onChange([...selectedIds, pageId]);
    }
  };

  const selectAllVisible = () => {
    const availableIds = visiblePages
      .filter((p) => !selectedIds.includes(p.id))
      .map((p) => p.id);

    if (availableIds.length === 0) return;

    const newSelected = Array.from(
      new Set([...selectedIds, ...availableIds])
    ).slice(0, 10);

    onChange(newSelected);

  };

  const clearSelection = () => {
    onChange([]);
  };

  const handleConfirm = () => {
    onPagesFetched?.(pages);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="facebook-page-selector-title"
          className="!fixed !left-1/2 !top-1/2 z-50 !flex !h-[min(720px,calc(100vh-32px))] !min-h-[420px] !w-[calc(100vw-32px)] !max-w-[700px] !-translate-x-1/2 !-translate-y-1/2 !flex-col !overflow-hidden !p-0 rounded-2xl border border-white/10 bg-slate-950/78 shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex shrink-0 items-center justify-between bg-white/5 px-5 pb-3 pt-4 backdrop-blur-xl">
          <div className="min-w-0"><h2 id="facebook-page-selector-title" className="text-[16px] font-semibold text-white">Select Facebook Pages</h2></div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white" aria-label="Close dialog"><X className="h-3.5 w-3.5" /></button>
        </div>

        <div className="shrink-0 border-b border-white/10 bg-white/5 px-5 pb-3 backdrop-blur-xl"><p className="text-[11px] leading-5 text-white/60">Choose up to 10 Pages for bulk scheduling.</p></div>

        <div className="shrink-0 border-b border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Facebook Pages..." disabled={loading || activeTab === "selected"} className="w-full rounded-xl border border-white/15 bg-white/8 py-2 pl-9 pr-3 text-[12px] text-white backdrop-blur-xl placeholder:text-white/40 focus:border-blue-400/60 focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:bg-white/5" /></div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/5 px-5 backdrop-blur-xl">
          <div className="flex gap-1">
            <button type="button" onClick={() => { setActiveTab("all"); setSearch(""); }} className={`relative rounded-t-lg border px-4 py-2 text-[12px] font-medium backdrop-blur-xl transition ${activeTab === "all" ? "border-white/20 bg-white/15 text-white shadow-sm" : "border-transparent bg-transparent text-white/60 hover:bg-white/8 hover:text-white/80"}`}>All Pages ({pages.length})</button>
            <button type="button" onClick={() => setActiveTab("selected")} disabled={selectedCount === 0} className={`relative rounded-t-lg border px-4 py-2 text-[12px] font-medium backdrop-blur-xl transition ${activeTab === "selected" ? "border-white/20 bg-white/15 text-white shadow-sm" : "border-transparent bg-transparent text-white/60 hover:bg-white/8 hover:text-white/80"} disabled:opacity-40 disabled:cursor-not-allowed`}>Selected ({selectedCount})</button>
          </div>
          <div className="flex items-center gap-2 py-2">
            <label className="flex items-center gap-2 text-[11px] text-white/70"><SelectionCheckbox checked={visiblePages.length > 0 && visiblePages.every((p) => selectedIds.includes(p.id))} onChange={(e) => e.target.checked ? selectAllVisible() : clearSelection()} disabled={visiblePages.length === 0 || loading} ariaLabel="Select all visible Facebook Pages" className="h-3.5 w-3.5" /> Select Visible</label>
            {selectedCount > 0 && <button type="button" onClick={clearSelection} className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur-xl hover:bg-white/12">Clear selection</button>}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-transparent">
          {loading ? (
            <div className="flex h-full min-h-[200px] items-center justify-center"><div className="flex flex-col items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /><p className="mt-3 text-[12px] text-white/60">Loading Facebook Pages...</p></div></div>
          ) : error ? (
            <div className="flex h-full min-h-[200px] items-center justify-center"><div className="flex flex-col items-center text-center"><RotateCcw className="h-8 w-8 text-white/30" /><p className="mt-3 text-[12px] text-white/70">{error}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-xl hover:bg-white/15"><RotateCcw className="h-3 w-3" /> Retry</button></div></div>
          ) : visiblePages.length === 0 ? (
            <div className="flex h-full min-h-[200px] items-center justify-center"><div className="flex flex-col items-center text-center"><p className="text-[12px] text-white/60">{activeTab === "selected" ? "No Facebook Pages selected yet." : search ? "No Facebook Pages match your search." : "No Facebook Pages available."}</p></div></div>
          ) : (
            <div className="divide-y divide-white/10">
              {visiblePages.map((page) => {
                const isSelected = selectedIds.includes(page.id);
                const isDisabled = !isSelected && selectedCount >= 10;
                return (
                  <label key={page.id} className={`flex items-center gap-3 px-5 py-3 backdrop-blur-xl transition ${isSelected ? "bg-blue-400/15 border-blue-400/35" : "bg-white/5 hover:bg-white/8"} ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer border-l-2 border-transparent"} ${isSelected ? "border-l-blue-400/50" : ""}`}>
                    <SelectionCheckbox checked={isSelected} onChange={() => !isDisabled && togglePage(page.id)} disabled={isDisabled} ariaLabel={`${isSelected ? "Deselect" : "Select"} ${page.display_name}`} />
                    <PageAvatar page={page} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-white">{page.display_name}</span>
                        {page.is_default && <span className="shrink-0 rounded-full border border-blue-400/30 bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-medium text-blue-100 backdrop-blur-xl">Default</span>}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-[11px] text-white/70"><span className="font-semibold text-white">{selectedCount}</span> Facebook Page{selectedCount !== 1 ? "s" : ""} selected</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-[12px] font-medium text-white backdrop-blur-xl transition hover:bg-white/15">Cancel</button>
              <button type="button" onClick={handleConfirm} disabled={selectedCount === 0} className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-4 text-[12px] font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">Use {selectedCount} Page{selectedCount !== 1 ? "s" : ""}</button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

function PageAvatar({ page }: { page: ConnectedAccount }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(page.avatar_url) && !imageFailed;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/20 text-[11px] font-semibold text-white backdrop-blur-xl">
      {showImage ? <img src={page.avatar_url!} alt="" className="h-10 w-10 object-cover" onError={() => setImageFailed(true)} /> : page.display_name.charAt(0).toUpperCase()}
    </div>
  );
}
