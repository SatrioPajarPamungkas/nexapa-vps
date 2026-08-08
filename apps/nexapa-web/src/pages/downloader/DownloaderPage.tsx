import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Library, Settings, FileVideo } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { useDownloaderWorkspace } from "@/features/downloader/hooks/useDownloaderWorkspace";
import { DownloaderInputModes } from "@/features/downloader/components/DownloaderInputModes";
import { SingleUrlInput } from "@/features/downloader/components/SingleUrlInput";
import { MultipleUrlInput } from "@/features/downloader/components/MultipleUrlInput";
import { ProfileUrlInput } from "@/features/downloader/components/ProfileUrlInput";
import { ProfileResultWorkspace } from "@/features/downloader/components/ProfileResultWorkspace";
import { DownloadQueue } from "@/features/downloader/components/DownloadQueue";
import { AdvancedOptionsDrawer } from "@/features/downloader/components/AdvancedOptionsDrawer";
import { StickyActionBar } from "@/features/downloader/components/StickyActionBar";
import type { InputMode, OutputFormat, DownloadQuality } from "@/features/downloader/downloader.types";
import { cn } from "@/lib/cn";
import { CONNECTION_LABEL, CONNECTION_TONE } from "@/features/downloader/downloader.constants";
import {
  cancelDownloadBatch,
  deleteDownloadBatch,
  getDownloadBatchStatus,
  retryFailedDownloadBatch,
} from "@/lib/api/download-jobs";
import { ApiError } from "@/lib/api/errors";
import type { DownloadBatchStatus } from "@/lib/api/response.types";

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "original", label: "Auto / Original" },
  { value: "mp4", label: "Video MP4" },
  { value: "audio", label: "Audio" },
];

