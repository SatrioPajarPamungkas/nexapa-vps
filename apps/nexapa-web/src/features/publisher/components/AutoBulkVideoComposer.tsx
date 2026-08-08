import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock3, ChevronRight, X, ArrowLeft, Film } from "lucide-react";
import { SchedulerMediaUploader } from "@/features/scheduler/components/SchedulerMediaUploader";
import type { SchedulerUploadItem } from "@/features/scheduler/lib/upload-helpers";
import { createBatchSchedule } from "@/lib/api/scheduler";
import { getConnectedAccountsPaginated, type ConnectedAccount } from "@/lib/api/connected-accounts";
import { PRIVACY_LEVEL_MAP, type DestinationAccount, type TikTokPrivacy } from "../publisher.types";
import { FacebookPageMultiSelector } from "./FacebookPageMultiSelector";
import { getMediaAsset } from "@/lib/api/media-assets";
import type { MediaLibraryTransferState } from "@/lib/media-library-transfer";
import { apiFetchBlob } from "@/lib/api/client";

type BulkItem = SchedulerUploadItem & { caption: string; date: string; time: string };

type Props = {
  platform: "facebook" | "tiktok";
  accounts: DestinationAccount[];
  pendingMediaLibraryTransfer?: MediaLibraryTransferState | null;
  onMediaLibraryTransferHydrated?: (transfer: MediaLibraryTransferState) => void;
};

type FacebookProfileState = {
  loading: boolean;
  error: string | null;
  profiles: ConnectedAccount[];
  selectedProfileId: string | null;
  availablePagesCount: number;
};

const intervals = [5, 10, 15, 30, 60, 120];

