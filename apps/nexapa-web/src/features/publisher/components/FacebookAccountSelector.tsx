import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, Check, Search, RotateCcw } from "lucide-react";
import { getConnectedAccountsPaginated, type ConnectedAccount } from "@/lib/api/connected-accounts";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";

type Props = {
  open: boolean;
  onClose: () => void;
  profiles: ConnectedAccount[];
  selectedProfileId: string | null;
  onSelect: (profile: ConnectedAccount) => void;
};

export function FacebookAccountSelector({ open, onClose, profiles, selectedProfileId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localProfiles, setLocalProfiles] = useState<ConnectedAccount[]>([]);
  const [pagination, setPagination] = useState<{ current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null } | null>(null);
  const [pagesCountMap, setPagesCountMap] = useState<Map<string, number>>(new Map());
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ignoreRef = useRef(false);

  const fetchProfiles = useCallback(async (searchTerm?: string) => {
    if (ignoreRef.current) return;

    setLoading(true);
    setError(null);
    try {
      const response = await getConnectedAccountsPaginated({
        platform: "facebook",
        account_type: "facebook_admin",
        status: "connected",
        search: searchTerm,
        page: 1,
        per_page: 50,
      });

      if (ignoreRef.current) return;

      setLocalProfiles(response.data);
      setPagination(response.pagination);

      const pagesMap = new Map<string, number>();
      for (const profile of response.data) {
        try {
          const pagesResp = await getConnectedAccountsPaginated({
            platform: "facebook",
            account_type: "facebook_page",
            status: "connected",
            parent_connected_account_id: profile.id,
            page: 1,
            per_page: 1,
          });

          if (ignoreRef.current) return;

          pagesMap.set(profile.id, pagesResp.pagination?.total ?? 0);
        } catch {
          if (ignoreRef.current) return;
          pagesMap.set(profile.id, 0);
        }
      }

      if (ignoreRef.current) return;
      setPagesCountMap(pagesMap);
    } catch (err) {
      if (ignoreRef.current) return;

      let errorMessage = "Failed to load Facebook profiles";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      if (err && typeof err === "object" && "message" in err) {
        errorMessage = String(err.message);
      }
      setError(errorMessage);
      setLocalProfiles([]);
      setPagination(null);
    } finally {
      if (!ignoreRef.current) setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      if (profiles.length > 0) {
        setLocalProfiles(profiles);
      } else {
        // Trigger initial fetch through search effect
      }
    }
  }, [open, profiles]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (open) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchProfiles(search || undefined);
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, open, fetchProfiles]);

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
    return () =>      {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const filteredProfiles = useMemo(() => {
    if (!search) return localProfiles;
    return localProfiles.filter((profile) =>
      profile.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (profile.username && profile.username.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, localProfiles]);

  const handleSelect = (profile: ConnectedAccount) => {
    onSelect(profile);
    onClose();
  };

  const handleRetry = () => {
    fetchProfiles(search || undefined);
  };

  if (!open) return null;

  const total = pagination?.total ?? localProfiles.length;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="facebook-account-selector-title" className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/78 shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl"><div><h2 id="facebook-account-selector-title" className="text-[16px] font-semibold text-white">Select Facebook Account</h2><p className="mt-0.5 text-[11px] text-white/60">Choose a Facebook profile to access its Pages</p></div><button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 backdrop-blur-xl hover:bg-white/15" aria-label="Close dialog"><X className="h-3.5 w-3.5" /></button></div>

        <div className="border-b border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Facebook profiles..." disabled={loading} className="w-full rounded-xl border border-white/15 bg-white/8 py-2 pl-9 pr-3 text-[12px] text-white backdrop-blur-xl placeholder:text-white/40 focus:border-blue-400/60 focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:bg-white/5" /></div>
        </div>

        <div className="overflow-y-auto bg-transparent" style={{ maxHeight: "calc(80vh - 220px)" }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /><p className="mt-3 text-[12px] text-white/60">Loading Facebook profiles...</p></div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center"><RotateCcw className="h-8 w-8 text-white/30" /><p className="mt-3 text-[12px] text-white/70">{error}</p><button type="button" onClick={handleRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-xl hover:bg-white/15"><RotateCcw className="h-3 w-3" /> Retry</button></div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center"><p className="text-[12px] text-white/60">{search ? "No Facebook profiles match your search." : "No Facebook profiles available."}</p></div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredProfiles.map((profile) => {
                const isSelected = selectedProfileId === profile.id;
                const pagesCount = pagesCountMap.get(profile.id) ?? 0;
                return (
                  <label key={profile.id} className={`flex w-full cursor-pointer items-center gap-3 px-5 py-3 backdrop-blur-xl transition ${isSelected ? "border-l-2 border-l-blue-400/50 bg-blue-400/15" : "hover:bg-white/8"}`}>
                    <div className="relative flex h-5 w-5 items-center justify-center"><SelectionCheckbox type="radio" name="facebook-account" checked={isSelected} onChange={() => handleSelect(profile)} ariaLabel={`${isSelected ? "Selected" : "Select"} ${profile.display_name}`} /></div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white backdrop-blur-xl">{profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name} className="h-10 w-10 rounded-full object-cover" /> : <span className="text-[12px] font-semibold text-slate-700">{profile.display_name.charAt(0).toUpperCase()}</span>}</div>
                    <div className="min-w-0 flex-1 text-left"><p className="truncate text-[13px] font-medium text-white">{profile.display_name}</p><p className="truncate text-[10px] text-white/60">{profile.username ?? profile.id.slice(0, 12)}</p></div>
                    <div className="shrink-0 text-right"><span className="block text-[13px] font-semibold text-white">{pagesCount}</span><span className="text-[9px] text-white/60">Pages</span></div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <p className="text-[11px] text-white/70">{pagination ? <>Showing <span className="font-medium text-white">{pagination.from}</span>–<span className="font-medium text-white">{pagination.to}</span> of <span className="font-medium text-white">{total}</span> profiles</> : `${total} profile${total !== 1 ? "s" : ""}`}</p>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-[12px] font-medium text-white backdrop-blur-xl hover:bg-white/15">Cancel</button>
        </div>
      </div>
    </>
  );
}