const QUALITY_OPTIONS: { value: DownloadQuality; label: string }[] = [
  { value: "best", label: "Best" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
];

export function DownloaderPage() {
const ws = useDownloaderWorkspace();

  const [singleUrl, setSingleUrl] = useState<string>("");
  const [multiText, setMultiText] = useState<string>("");
  const [profileInput, setProfileInput] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch status tracking
  const [batchStatuses, setBatchStatuses] = useState<Record<string, DownloadBatchStatus>>({});
  const [batchActionLoading, setBatchActionLoading] = useState<Set<string>>(new Set());
  const batchStatusesRef = useRef<Record<string, DownloadBatchStatus>>({});
  const inFlightBatchesRef = useRef<Set<string>>(new Set());



  const queueCount = ws.items.length;

  const connectionLabel = CONNECTION_LABEL[ws.connectionState] ?? "Unknown";
  const connectionTone = CONNECTION_TONE[ws.connectionState] ?? "slate";

  const handleScrollToInput = useCallback(() => {
    // Scroll to the card element using query selector
    const cardElement = document.querySelector('.transition-shadow.focus\\:outline-none');
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: "smooth", block: "start" });
      (cardElement as HTMLElement).focus({ preventScroll: true });
    }
  }, []);

  const handleAddSingle = useCallback(async () => {
    const trimmed = singleUrl.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      const result = await ws.addSingleUrl(trimmed);
      if (result.added.length > 0 && result.invalidLines.length === 0 && result.duplicateLines.length === 0) {
        setSingleUrl("");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [singleUrl, ws]);

  const handleAddMultiple = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const result = await ws.addMultipleUrls(multiText);
      if (result.invalidLines.length === 0 && result.duplicateLines.length === 0 && result.added.length > 0) {
        setMultiText("");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [multiText, ws]);

  const handleAnalyzeProfile = useCallback(
    (url: string) => {
      // Prevent double submission
      if (ws.profileState === "analyzing") {
        return;
      }

      setProfileInput(url);
      ws.setProfileUrl(url);
      ws.analyzeProfile(url);
    },
    [ws],
  );

  const handleCopyItem = useCallback(
    async (id: string) => {
      const ok = await ws.copyItem(id);
      ws.setLiveFeedback(ok ? "URL copied" : ws.clipboardError || "Copy failed");
      window.setTimeout(() => ws.setLiveFeedback(""), 2500);
    },
    [ws],
  );

// Handle profile job status updates and restore workspace after refresh
  const processedJobsRef = useRef<Set<string>>(new Set());
  const restoredWorkspaceRef = useRef(false);

  useEffect(() => {
    // Restore workspace after refresh - find latest profile parent job with awaiting_selection status
    if (!restoredWorkspaceRef.current && ws.items.length > 0) {
      // Find the latest profile parent job with awaiting_selection status belonging to the user
      // Profile parent job: mode === "profile" && parent_download_job_id == null && download_result_id == null
      const profileParentJobs = ws.items.filter(
        (item) =>
          item.mode === "profile" &&
          item.parent_download_job_id == null &&
          item.download_result_id == null &&
          item.status === "awaiting_selection"
      );

      if (profileParentJobs.length > 0) {
        // Sort by creation date descending to get the latest
        profileParentJobs.sort((a, b) => b.createdAtMs - a.createdAtMs);
        const latestProfileJob = profileParentJobs[0];

        // Set the active profile job and restore state
        ws.setProfileJobId(latestProfileJob.id);
        ws.setProfileState("awaiting_selection");
        ws.loadProfileResults(latestProfileJob.id);
        restoredWorkspaceRef.current = true;
      }
    }

    if (ws.profileJobId && (ws.profileState === "analyzing" || ws.profileState === "awaiting_selection")) {
      // Process job status changes
      const job = ws.items.find((i) => i.id === ws.profileJobId);
      if (job) {
        // Reset processedJobsRef when job status changes back to awaiting_selection
        if (job.status === "awaiting_selection" && ws.profileState !== "awaiting_selection") {
          processedJobsRef.current.delete(ws.profileJobId);
        }
        // Prevent processing the same job multiple times unless status changed
        if (processedJobsRef.current.has(ws.profileJobId)) {
          // Even if we've processed this job before, we need to make sure the profile state is correct
          // This ensures the spinner stops when the job reaches awaiting_selection
          if (job.status === "awaiting_selection" && ws.profileState !== "awaiting_selection") {
            ws.setProfileState("awaiting_selection");
            ws.loadProfileResults(ws.profileJobId);
          }
          return;
        }
        switch (job.status) {
          case "awaiting_selection":
            processedJobsRef.current.add(ws.profileJobId);
            ws.setProfileState("awaiting_selection");
            ws.loadProfileResults(ws.profileJobId);
            break;
          case "completed":
            processedJobsRef.current.add(ws.profileJobId);
            ws.loadCompletedProfileResults(ws.profileJobId);
            break;
          case "failed":
            processedJobsRef.current.add(ws.profileJobId);
            ws.setProfileStateWithError("error", job.errorMessage || "Profile download failed");
            break;
          case "cancelled":
            processedJobsRef.current.add(ws.profileJobId);
            ws.setProfileStateWithError("error", "Profile download was cancelled");
            break;
        }
      }
    }

    // Additional check: if we have a profile job ID but no profile state is set correctly, update it
    if (ws.profileJobId && ws.profileState === "analyzing") {
      const job = ws.items.find((i) => i.id === ws.profileJobId);
      if (job && job.status === "awaiting_selection") {
        ws.setProfileState("awaiting_selection");
        ws.loadProfileResults(ws.profileJobId);
        processedJobsRef.current.add(ws.profileJobId);
      }
    }
  }, [ws.profileJobId, ws.profileState, ws.items, ws.loadProfileResults, ws.loadCompletedProfileResults, ws.setProfileStateWithError, ws.setProfileState, ws.setProfileJobId]);

  // Fetch batch statuses for visible batches
  useEffect(() => {
    // Derive unique non-null batch IDs from items, excluding profile parent jobs
    const batchIds = new Set<string>();
    ws.items.forEach((item) => {
      // Profile parent job: mode === "profile" && parent_download_job_id == null && download_result_id == null
      const isProfileParent =
        item.mode === "profile" &&
        item.parent_download_job_id == null &&
        item.download_result_id == null;

      if (!isProfileParent && item.batch_id) {
        batchIds.add(item.batch_id);
      }
    });

    // Fetch status for each batch that isn't terminal and isn't in-flight
    batchIds.forEach((batchId) => {
      const currentStatus = batchStatusesRef.current[batchId];

      // Skip if already terminal and loaded
      if (currentStatus?.is_terminal) {
        return;
      }

      // Skip if already in-flight
      if (inFlightBatchesRef.current.has(batchId)) {
        return;
      }

      // Mark as in-flight
      inFlightBatchesRef.current.add(batchId);

      // Fetch status
      getDownloadBatchStatus(batchId)
        .then((status) => {
          batchStatusesRef.current = { ...batchStatusesRef.current, [batchId]: status };
          setBatchStatuses((prev) => ({ ...prev, [batchId]: status }));
        })
        .catch(() => {
          // Silently ignore errors
        })
        .finally(() => {
          inFlightBatchesRef.current.delete(batchId);
        });
    });
  }, [ws.items]);

  const updateBatchStatus = useCallback(async (batchId: string) => {
    const status = await getDownloadBatchStatus(batchId);
    batchStatusesRef.current = { ...batchStatusesRef.current, [batchId]: status };
    setBatchStatuses((current) => ({ ...current, [batchId]: status }));
  }, []);

  const runBatchAction = useCallback(async (
    batchId: string,
    action: () => Promise<void>,
    successMessage: string,
    deleted = false,
  ) => {
    setBatchActionLoading((current) => new Set(current).add(batchId));
    try {
      await action();
      await ws.fetchJobs();
      if (deleted) {
        const nextStatuses = { ...batchStatusesRef.current };
        delete nextStatuses[batchId];
        batchStatusesRef.current = nextStatuses;
        setBatchStatuses(nextStatuses);
      } else {
        await updateBatchStatus(batchId);
      }
      ws.setLiveFeedback(successMessage);
    } catch (error) {
      ws.setLiveFeedback(error instanceof ApiError ? error.message : "Batch action failed.");
    } finally {
      setBatchActionLoading((current) => {
        const next = new Set(current);
        next.delete(batchId);
        return next;
      });
      window.setTimeout(() => ws.setLiveFeedback(""), 4000);
    }
  }, [updateBatchStatus, ws]);

  const handleCancelBatch = useCallback((batchId: string) => {
    void runBatchAction(batchId, () => cancelDownloadBatch(batchId), "Batch cancellation requested.");
  }, [runBatchAction]);

  const handleRetryFailedBatch = useCallback((batchId: string) => {
    void runBatchAction(
      batchId,
      async () => { await retryFailedDownloadBatch(batchId); },
      "Failed batch jobs queued for retry.",
    );
  }, [runBatchAction]);

  const handleDeleteBatch = useCallback((batchId: string) => {
    void runBatchAction(batchId, () => deleteDownloadBatch(batchId), "Batch deleted.", true);
  }, [runBatchAction]);

const live = useMemo(() => ws.liveFeedback, [ws.liveFeedback]);

  // Visible queue counts use grouped cards: one batch ID equals one card.
  const visibleQueueStats = useMemo(() => {
    const batchIds = new Set<string>();
    const selectedBatchIds = new Set<string>();
    let standaloneCards = 0;
    let selectedStandaloneCards = 0;

    ws.items.forEach((item) => {
      // Profile parent job: mode === "profile" && parent_download_job_id == null && download_result_id == null
      const isProfileParent =
        item.mode === "profile" &&
        item.parent_download_job_id == null &&
        item.download_result_id == null;

      if (isProfileParent) return;

      if (item.batch_id) {
        batchIds.add(item.batch_id);

        if (ws.selectedIds.has(item.id)) {
          selectedBatchIds.add(item.batch_id);
        }

        return;
      }

      standaloneCards += 1;

      if (ws.selectedIds.has(item.id)) {
        selectedStandaloneCards += 1;
      }
    });

    return {
      cardCount: batchIds.size + standaloneCards,
      selectedCardCount: selectedBatchIds.size + selectedStandaloneCards,
    };
  }, [ws.items, ws.selectedIds]);

  const selectedItems = useMemo(
    () => ws.items.filter((i) => ws.selectedIds.has(i.id)),
    [ws.items, ws.selectedIds],
  );

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Media Workflow"
        title="Downloader"
        description="Download individual media or collect multiple items from URLs, profiles, channels, and playlists in one workspace."
        actions={
          <>
            <StatusBadge label={connectionLabel} tone={connectionTone as "green" | "amber" | "red" | "blue" | "neutral"} />
            <button
              type="button"
              onClick={handleScrollToInput}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 text-[13px] font-medium text-white shadow-sm transition hover:from-blue-700 hover:to-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Add Download
            </button>
            <Link
              to="/library"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 text-[13px] font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Library className="h-4 w-4" aria-hidden="true" />
              Media Library
            </Link>
          </>
        }
      />

      {ws.connectionState === "unreachable" && (
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 backdrop-blur-xl">
            <p className="text-[13px] font-medium text-amber-900">
              {ws.connectionError || "Nexapa API cannot be reached. Check that the API is running at the configured URL."}
            </p>
            <button
              type="button"
              onClick={() => ws.fetchJobs()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-amber-800 backdrop-blur-xl transition hover:bg-white/22"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {ws.connectionState === "auth_required" && (
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 backdrop-blur-xl">
            <p className="text-[13px] font-medium text-amber-900">
              Authentication is required, or local guest API access is disabled.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] space-y-6 bg-transparent px-4 py-6 sm:px-6 lg:px-8">
        {/* Unified URL Workspace Card */}
        <Card tabIndex={-1} className="transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <DownloaderInputModes mode={ws.inputMode} onModeChange={ws.setInputMode as (m: InputMode) => void} />

          <div className="mt-5">
            {ws.inputMode === "single" && (
              <SingleUrlInput
                value={singleUrl}
                onChange={setSingleUrl}
                onAdd={handleAddSingle}
                queueCount={queueCount}
                feedback={live}
                isSubmitting={isSubmitting}
              />
            )}
            {ws.inputMode === "multiple" && (
              <MultipleUrlInput
                value={multiText}
                onChange={setMultiText}
                onAddMultiple={handleAddMultiple}
                queueCount={queueCount}
                feedback={live}
                isSubmitting={isSubmitting}
              />
            )}
            {ws.inputMode === "profile" && (
              <ProfileUrlInput
                value={profileInput || ws.profileUrl}
                onChange={(v) => {
                  setProfileInput(v);
                  ws.setProfileUrl(v);
                }}
                onAnalyze={handleAnalyzeProfile}
                error={ws.profileState === "error" ? ws.profileError : ""}
                isAnalyzing={ws.profileState === "analyzing"}
              />
            )}
          </div>

          {/* Inline format and quality options */}
          <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                {/* Format */}
                <div className="flex items-center gap-2">
                  <label className="text-[12px] font-medium text-slate-800">Format</label>
                  <div className="flex gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5 backdrop-blur-xl">
                    {FORMAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => ws.setSettings({ ...ws.settings, outputFormat: opt.value })}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                          ws.settings.outputFormat === opt.value
                            ? "bg-white/18 text-blue-800 shadow-sm ring-1 ring-white/20"
                            : "text-slate-700 hover:text-slate-900 hover:bg-white/10",
                        )}
                        aria-pressed={ws.settings.outputFormat === opt.value}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality */}
                <div className="flex items-center gap-2">
                  <label className="text-[12px] font-medium text-slate-800">Quality</label>
                  <div className="flex gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5 backdrop-blur-xl">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => ws.setSettings({ ...ws.settings, quality: opt.value })}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                          ws.settings.quality === opt.value
                            ? "bg-white/18 text-blue-800 shadow-sm ring-1 ring-white/20"
                            : "text-slate-700 hover:text-slate-900 hover:bg-white/10",
                        )}
                        aria-pressed={ws.settings.quality === opt.value}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                Advanced Options
              </button>
            </div>
            <p className="text-[11px] text-slate-600">
              Affects newly added items only. Existing queue items retain their captured settings.
            </p>
          </div>
        </Card>