function initialStart() {
  const start = new Date(Date.now() + 10 * 60 * 1000);
  start.setSeconds(0, 0);
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60_000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

export function AutoBulkVideoComposer({ platform, accounts: _accounts, pendingMediaLibraryTransfer, onMediaLibraryTransferHydrated }: Props) {
  const initial = useMemo(initialStart, []);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedFacebookPageIds, setSelectedFacebookPageIds] = useState<string[]>([]);
  const [facebookModalOpen, setFacebookModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"account" | "pages">("account");
  const [facebookPages, setFacebookPages] = useState<ConnectedAccount[]>([]);
  const [startDate, setStartDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.time);
  const [interval, setInterval] = useState(30);
  const [privacy, setPrivacy] = useState<TikTokPrivacy>("only_me");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [facebookProfile, setFacebookProfile] = useState<FacebookProfileState>({
    loading: true,
    error: null,
    profiles: [],
    selectedProfileId: null,
    availablePagesCount: 0,
  });
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const submitInFlight = useRef(false);
  const hydrateAttemptedRef = useRef(false);



  const fetchFacebookProfile = useCallback(async () => {
    if (platform !== "facebook") return;

    try {
      const response = await getConnectedAccountsPaginated({
        platform: "facebook",
        account_type: "facebook_admin",
        status: "connected",
        page: 1,
        per_page: 100,
      });

      const adminAccounts = response.data;

      if (adminAccounts.length === 0) {
        setFacebookProfile({
          loading: false,
          error: null,
          profiles: [],
          selectedProfileId: null,
          availablePagesCount: 0,
        });
        return;
      }

      if (adminAccounts.length === 1) {
        const pagesResponse = await getConnectedAccountsPaginated({
          platform: "facebook",
          account_type: "facebook_page",
          status: "connected",
          parent_connected_account_id: adminAccounts[0].id,
          page: 1,
          per_page: 1,
        });

        setFacebookProfile({
          loading: false,
          error: null,
          profiles: adminAccounts,
          selectedProfileId: adminAccounts[0].id,
          availablePagesCount: pagesResponse.pagination?.total ?? 0,
        });
        return;
      }

      setFacebookProfile({
        loading: false,
        error: null,
        profiles: adminAccounts,
        selectedProfileId: null,
        availablePagesCount: 0,
      });
    } catch (err) {
      setFacebookProfile({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load Facebook profile",
        profiles: [],
        selectedProfileId: null,
        availablePagesCount: 0,
      });
    }
  }, [platform]);

  const selectedPageCount = selectedFacebookPageIds.length;




  const handleProfileChange = useCallback(async (profile: ConnectedAccount) => {
    const isSameProfile = facebookProfile.selectedProfileId === profile.id;
    setFacebookProfile((prev) => ({
      ...prev,
      profiles: prev.profiles.some((item) => item.id === profile.id) ? prev.profiles : [...prev.profiles, profile],
      selectedProfileId: profile.id,
      availablePagesCount: 0,
    }));
    if (!isSameProfile) {
      setSelectedFacebookPageIds([]);
      setFacebookPages([]);
    }
    setModalStep("pages");

    try {
      const pagesResponse = await getConnectedAccountsPaginated({
        platform: "facebook",
        account_type: "facebook_page",
        status: "connected",
        parent_connected_account_id: profile.id,
        page: 1,
        per_page: 1,
      });
      setFacebookProfile((prev) => ({
        ...prev,
        availablePagesCount: pagesResponse.pagination?.total ?? 0,
      }));
    } catch {
      setFacebookProfile((prev) => ({ ...prev, availablePagesCount: 0 }));
    }
  }, [facebookProfile.selectedProfileId]);

  const handleBackToAccount = useCallback(() => {
    setModalStep("account");
  }, []);

  const handleModalOpenChange = useCallback((open: boolean) => {
    setFacebookModalOpen(open);
    if (!open) {
      setModalStep("account");
    }
  }, []);

  useEffect(() => {
    fetchFacebookProfile();
  }, [fetchFacebookProfile]);

  useEffect(() => {
    if (!pendingMediaLibraryTransfer || hydrateAttemptedRef.current) return;
    if (pendingMediaLibraryTransfer.action !== "schedule") return;
    if (pendingMediaLibraryTransfer.mediaAssetIds.length === 0 || pendingMediaLibraryTransfer.mediaAssetIds.length > 50) return;

    hydrateAttemptedRef.current = true;

    const mediaAssetIds = pendingMediaLibraryTransfer.mediaAssetIds;
    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(
          mediaAssetIds.map(async (id) => {
            try {
              const asset = await getMediaAsset(id);
              return { id, asset, error: null as string | null };
            } catch (err) {
              return { id, asset: null as null, error: err instanceof Error ? err.message : "Failed to load" };
            }
          })
        );

        if (cancelled) return;

        const failed = results.filter((r) =>
          r.error
          || !r.asset
          || !["available", "archived"].includes(r.asset.status)
          || r.asset.media_type !== "video"
        );

        if (failed.length > 0) {
          const failedNames = failed
            .map((r) => {
              if (r.error && !r.asset) return `ID: ${r.id} - ${r.error}`;
              if (!r.asset) return `ID: ${r.id} - Not found`;
              if (!["available", "archived"].includes(r.asset.status)) return `"${r.asset.display_name}" - Status: ${r.asset.status}`;
              if (r.asset.media_type !== "video") return `"${r.asset.display_name}" - Not a video`;
              return `ID: ${r.id}`;
            })
            .join("; ");

          setHydrateError(`Failed to hydrate ${failed.length} media asset(s): ${failedNames}`);
          return;
        }

        const sortedAssets = results
          .filter((r): r is { id: string; asset: NonNullable<typeof r.asset>; error: null } => r.asset !== null)
          .sort((a, b) => mediaAssetIds.indexOf(a.id) - mediaAssetIds.indexOf(b.id))
          .map((r) => r.asset);

        const uploadItems: SchedulerUploadItem[] = sortedAssets.map((asset, index) => ({
          id: `hydrated-${asset.id}-${index}`,
          name: asset.display_name,
          file: null as unknown as File,
          mediaAssetId: asset.id,
          status: "ready" as const,
          mediaType: "video" as const,
          mimeType: asset.mime_type,
          fileSize: asset.size_bytes,
          size: asset.size_bytes,
          progress: 100,
          duration: asset.duration_seconds ?? 0,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          thumbnailUrl: asset.thumbnail_url,
          contentUrl: asset.content_url,
        }));

        setItems((current) => uploadItems.map((uploadItem) => {
          const existing = current.find((item) => item.id === uploadItem.id);
          return { ...uploadItem, caption: existing?.caption ?? "", date: existing?.date ?? "", time: existing?.time ?? "" };
        }));

        if (onMediaLibraryTransferHydrated) {
          onMediaLibraryTransferHydrated(pendingMediaLibraryTransfer);
        }
      } catch (err) {
        if (cancelled) return;
        setHydrateError(err instanceof Error ? err.message : "Failed to hydrate media from Media Library.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingMediaLibraryTransfer, onMediaLibraryTransferHydrated]);

  const handleFilesChange = useCallback((uploadItems: SchedulerUploadItem[]) => {
    setItems((current) => uploadItems.map((uploadItem) => {
      const existing = current.find((item) => item.id === uploadItem.id);
      return { ...uploadItem, caption: existing?.caption ?? "", date: existing?.date ?? "", time: existing?.time ?? "" };
    }));
  }, []);

  const applySchedule = useCallback(() => {
    const start = new Date(`${startDate}T${startTime}:00`);
    if (!startDate || !startTime || Number.isNaN(start.getTime())) {
      setError("Enter a valid start date and time.");
      return;
    }
    if (start.getTime() < Date.now() + 5 * 60 * 1000) {
      setError("Start time must be at least 5 minutes from now.");
      return;
    }
    setError(null);
    setItems((current) => current.map((item, index) => {
      const scheduled = new Date(start.getTime() + index * interval * 60_000);
      const local = new Date(scheduled.getTime() - scheduled.getTimezoneOffset() * 60_000).toISOString();
      return { ...item, date: local.slice(0, 10), time: local.slice(11, 16) };
    }));
  }, [interval, startDate, startTime]);

  const validItems = useMemo(() => {
    const minimum = Date.now() + 5 * 60 * 1000;
    return items.filter((item) => {
      if (item.status !== "ready" || !item.mediaAssetId || !item.date || !item.time) return false;
      const scheduled = new Date(`${item.date}T${item.time}:00`);
      return !Number.isNaN(scheduled.getTime()) && scheduled.getTime() >= minimum;
    });
  }, [items]);

  const destinationCount = platform === "facebook" ? selectedPageCount : selectedAccountId ? 1 : 0;
  const totalPostCount = validItems.length * destinationCount;

  const updateItem = useCallback((id: string, field: "caption" | "date" | "time", value: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  const submit = useCallback(async () => {
    if (submitInFlight.current || isSubmitting) return;
    if ((platform === "facebook" && selectedPageCount === 0) || (platform === "tiktok" && !selectedAccountId)) {
      setError(`Select one ${platform === "facebook" ? "Facebook Page" : "TikTok account"}.`);
      return;
    }
    if (validItems.length === 0) {
      setError("No ready videos have a valid schedule at least 5 minutes from now.");
      return;
    }

    submitInFlight.current = true;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const batchDestination = platform === "facebook"
        ? { connected_account_ids: selectedFacebookPageIds }
        : { connected_account_id: selectedAccountId };
      const response = await createBatchSchedule({
        platform,
        ...batchDestination,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
        items: validItems.map((item) => ({
          media_asset_id: item.mediaAssetId!,
          caption: item.caption.trim(),
          scheduled_at: `${item.date}T${item.time}:00`,
          post_type: "video",
          platform_settings: platform === "facebook"
            ? { post_type: "video" }
            : {
                privacy_level: PRIVACY_LEVEL_MAP[privacy],
                disable_comment: !allowComments,
                disable_duet: !allowDuet,
                disable_stitch: !allowStitch,
              },
        })),
      });
      const count = response.created_count;
      setItems([]);
      setSelectedAccountId("");
      setSelectedFacebookPageIds([]);
      setUploaderKey((key) => key + 1);
      setSuccess(platform === "facebook" ? `${count} posts scheduled successfully across ${selectedPageCount} Facebook Pages.` : `${count} videos scheduled successfully`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to schedule videos.");
    } finally {
      submitInFlight.current = false;
      setIsSubmitting(false);
    }
}, [allowComments, allowDuet, allowStitch, isSubmitting, platform, privacy, selectedAccountId, selectedFacebookPageIds, selectedPageCount, validItems]);

  const selectedPageAvatars = useMemo(() => {
    return facebookPages
      .filter((p) => selectedFacebookPageIds.includes(p.id) && p.avatar_url)
      .slice(0, 3);
  }, [facebookPages, selectedFacebookPageIds]);

  const FacebookDestinationModal = () => {
    if (!facebookModalOpen) return null;
    const selectedAccount = facebookProfile.profiles.find(p => p.id === facebookProfile.selectedProfileId);
    const showAccountStep = modalStep === "account";

    return (
      <>
        <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" onClick={() => handleModalOpenChange(false)} aria-hidden="true" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => handleModalOpenChange(false)}>
          <div role="dialog" aria-modal="true" className="relative flex h-[min(720px,calc(100vh-32px))] min-h-[420px] w-[calc(100vw-32px)] max-w-[700px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/78 shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
          {showAccountStep ? (
            <>
              <div className="relative z-[60] flex shrink-0 items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl"><div><h2 className="text-[16px] font-semibold text-white">Select Facebook Account</h2><p className="mt-0.5 text-[11px] text-white/60">Choose a Facebook account to access its Pages</p></div><button type="button" onClick={() => handleModalOpenChange(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 backdrop-blur-xl hover:bg-white/15" aria-label="Close dialog"><X className="h-3.5 w-3.5" /></button></div>
              <div className="min-h-0 flex-1 divide-y divide-white/10 overflow-y-auto bg-transparent px-5 py-2">
                {facebookProfile.profiles.map((profile) => (
                  <button key={profile.id} type="button" onClick={() => handleProfileChange(profile)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-white transition hover:text-blue-200">
                    <AccountAvatar account={profile} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-white">{profile.display_name}</p></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[11px] text-white/70 backdrop-blur-xl">{facebookProfile.availablePagesCount > 0 ? facebookProfile.availablePagesCount : "-"} Pages</span><ChevronRight className="h-4 w-4 text-white/40" /></div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="relative z-[60] flex shrink-0 items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl"><div className="flex items-center gap-2"><button type="button" onClick={handleBackToAccount} className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 p-1.5 text-white/70 backdrop-blur-xl hover:bg-white/15" aria-label="Back to account selection"><ArrowLeft className="h-4 w-4" /></button><div><h2 className="text-[16px] font-semibold text-white">Select Facebook Pages</h2>{selectedAccount && <p className="mt-0.5 text-[11px] text-white/60">{selectedAccount.display_name} • {facebookProfile.availablePagesCount} Pages available</p>}</div></div><button type="button" onClick={() => handleModalOpenChange(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 backdrop-blur-xl hover:bg-white/15" aria-label="Close dialog"><X className="h-3.5 w-3.5" /></button></div>
              <FacebookPageMultiSelector open={true} onClose={() => handleModalOpenChange(false)} selectedIds={selectedFacebookPageIds} onChange={setSelectedFacebookPageIds} parentAccountId={facebookProfile.selectedProfileId} onPagesFetched={setFacebookPages} />
            </>
          )}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <FacebookDestinationModal />
      <div className="mx-auto max-w-[1440px] bg-transparent px-4 pb-8 sm:px-6 lg:px-8">
        {success && <div role="status" className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-3 text-[13px] font-medium text-emerald-800 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl"><CheckCircle2 className="h-4 w-4" />{success}</div>}
        <div className="grid gap-5 bg-transparent lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
            <div><h2 className="text-[14px] font-semibold text-slate-900">{platform === "facebook" ? "Facebook" : "TikTok"} Auto Bulk</h2><p className="mt-1 text-[11px] leading-5 text-slate-600">Upload and schedule up to 50 videos.</p></div>
            {platform === "facebook" && (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
                <button type="button" onClick={() => setFacebookModalOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-[12px] text-slate-800 backdrop-blur-xl transition hover:bg-white/14 hover:border-white/20">
                  <div className="flex items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-400/20"><svg className="h-3.5 w-3.5 text-blue-700" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></div><span className="font-medium">Facebook</span></div><ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
                {selectedPageCount > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {selectedPageAvatars.map((page) => (
                          <img
                            key={page.id}
                            src={page.avatar_url!}
                            alt={page.display_name}
                            className="h-5 w-5 rounded-full border border-white/20 object-cover shadow-sm"
                          />
                        ))}
                        {selectedFacebookPageIds.length > 3 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/20 text-[8px] font-medium text-slate-700 backdrop-blur-xl">
                            +{selectedFacebookPageIds.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-700">
                        {selectedPageCount} Page{selectedPageCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {platform === "tiktok" && <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl"><legend className="text-[12px] font-semibold text-slate-800">Shared settings</legend><label className="block text-[11px] text-slate-700">Privacy<select value={privacy} onChange={(event) => setPrivacy(event.target.value as TikTokPrivacy)} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-3 py-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20"><option value="only_me">Only me</option><option value="public">Public</option><option value="friends">Friends</option><option value="followers">Followers</option></select></label>{[["Allow comments", allowComments, setAllowComments], ["Allow duet", allowDuet, setAllowDuet], ["Allow stitch", allowStitch, setAllowStitch]].map(([label, checked, setter]) => <label key={label as string} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-slate-700 backdrop-blur-xl"><input type="checkbox" checked={checked as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="rounded border-white/30 text-blue-600" />{label as string}</label>)}</fieldset>}
            <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl"><legend className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800"><Clock3 className="h-3.5 w-3.5" />Automatic schedule</legend><div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-slate-600">Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-2 py-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20" /></label><label className="text-[10px] text-slate-600">Start time<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-2 py-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20" /></label></div><label className="block text-[10px] text-slate-600">Interval<select value={interval} onChange={(event) => setInterval(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-3 py-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20">{intervals.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label><button type="button" onClick={applySchedule} disabled={items.length === 0 || isSubmitting} className="w-full rounded-xl border border-blue-400/25 bg-blue-500/12 px-3 py-2 text-[12px] font-medium text-blue-800 backdrop-blur-xl hover:bg-blue-500/18 disabled:opacity-40">Apply Schedule</button></fieldset>
          </aside>
        <main className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
          {hydrateError && (
            <div className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 backdrop-blur-xl">
              <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /><div className="min-w-0"><h3 className="text-[13px] font-semibold text-red-900">Media Library Transfer Failed</h3><p className="mt-1 text-[12px] text-red-800">{hydrateError}</p><p className="mt-2 text-[11px] text-red-700">Please return to Media Library and try again. No media was uploaded.</p></div></div>
            </div>
          )}
          <SchedulerMediaUploader key={uploaderKey} mode="video-multiple" maxCount={50} disabled={isSubmitting || (!!pendingMediaLibraryTransfer && !hydrateError)} accept="video/mp4,video/quicktime,video/quicktime,video/webm" dropLabel={pendingMediaLibraryTransfer ? "Loading media from Media Library..." : "Drag and drop videos here"} acceptLabel="MP4, MOV, WebM" onFilesChange={handleFilesChange} />
          {items.length > 0 && <div className="mt-5 space-y-3"><h3 className="text-[12px] font-semibold text-slate-900">Video details</h3>{items.map((item, index) => <article key={item.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl sm:grid-cols-[112px_minmax(0,1fr)_150px_120px]"><BulkVideoThumbnail src={item.thumbnailUrl} alt={item.name} /><label className="min-w-0 text-[10px] text-slate-600"><span className="block truncate font-medium text-slate-800">{index + 1}. {item.name}</span><span className="mt-2 block">{platform === "facebook" ? "Description" : "Caption"}</span><textarea value={item.caption} onChange={(event) => updateItem(item.id, "caption", event.target.value)} rows={2} disabled={item.status !== "ready" || isSubmitting} className="mt-1 w-full resize-y rounded-xl border border-white/20 bg-white/12 p-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 disabled:bg-white/5" /></label><label className="text-[10px] text-slate-600">Date<input type="date" value={item.date} onChange={(event) => updateItem(item.id, "date", event.target.value)} disabled={item.status !== "ready" || isSubmitting} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-2 py-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 disabled:bg-white/5" /></label><label className="text-[10px] text-slate-600">Time<input type="time" value={item.time} onChange={(event) => updateItem(item.id, "time", event.target.value)} disabled={item.status !== "ready" || isSubmitting} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-2 py-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 disabled:bg-white/5" /></label></article>)}</div>}
          {platform === "facebook" && <div className="mt-5 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-[12px] font-medium text-slate-700 backdrop-blur-xl">{validItems.length} videos × {selectedPageCount} pages = {totalPostCount} scheduled posts</div>}
          <div className="mt-5 flex flex-col items-stretch justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">{error ? <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-2 py-1 text-[11px] text-red-800 backdrop-blur-xl"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p> : hydrateError ? null : <p className="text-[11px] text-slate-600">Only ready videos with valid future date/time will be submitted.</p>}<button type="button" onClick={() => void submit()} disabled={isSubmitting || validItems.length === 0 || destinationCount === 0} className="inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400">{isSubmitting ? platform === "facebook" ? `Scheduling ${totalPostCount} posts...` : `Scheduling ${validItems.length} videos...` : platform === "facebook" ? `Schedule ${validItems.length} Videos to ${selectedPageCount} Pages` : `Schedule ${validItems.length} Videos`}</button></div>
        </main>
      </div>
    </div>
    </>
  );
}

function AccountAvatar({ account }: { account: ConnectedAccount }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(account.avatar_url) && !imageFailed;

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/20 text-white shadow-sm backdrop-blur-xl">
      {showImage ? <img src={account.avatar_url!} alt="" className="h-10 w-10 object-cover" onError={() => setImageFailed(true)} /> : <span className="text-[12px] font-semibold text-slate-700">{account.display_name.charAt(0).toUpperCase()}</span>}
    </div>
  );
}

type BulkVideoThumbnailProps = {
  src?: string | null;
  alt: string;
};

function BulkVideoThumbnail({ src, alt }: BulkVideoThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Clean up previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // Reset state when src changes
    setImageUrl(null);
    setLoading(true);
    setError(false);

    // Return early if no src
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Convert absolute URL to pathname + search if needed
        let path = src;
        if (/^https?:\/\//i.test(src)) {
          const url = new URL(src);
          path = url.pathname + url.search;
        }

        const blob = await apiFetchBlob(path);
        if (cancelled) return;

        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setImageUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-[72px] w-[112px] items-center justify-center rounded-xl border border-white/15 bg-slate-950/10 shrink-0">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
      </div>
    );
  }

  // Show image if loaded
  if (imageUrl && !error) {
    return (
      <div className="h-[72px] w-[112px] overflow-hidden rounded-xl border border-white/15 bg-slate-950/10 shrink-0">
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  // Show fallback if error or no src
  return (
    <div className="flex h-[72px] w-[112px] flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-slate-950/10 text-slate-500 shrink-0">
      <Film className="h-5 w-5" />
      <span className="text-[9px] leading-tight">Thumbnail unavailable</span>
    </div>
  );
}