{/* Profile Result Workspace */}
        {ws.inputMode === "profile" && (
<ProfileResultWorkspace
              state={ws.profileState}
              results={ws.profileResults}
              filtered={ws.filteredProfile}
              filter={ws.profileFilter}
              sort={ws.profileSort}
              view={ws.profileView}
              error={ws.profileError}
              onFilterChange={ws.setProfileFilter}
              onSortChange={ws.setProfileSort}
              onViewChange={ws.setProfileView}
              onToggle={ws.toggleProfileSelect}
              onRemove={(id) => {
                // If the ID is the profile job ID, delete the parent job
                if (id === ws.profileJobId) {
                  ws.removeJob(id);
                } else {
                  // Otherwise remove individual profile result
                  ws.removeProfileResult(id);
                }
              }}
              onAdd={ws.addProfileItemToQueue}
              onSelectAll={ws.selectAllProfile}
              onDeselectAll={ws.deselectAllProfile}
              onAddSelectedToQueue={ws.addSelectedProfileToQueue}
              onDownloadAll={ws.downloadAllProfileResults}
              onLoadDemo={ws.loadDemoPreview}
              onLoadResults={ws.loadProfileResults}
              jobId={ws.profileJobId}
              individualDownloads={ws.individualDownloads}
              selectedSubmitting={ws.selectedSubmitting}
              allSubmitting={ws.allProfileSubmitting}
              profileSubmittingIds={ws.profileSubmittingIds}
              profileProcessedIds={ws.profileProcessedIds}
            />
        )}

{/* Download Queue or Empty State */}
        {visibleQueueStats.cardCount > 0 ? (
<DownloadQueue
            items={ws.items}
            filtered={ws.filteredQueue}
            selectedIds={ws.selectedIds}
            filter={ws.queueFilter}
            sort={ws.queueSort}
view={ws.queueView}
            onFilterChange={ws.setQueueFilter}
            onSortChange={ws.setQueueSort}
            onViewChange={ws.setQueueView}
            onToggle={ws.toggleSelect}
            onRemove={ws.requestRemoveJob}
            onCopy={handleCopyItem}
            onSelectAllFiltered={ws.selectAllFiltered}
            onDeselectAll={ws.deselectAll}
            onRemoveSelected={ws.removeSelected}
            onCopySelected={ws.copySelected}
            onClearAll={() => {}}
            onDownloadZip={(batchId) => {
              const url = `/download-batches/${encodeURIComponent(batchId)}/archive`;
              const base = (import.meta.env.VITE_NEXAPA_API_BASE_URL ?? "").replace(/\/+$/, "");
              const fullUrl = `${base}${url}`;
              const a = document.createElement("a");
              a.href = fullUrl;
              a.target = "_blank";
              a.rel = "noopener";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            clipboardError={ws.clipboardError}
            feedback={live}
            onCancel={ws.requestCancelJob}
            onRetry={ws.retryJob}
            actionLoading={ws.actionLoading}
            onCancelBatch={handleCancelBatch}
            onRetryFailedBatch={handleRetryFailedBatch}
            onDeleteBatch={handleDeleteBatch}
            batchActionLoading={batchActionLoading}
            batchMetadata={ws.profileBatchMetadata}
            batchStatuses={batchStatuses}
          />
        ) : (
          <EmptyState
            icon={FileVideo}
            title="No URLs in the queue"
            description="Add a media URL above to create a download job."
            className="border-white/15 bg-white/5 backdrop-blur-2xl"
          />
        )}

        {/* Sticky Queue Action Bar */}
        {visibleQueueStats.cardCount > 0 && (
          <StickyActionBar
            itemCount={visibleQueueStats.cardCount}
            selectedCount={visibleQueueStats.selectedCardCount}
            selectedItems={selectedItems}
            isSubmitting={ws.isDownloadMediaSubmitting}
            onCancelSelected={ws.cancelSelected}
            onRetrySelected={ws.retrySelected}
            onRemoveSelected={ws.removeSelected}
            onDownloadMediaSelected={ws.downloadMediaSelected}
            onClearQueue={() => {}}
          />
        )}

        {/* Live feedback screen reader */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {live}
        </div>
      </div>

      {/* Advanced Options Drawer */}
      <AdvancedOptionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        settings={ws.settings}
        batchLimit={50}
        onSettingsChange={ws.setSettings}
        onBatchLimitChange={() => {}}
      />

      {/* Confirmation Dialog */}
      {ws.confirmAction?.type === "cancel" && (
        <ConfirmDialog
          open
          title="Cancel download?"
          description="The worker will stop this job when cancellation is observed. Completed files are not removed."
          confirmLabel="Cancel Download"
          variant="danger"
          loading={ws.confirmLoading}
          onConfirm={ws.confirmCancelJob}
          onCancel={ws.dismissConfirm}
        />
      )}
      {ws.confirmAction?.type === "remove" && (
        <ConfirmDialog
          open
          title="Remove download job?"
          description="This removes the job record from the queue. Existing downloaded media will not be deleted automatically."
          confirmLabel="Remove Job"
          variant="danger"
          loading={ws.confirmLoading}
          onConfirm={ws.confirmRemoveJob}
          onCancel={ws.dismissConfirm}
        />
      )}
    </div>
  );
}


