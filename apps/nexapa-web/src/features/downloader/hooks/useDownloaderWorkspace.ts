import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type {
  DownloadQueueItem,
  DownloaderSettings,
  AddUrlResult,
  ProfileResultItem,
  ProfileWorkspaceState,
  InputMode,
  QueueFilter,
  QueueSort,
  ProfileResultFilter,
  ProfileResultSort,
  ViewMode,
  ProfileBatchMetadata,
  SourceOrigin,
} from "../downloader.types";
import { DEFAULT_SETTINGS } from "../downloader.types";
import { MAX_QUEUE } from "../downloader.constants";
import {
  detectPlatformFromUrl,
  normalizeAndValidateUrl,
  deriveTitleFromUrl,
  createDemoProfileResults,
  isDemoId,
  canCancelDownloadJob,
  canRetryDownloadJob,
  canDeleteDownloadJob,
} from "../downloader.utils";
import {
  createDownloadJobs,
  cancelDownloadJob,
  retryDownloadJob,
  deleteDownloadJob,
  getDownloadJob,
  getDownloadJobResults,
  selectDownloadJobResults,
} from "@/lib/api/download-jobs";
import { listMediaAssets } from "@/lib/api/media-assets";
import { ApiError } from "@/lib/api/errors";
import type { ApiDownloadJob, ApiDownloadResult } from "@/lib/api/response.types";
import { useJobPolling } from "./useJobPolling";

type SelectedBatchState = "idle" | "submitting" | "processing" | "ready" | "failed";

type IndividualDownloadEntry =
  | { state: "idle" }
  | { state: "processing"; jobId: string }
  | { state: "ready"; jobId: string; url: string }
  | { state: "failed"; jobId?: string };

function deriveSourceNameFromProfileUrl(profileUrl: string): string {
  try {
    const url = new URL(profileUrl);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/^\/+|\/+$/g, "");

    // TikTok / Instagram-style: use username when available
    if (hostname.includes("tiktok.com")) {
      const match = pathname.match(/^@([^/]+)/);
      if (match && match[1]) {
        return `@${match[1]}`;
      }
    }
    if (hostname.includes("instagram.com")) {
      const match = pathname.match(/^([^/]+)/);
      if (match && match[1] && !["p", "reel", "reels", "tv", "explore"].includes(match[1])) {
        return `@${match[1]}`;
      }
    }

    // Fallback to hostname/path
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      return parts.join("/");
    }

    return hostname;
  } catch {
    return "Profile batch";
  }
}

function mapApiJobToQueueItem(job: ApiDownloadJob): DownloadQueueItem {
  // Determine source origin based on job properties
  const isProfileMode = job.mode === "profile";
  const isProfileParent =
    isProfileMode &&
    job.parent_download_job_id == null &&
    job.download_result_id == null;

  const sourceOrigin: SourceOrigin = isProfileParent
    ? "profile-analysis"
    : isProfileMode
    ? "profile-result"
    : job.mode === "multiple"
    ? "batch-url"
    : "direct-url";

  return {
    id: job.id,
    batch_id: job.batch_id ?? null,
    originalUrl: job.original_input,
    normalizedUrl: job.normalized_url,
    platform: job.platform,
    sourceType: job.source_type,
    sourceOrigin,
    title: deriveTitleFromUrl(job.normalized_url),
    thumbnailUrl: null,
    outputFormat: job.output_format,
    quality: job.quality,
    filenameMode: job.filename_mode as DownloaderSettings["filenameMode"],
    delaySeconds: job.delay_seconds as DownloaderSettings["delaySeconds"],
    status: job.status,
    progress: job.progress,
    currentStage: job.current_stage,
    errorCode: job.error_code,
    errorMessage: job.error_message,
    retryCount: job.retry_count,
    createdAt: job.created_at,
    createdAtMs: new Date(job.created_at).getTime(),
    startedAt: job.started_at,
    completedAt: job.completed_at,
    selected: false,
    isDemo: false,
    resultsCount: job.results_count ?? 0,
    mediaAssetsCount: job.media_assets_count ?? 0,
    has_downloadable_file: job.has_downloadable_file,
    // Store authoritative backend fields for filtering
    mode: job.mode,
    parent_download_job_id: job.parent_download_job_id ?? null,
    download_result_id: job.download_result_id ?? null,
  };
}

export function useDownloaderWorkspace() {
  const polling = useJobPolling();

  const [settings, setSettings] = useState<DownloaderSettings>(DEFAULT_SETTINGS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<AddUrlResult | null>(null);
  const [clipboardError, setClipboardError] = useState<string>("");
  const [inputMode, setInputMode] = useState<InputMode>("single");
  const [liveFeedback, setLiveFeedback] = useState<string>("");

  // Profile workspace
  const [profileUrl, setProfileUrl] = useState<string>("");
  const [profileState, setProfileState] = useState<ProfileWorkspaceState>("idle");
  const [profileError, setProfileError] = useState<string>("");
  const [profileResults, setProfileResults] = useState<ProfileResultItem[]>([]);
  const [profileFilter, setProfileFilter] = useState<ProfileResultFilter>({ search: "", mediaType: "all" });
  const [profileSort, setProfileSort] = useState<ProfileResultSort>("newest");
  const [profileView, setProfileView] = useState<ViewMode>("list");
  const [profileSourcePlatform, setProfileSourcePlatform] = useState<string>("generic");
  const [profileJobId, setProfileJobId] = useState<string | null>(null);

  // Profile batch metadata storage (frontend session snapshot)
  const [profileBatchMetadata, setProfileBatchMetadata] = useState<Map<string, ProfileBatchMetadata>>(new Map());

  // Queue UI
  const [queueFilter, setQueueFilter] = useState<QueueFilter>({ search: "", platform: "all", source: "all" });
  const [queueSort, setQueueSort] = useState<QueueSort>("recent");
  const [queueView, setQueueView] = useState<ViewMode>("list");

  // Action loading states
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // Confirmation dialog state
  type ConfirmAction =
    | { type: "cancel"; jobId: string }
    | { type: "remove"; jobId: string };
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Track mutation versions to prevent polling races
  const mutationVersionRef = useRef<Map<string, number>>(new Map());

// ---- Selected batch state (no auto-download) ----
  // Tracks the profile scrape batch for UI feedback only.
  const [selectedBatch, setSelectedBatch] = useState({
    state: "idle" as SelectedBatchState,
    batchId: "" as string,
    total: 0,
    completed: 0,
    failed: 0,
    availableFiles: 0,
  });
  const [profileSubmissionMode, setProfileSubmissionMode] = useState<"selected" | "all" | null>(null);

  // ---- Individual processing state (no auto-download) ----
  // Maps profile result ID -> { jobId, ready flag, url }
  const [individualDownloads, setIndividualDownloads] = useState<Record<string, IndividualDownloadEntry>>({});

  // Derived: selectedSubmitting is true while the batch is in "submitting" state
  const selectedSubmitting = selectedBatch.state === "submitting";
  const allProfileSubmitting = selectedSubmitting && profileSubmissionMode === "all";

  // Derived: profileSubmittingIds tracks which individual result IDs are currently processing
  const profileSubmittingIds = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(individualDownloads).forEach(([id, entry]) => {
      if (entry.state === "processing") {
        ids.add(id);
      }
    });
    return ids;
  }, [individualDownloads]);

  // Derived: profileProcessedIds tracks which individual result IDs are ready/processed
  const profileProcessedIds = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(individualDownloads).forEach(([id, entry]) => {
      if (entry.state === "ready") {
        ids.add(id);
      }
    });
    return ids;
  }, [individualDownloads]);

  const items = useMemo(() => polling.jobs.map(mapApiJobToQueueItem), [polling.jobs]);

  const connectionState = polling.connectionState;

  // ---- addSingleUrl (unchanged) ----
  const addSingleUrl = useCallback(
    async (rawUrl: string): Promise<AddUrlResult> => {
      const result: AddUrlResult = {
        added: [],
        invalidLines: [],
        duplicateLines: [],
        duplicatesInQueue: [],
        overLimitSkipped: 0,
      };

      const trimmed = rawUrl.trim();
      if (!trimmed) {
        result.invalidLines.push({ lineNumber: 1, value: rawUrl, reason: "Empty value" });
        setLastResult(result);
        return result;
      }

      const validation = normalizeAndValidateUrl(trimmed);
      if (!validation.valid) {
        result.invalidLines.push({ lineNumber: 1, value: rawUrl, reason: validation.reason });
        setLastResult(result);
        return result;
      }

      if (items.length >= MAX_QUEUE) {
        result.overLimitSkipped = 1;
        setLastResult(result);
        return result;
      }

      try {
        const apiResult = await createDownloadJobs({
          mode: "single",
          urls: [validation.normalizedUrl],
          output_format: settings.outputFormat,
          quality: settings.quality,
          filename_mode: settings.filenameMode,
          delay_seconds: settings.delaySeconds,
        });

        result.apiResult = {
          accepted: apiResult.counts.accepted,
          rejected: apiResult.counts.rejected,
          duplicates: apiResult.counts.duplicates,
        };

        for (const job of apiResult.accepted) {
          const item = mapApiJobToQueueItem(job);
          result.added.push(item);
        }

        for (const r of apiResult.rejected) {
          result.invalidLines.push({
            lineNumber: r.index + 1,
            value: r.url,
            reason: r.reason,
          });
        }

        for (const d of apiResult.duplicates) {
          result.duplicateLines.push({ lineNumber: d.index + 1, value: d.url });
        }

        if (result.added.length > 0) {
          setLiveFeedback("Added to queue");
          window.setTimeout(() => setLiveFeedback(""), 3000);
          polling.fetchJobs();
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 422 && err.errors) {
            for (const [field, messages] of Object.entries(err.errors)) {
              for (const msg of messages) {
                result.invalidLines.push({ lineNumber: 1, value: field, reason: msg });
              }
            }
          } else {
            result.invalidLines.push({ lineNumber: 1, value: rawUrl, reason: err.message });
          }
        } else {
          result.invalidLines.push({ lineNumber: 1, value: rawUrl, reason: "Network error" });
        }
      }

      setLastResult(result);
      return result;
    },
    [items.length, settings, polling],
  );

  // ---- addMultipleUrls (unchanged) ----
  const addMultipleUrls = useCallback(
    async (rawText: string): Promise<AddUrlResult> => {
      const lines = rawText.split(/\r?\n/);
      const result: AddUrlResult = {
        added: [],
        invalidLines: [],
        duplicateLines: [],
        duplicatesInQueue: [],
        overLimitSkipped: 0,
      };

      const validUrls: string[] = [];
      const lineMap = new Map<string, number>();

      for (let idx = 0; idx < lines.length; idx++) {
        const lineNo = idx + 1;
        const rawLine = lines[idx];
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        const validation = normalizeAndValidateUrl(trimmed);
        if (!validation.valid) {
          result.invalidLines.push({ lineNumber: lineNo, value: rawLine, reason: validation.reason });
          continue;
        }

        const lower = validation.normalizedUrl.toLowerCase();
        if (lineMap.has(lower)) {
          result.duplicateLines.push({ lineNumber: lineNo, value: rawLine });
          continue;
        }

        lineMap.set(lower, lineNo);
        validUrls.push(validation.normalizedUrl);

        if (validUrls.length >= MAX_QUEUE) {
          result.overLimitSkipped += 1;
        }
      }

      if (validUrls.length === 0) {
        setLastResult(result);
        return result;
      }

      try {
        const apiResult = await createDownloadJobs({
          mode: "multiple",
          urls: validUrls,
          output_format: settings.outputFormat,
          quality: settings.quality,
          filename_mode: settings.filenameMode,
          delay_seconds: settings.delaySeconds,
        });

        result.apiResult = {
          accepted: apiResult.counts.accepted,
          rejected: apiResult.counts.rejected,
          duplicates: apiResult.counts.duplicates,
        };

        for (const job of apiResult.accepted) {
          const item = mapApiJobToQueueItem(job);
          result.added.push(item);
        }

        for (const r of apiResult.rejected) {
          const lineNo = lineMap.get(r.url) ?? r.index + 1;
          result.invalidLines.push({ lineNumber: lineNo, value: r.url, reason: r.reason });
        }

        for (const d of apiResult.duplicates) {
          const lineNo = lineMap.get(d.url) ?? d.index + 1;
          result.duplicateLines.push({ lineNumber: lineNo, value: d.url });
        }

        if (result.added.length > 0) {
          setLiveFeedback(`${result.added.length} jobs created`);
          window.setTimeout(() => setLiveFeedback(""), 3000);

          if (apiResult.accepted.length > 0) {
            polling.setJobs((prevJobs) => {
              const existingJobMap = new Map<string, ApiDownloadJob>();
              prevJobs.forEach((job) => { existingJobMap.set(job.id, job); });
              const merged: ApiDownloadJob[] = [...prevJobs];
              for (const newJob of apiResult.accepted) {
                if (existingJobMap.has(newJob.id)) {
                  const index = merged.findIndex((j) => j.id === newJob.id);
                  if (index !== -1) merged[index] = newJob;
                } else {
                  merged.push(newJob);
                }
              }
              return merged;
            });
          }

          polling.fetchJobs();
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setLiveFeedback(err.message);
        } else {
          setLiveFeedback("Network error");
        }
        window.setTimeout(() => setLiveFeedback(""), 5000);
      }

      setLastResult(result);
      return result;
    },
    [settings, polling],
  );

  // ---- Profile analysis (unchanged) ----
  const analyzeProfile = useCallback(
    async (rawUrl: string) => {
      setProfileError("");
      const trimmed = rawUrl.trim();
      if (!trimmed) {
        setProfileError("Enter a profile/channel/playlist URL starting with http:// or https://");
        setProfileState("error");
        return;
      }

      const validation = normalizeAndValidateUrl(trimmed);
      if (!validation.valid) {
        setProfileError(validation.reason);
        setProfileState("error");
        return;
      }

      const platform = detectPlatformFromUrl(validation.normalizedUrl);
      setProfileSourcePlatform(platform);
      setProfileState("analyzing");
      setProfileResults([]);

      try {
        const apiResult = await createDownloadJobs({
          mode: "profile",
          urls: [validation.normalizedUrl],
          output_format: settings.outputFormat,
          quality: settings.quality,
          filename_mode: settings.filenameMode,
          delay_seconds: settings.delaySeconds,
        });

        if (apiResult.accepted.length > 0) {
          const jobId = apiResult.accepted[0].id;
          setProfileJobId(jobId);
          setLiveFeedback("Profile analysis started. Waiting for worker...");
          window.setTimeout(() => setLiveFeedback(""), 3000);
          polling.fetchJobs();
        } else if (apiResult.rejected.length > 0) {
          setProfileError(apiResult.rejected[0].reason);
          setProfileState("error");
        } else {
          setProfileError("No jobs were created");
          setProfileState("error");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setProfileError(err.message);
        } else {
          setProfileError("Network error");
        }
        setProfileState("error");
      }
    },
    [settings, polling],
  );

  // Legacy discovery results used by awaiting_selection jobs.
  const loadProfileResults = useCallback(
    async (jobId: string) => {
      try {
        const allResults: ApiDownloadResult[] = [];
        const seenResultIds = new Set<string>();
        let page = 1;
        let lastPage = 1;

        do {
          const result = await getDownloadJobResults(jobId, {
            per_page: 100,
            page,
          });

          result.data.forEach((resultItem) => {
            if (!seenResultIds.has(resultItem.id)) {
              seenResultIds.add(resultItem.id);
              allResults.push(resultItem);
            }
          });

          lastPage = Math.max(1, Number(result.meta.last_page) || 1);
          page += 1;
        } while (page <= lastPage);

        const mapped: ProfileResultItem[] = allResults.map((r) => ({
          id: r.id,
          jobId: r.download_job_id,
          title: r.title,
          platform: profileSourcePlatform as ProfileResultItem["platform"],
          sourceType: r.media_type ?? "unknown",
          originalUrl: r.source_url,
          thumbnailUrl: r.thumbnail_url,
          mediaType: r.media_type,
          durationSeconds: r.duration_seconds,
          publishedAt: r.published_at,
          selected: false,
          isDemo: false,
          // Authoritative backend fields
          childJobId: r.child_job_id,
          isQueued: r.is_queued,
        }));

        if (mapped.length === 0) {
          setProfileState("empty");
        } else {
          setProfileState("results");
        }
        setProfileResults(mapped);
      } catch {
        setProfileError("Failed to load profile results");
        setProfileState("error");
      }
    },
    [profileSourcePlatform],
  );

  // Completed direct-profile jobs expose their output as MediaAsset records.
  const loadCompletedProfileResults = useCallback(
    async (jobId: string) => {
      try {
        const result = await listMediaAssets({
          download_job_id: jobId,
          per_page: 100,
          sort: "-created_at",
        });
        const mapped: ProfileResultItem[] = result.data.map((asset) => {
          const supportedPlatform = ["tiktok", "facebook", "instagram", "youtube", "generic"]
            .includes(asset.source_platform ?? "")
            ? asset.source_platform
            : profileSourcePlatform;

          return {
            id: asset.id,
            jobId: asset.download_job_id ?? jobId,
            title: asset.display_name,
            platform: supportedPlatform as ProfileResultItem["platform"],
            sourceType: asset.media_type || "unknown",
            originalUrl: asset.source_url,
            thumbnailUrl: asset.thumbnail_url,
            mediaType: asset.media_type,
            durationSeconds: asset.duration_seconds,
            publishedAt: asset.created_at,
            selected: false,
            isDemo: false,
          };
        });

        setProfileResults(mapped);
        setProfileState(mapped.length > 0 ? "ready" : "empty");
      } catch {
        setProfileError("Failed to load downloaded profile media");
        setProfileState("error");
      }
    },
    [profileSourcePlatform],
  );

  // ---- Profile selection helpers (updated) ----
  const selectProfileResults = useCallback(
    async (resultIds: string[], selectAll = false) => {
      if (!profileJobId) return;
      // Save the IDs that are being submitted
      const submittedIds = new Set(resultIds);
      try {
        await selectDownloadJobResults(
          profileJobId,
          selectAll
            ? { select_all: true }
            : { result_ids: resultIds },
        );
        setLiveFeedback(`${resultIds.length} results selected. Worker will process them.`);
        window.setTimeout(() => setLiveFeedback(""), 3000);

        // Immediately remove the submitted results from profileResults
        setProfileResults(prev =>
          prev.filter(item => !submittedIds.has(item.id))
        );

        // Clear selected IDs
        setSelectedIds(new Set());

        // Refetch both profile results and jobs queue
        polling.fetchJobs();
        if (profileJobId) {
          loadProfileResults(profileJobId);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setLiveFeedback(err.message);
        } else {
          setLiveFeedback("Failed to select results");
        }
        window.setTimeout(() => setLiveFeedback(""), 5000);
      }
    },
    [profileJobId, polling, loadProfileResults, setSelectedIds],
  );

  const loadDemoPreview = useCallback(() => {
    const demo = createDemoProfileResults(8);
    setProfileResults(demo);
    setProfileState("results");
    setLiveFeedback("Demo preview loaded – all items marked DEMO");
    window.setTimeout(() => setLiveFeedback(""), 3000);
  }, []);

  const toggleProfileSelect = useCallback((id: string) => {
    setProfileResults((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  }, []);

  const selectAllProfile = useCallback(() => {
    setProfileResults((prev) => prev.map((r) => ({ ...r, selected: true })));
  }, []);

  const deselectAllProfile = useCallback(() => {
    setProfileResults((prev) => prev.map((r) => ({ ...r, selected: false })));
  }, []);

  const removeProfileResult = useCallback((id: string) => {
    setProfileResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ---- Shared profile batch submission ----
  const submitProfileResults = useCallback(
    async (profileItems: ProfileResultItem[]) => {
      const seenUrls = new Set<string>();
      const uniqueItems: Array<{ item: ProfileResultItem; url: string; key: string }> = [];

      profileItems.forEach((item) => {
        const url = item.originalUrl?.trim();
        if (!url) return;

        const key = url.toLowerCase();
        if (seenUrls.has(key)) return;

        seenUrls.add(key);
        uniqueItems.push({ item, url, key });
      });

      if (uniqueItems.length === 0) {
        setLiveFeedback("No results have a downloadable URL.");
        return { acceptedUrlKeys: new Set<string>(), acceptedCount: 0, failed: false };
      }

      setSelectedBatch((prev) => ({ ...prev, state: "submitting" as const }));

      const acceptedUrlKeys = new Set<string>();
      let acceptedCount = 0;
      let firstBatchId = "";

      try {
        // Collect all URLs first instead of processing in chunks
        const allUrls = uniqueItems.map(({ url }) => url);
        const result = await addMultipleUrls(allUrls.join("\n"));

        if (!result.apiResult) {
          setSelectedBatch((prev) => ({
            ...prev,
            state: "failed" as const,
            total: acceptedCount,
          }));
          return { acceptedUrlKeys, acceptedCount, failed: true };
        }

        acceptedCount += result.added.length;

        const chunkItemsByUrl = new Map<string, ProfileResultItem>();
        uniqueItems.forEach(({ item, url, key }) => {
          chunkItemsByUrl.set(key, item);
          const validation = normalizeAndValidateUrl(url);
          if (validation.valid) {
            chunkItemsByUrl.set(validation.normalizedUrl.toLowerCase(), item);
          }
        });

        const batchResults = new Map<string, ProfileResultItem[]>();

        result.added.forEach((addedItem) => {
          const addedUrlKey = addedItem.originalUrl.toLowerCase();
          const profileItem = chunkItemsByUrl.get(addedUrlKey);

          acceptedUrlKeys.add(addedUrlKey);
          if (profileItem?.originalUrl) {
            acceptedUrlKeys.add(profileItem.originalUrl.toLowerCase());
          }

          const batchId = addedItem.batch_id;
          if (!batchId) return;

          if (!firstBatchId) {
            firstBatchId = batchId;
          }

          const itemsForBatch = batchResults.get(batchId) ?? [];
          if (profileItem && !itemsForBatch.some((item) => item.id === profileItem.id)) {
            itemsForBatch.push(profileItem);
          }
          batchResults.set(batchId, itemsForBatch);
        });

        if (batchResults.size > 0) {
          setProfileBatchMetadata((prev) => {
            const next = new Map(prev);

            batchResults.forEach((batchItems, batchId) => {
              const metadata: ProfileBatchMetadata = {
                batchId,
                sourceUrl: profileUrl,
                sourceName: deriveSourceNameFromProfileUrl(profileUrl),
                platform: profileSourcePlatform,
                createdAt: Date.now(),
                results: batchItems.map((item) => ({
                  resultId: item.id,
                  title: item.title,
                  originalUrl: item.originalUrl ?? "",
                  thumbnailUrl: item.thumbnailUrl,
                })),
              };
              next.set(batchId, metadata);
            });

            return next;
          });
        }

        setSelectedBatch({
          state: "idle" as const,
          batchId: firstBatchId,
          total: acceptedCount,
          completed: 0,
          failed: 0,
          availableFiles: 0,
        });
        setLiveFeedback(
          acceptedCount > 0
            ? `${acceptedCount} result${acceptedCount !== 1 ? "s" : ""} added to queue`
            : "No jobs were created",
        );

        return { acceptedUrlKeys, acceptedCount, failed: false };
      } catch (err) {
        setSelectedBatch((prev) => ({ ...prev, state: "failed" as const }));
        if (err instanceof ApiError) {
          setLiveFeedback(err.message);
        } else {
          setLiveFeedback("Failed to submit downloads");
        }
        return { acceptedUrlKeys, acceptedCount, failed: true };
      }
    },
    [addMultipleUrls, profileUrl, profileSourcePlatform],
  );

  const addSelectedProfileToQueue = useCallback(async () => {
    // Get all selected results regardless of their queue status
    const selected = profileResults.filter((r) => r.selected);
    if (selected.length === 0) return;

    setProfileSubmissionMode("selected");
    // Save the IDs that are being submitted
    const submittedIds = new Set(selected.map(r => r.id));
    try {
      // Submit the selected results
      const selectAll =
        selected.length === profileResults.length;

      await selectProfileResults(
        Array.from(submittedIds),
        selectAll,
      );
    } finally {
      setProfileSubmissionMode(null);
    }
  }, [profileResults, selectProfileResults]);

  const downloadAllProfileResults = useCallback(async () => {
    const downloadable = profileResults.filter((r) => r.originalUrl);
    if (downloadable.length === 0) return;

    setProfileSubmissionMode("all");
    try {
      await submitProfileResults(downloadable);
    } finally {
      setProfileSubmissionMode(null);
    }
  }, [profileResults, submitProfileResults]);

  // ---- Individual processing ----
  const addProfileItemToQueue = useCallback(
    async (id: string) => {
      const entry = individualDownloads[id];

      // Already processing or processed - do not create another job
      if (entry?.state === "processing" || entry?.state === "ready") {
        return;
      }

      const resultItem = profileResults.find((r) => r.id === id);
      if (!resultItem) return;
      if (!resultItem.originalUrl) {
        setLiveFeedback("Result has no downloadable URL.");
        window.setTimeout(() => setLiveFeedback(""), 3000);
        return;
      }

      setIndividualDownloads((prev) => ({
        ...prev,
        [id]: { state: "processing", jobId: "" },
      }));

      try {
        const addResult = await addSingleUrl(resultItem.originalUrl);
        if (addResult.added.length > 0) {
          const jobId = addResult.added[0].id;
          setIndividualDownloads((prev) => ({
            ...prev,
            [id]: { state: "processing", jobId },
          }));
          setLiveFeedback("1 result added to queue");
          window.setTimeout(() => setLiveFeedback(""), 3000);
        } else {
          setIndividualDownloads((prev) => ({
            ...prev,
            [id]: { state: "failed" },
          }));
          setLiveFeedback("Result could not be added");
          window.setTimeout(() => setLiveFeedback(""), 3000);
        }
      } catch (err) {
        setIndividualDownloads((prev) => ({
          ...prev,
          [id]: { state: "failed" },
        }));
        if (err instanceof ApiError) {
          setLiveFeedback(err.message);
        } else {
          setLiveFeedback("Failed to add download");
        }
      }
    },
    [profileResults, addSingleUrl, individualDownloads],
  );

  // ---- Individual processing state synchronization (non-downloading) ----
  // Observe existing jobs and update individual download state without fetching or downloading
  useEffect(() => {
    setIndividualDownloads((prev) => {
      const next = { ...prev };
      let changed = false;

      Object.entries(prev).forEach(([resultId, entry]) => {
        if (entry.state === "idle") return;

        if (entry.state === "processing" && entry.jobId) {
          const job = items.find((i) => i.id === entry.jobId);
          if (job) {
            if (
              (job.status === "completed" || job.status === "partially_completed") &&
              job.mediaAssetsCount > 0
            ) {
              next[resultId] = { state: "ready", jobId: job.id, url: "" };
              changed = true;
            } else if (job.status === "failed" || job.status === "cancelled") {
              next[resultId] = { state: "failed" };
              changed = true;
            }
          }
        }
      });

      return changed ? next : prev;
    });
  }, [items]);

// Queue actions
  const cancelJob = useCallback(
    async (id: string) => {
      // Demo items: update local state only
      if (isDemoId(id)) {
        polling.setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: "cancelled" as const, cancelled_at: new Date().toISOString() } : j)),
        );
        setLiveFeedback("Demo job cancelled");
        window.setTimeout(() => setLiveFeedback(""), 3000);
        return;
      }

      // Check eligibility
      const job = polling.jobs.find((j) => j.id === id);
      if (!job) return;
      if (!canCancelDownloadJob(job.status)) {
        setLiveFeedback("This job cannot be cancelled in its current state");
        window.setTimeout(() => setLiveFeedback(""), 4000);
        return;
      }

      setActionLoading((prev) => new Set(prev).add(id));
      const version = (mutationVersionRef.current.get(id) ?? 0) + 1;
      mutationVersionRef.current.set(id, version);

      try {
        await cancelDownloadJob(id);
        // Only update if no newer mutation happened
        if (mutationVersionRef.current.get(id) === version) {
          await polling.refreshJob(id);
        }
        setLiveFeedback("Download cancellation requested.");
        window.setTimeout(() => setLiveFeedback(""), 3000);
      } catch (err) {
        if (mutationVersionRef.current.get(id) !== version) return;
        if (err instanceof ApiError) {
          if (err.status === 409) {
            setLiveFeedback("Job state changed. Queue refreshed.");
            await polling.fetchJobs();
          } else if (err.status === 404) {
            setLiveFeedback("This download job no longer exists.");
            polling.setJobs((prev) => prev.filter((j) => j.id !== id));
          } else if (err.status === 401) {
            setLiveFeedback("Authentication is required, or local guest API access is disabled.");
          } else {
            setLiveFeedback(err.message);
          }
        } else {
          setLiveFeedback("Nexapa API cannot be reached.");
        }
        window.setTimeout(() => setLiveFeedback(""), 5000);
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [polling],
  );

  const retryJob = useCallback(
    async (id: string) => {
      // Demo items: update local state only
      if (isDemoId(id)) {
        polling.setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: "queued" as const, error_code: null, error_message: null, retry_count: j.retry_count + 1 } : j)),
        );
        setLiveFeedback("Demo job queued for retry");
        window.setTimeout(() => setLiveFeedback(""), 3000);
        return;
      }

      setActionLoading((prev) => new Set(prev).add(id));
      try {
        await retryDownloadJob(id);
        await polling.refreshJob(id);
        setLiveFeedback("Job queued for retry");
        window.setTimeout(() => setLiveFeedback(""), 3000);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            setLiveFeedback("Job state changed. Queue refreshed.");
            await polling.fetchJobs();
          } else if (err.status === 401) {
            setLiveFeedback("Authentication is required, or local guest API access is disabled.");
          } else {
            setLiveFeedback(err.message);
          }
        } else {
          setLiveFeedback("Nexapa API cannot be reached.");
        }
        window.setTimeout(() => setLiveFeedback(""), 5000);
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [polling],
  );

  const removeJob = useCallback(
    async (id: string) => {
      // Demo items: remove from local state only
      if (isDemoId(id)) {
        polling.setJobs((prev) => prev.filter((j) => j.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        // If this is the profile job, reset profile state
        if (id === profileJobId) {
          setProfileJobId(null);
          setProfileState("idle");
          setProfileResults([]);
        }
        setLiveFeedback("Demo job removed");
        window.setTimeout(() => setLiveFeedback(""), 3000);
        return;
      }

      // Check eligibility
      const job = polling.jobs.find((j) => j.id === id);
      if (!job) return;
      if (!canDeleteDownloadJob(job.status)) {
        setLiveFeedback("Cancel this job before removing it.");
        window.setTimeout(() => setLiveFeedback(""), 4000);
        return;
      }

      setActionLoading((prev) => new Set(prev).add(id));

      try {
        await deleteDownloadJob(id);
        polling.setJobs((prev) => prev.filter((j) => j.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        // If this is the profile job, reset profile state
        if (id === profileJobId) {
          setProfileJobId(null);
          setProfileState("idle");
          setProfileResults([]);
        }
        setLiveFeedback("Download job removed.");
        window.setTimeout(() => setLiveFeedback(""), 3000);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            setLiveFeedback("Job state changed. Queue refreshed.");
            await polling.fetchJobs();
          } else if (err.status === 404) {
            // Treat 404 as already removed
            polling.setJobs((prev) => prev.filter((j) => j.id !== id));
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            // If this is the profile job, reset profile state
            if (id === profileJobId) {
              setProfileJobId(null);
              setProfileState("idle");
              setProfileResults([]);
            }
            setLiveFeedback("Download job was already removed.");
          } else if (err.status === 401) {
            setLiveFeedback("Authentication is required, or local guest API access is disabled.");
          } else {
            setLiveFeedback(err.message);
          }
        } else {
          setLiveFeedback("Nexapa API cannot be reached.");
        }
        window.setTimeout(() => setLiveFeedback(""), 5000);
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [polling, profileJobId],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const removeSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    const eligible = selectedItems.filter((i) => canDeleteDownloadJob(i.status) || isDemoId(i.id));
    await Promise.all(eligible.map((i) => removeJob(i.id)));
  }, [selectedIds, items, removeJob]);

  const cancelSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    const eligible = selectedItems.filter((i) => canCancelDownloadJob(i.status) || isDemoId(i.id));
    await Promise.all(eligible.map((i) => cancelJob(i.id)));
  }, [selectedIds, items, cancelJob]);

  const retrySelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    const eligible = selectedItems.filter((i) => canRetryDownloadJob(i.status) || isDemoId(i.id));
    await Promise.all(eligible.map((i) => retryJob(i.id)));
  }, [selectedIds, items, retryJob]);

  const [downloadMediaSubmitting, setDownloadMediaSubmitting] = useState(false);

  const downloadMediaSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter(
      (i) =>
        selectedIds.has(i.id) &&
        (i.status === "completed" || i.status === "partially_completed") &&
        i.mediaAssetsCount > 0 &&
        !isDemoId(i.id),
    );

    if (selectedItems.length === 0) {
      setLiveFeedback("No downloadable media in current selection.");
      window.setTimeout(() => setLiveFeedback(""), 4000);
      return;
    }

    setDownloadMediaSubmitting(true);
    let downloadCount = 0;

    try {
      for (const item of selectedItems) {
        try {
          const detail = await getDownloadJob(item.id);
          for (const asset of detail.media_assets) {
            if (asset.download_url) {
              const a = document.createElement("a");
              a.href = asset.download_url;
              a.download = asset.display_name || asset.original_name;
              a.target = "_blank";
              a.rel = "noopener";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              downloadCount++;
            }
          }
        } catch {
          // individual job fetch failure â€” continue with others
        }
      }

      if (downloadCount > 0) {
        setLiveFeedback(`Started ${downloadCount} download${downloadCount !== 1 ? "s" : ""}.`);
      } else {
        setLiveFeedback("No media download URLs available yet.");
      }
      window.setTimeout(() => setLiveFeedback(""), 4000);
    } finally {
      setDownloadMediaSubmitting(false);
    }
  }, [selectedIds, items]);

  const copyText = useCallback(async (text: string): Promise<boolean> => {
    setClipboardError("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      setClipboardError("Clipboard access failed. Copy manually.");
      return false;
    }
  }, []);

  const copyItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return false;
      return copyText(item.originalUrl);
    },
    [items, copyText],
  );

  const copySelected = useCallback(async () => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return false;
    const text = selected.map((i) => i.originalUrl).join("\n");
    return copyText(text);
  }, [items, selectedIds, copyText]);

  const filteredProfile = useMemo(() => {
    let list = [...profileResults];
    if (profileFilter.search.trim()) {
      const t = profileFilter.search.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(t));
    }
    if (profileFilter.mediaType !== "all") {
      list = list.filter((r) => {
        if (profileFilter.mediaType === "video") return r.mediaType === "video" || r.sourceType === "reel";
        if (profileFilter.mediaType === "post") return r.sourceType === "post" || r.sourceType === "reel";
        return r.mediaType !== "video" && r.sourceType !== "post" && r.sourceType !== "reel";
      });
    }
    if (profileSort === "newest") {
      list.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    } else {
      list.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    }
    return list;
  }, [profileResults, profileFilter, profileSort]);

  const filteredQueue = useMemo(() => {
    let list = [...items];
    const f = queueFilter;

    // Filter out profile parent jobs using authoritative criteria
    // Profile parent job: mode === "profile" && parent_download_job_id == null && download_result_id == null
    list = list.filter((i) => {
      // Exclude profile parent jobs from queue filter
      const isProfileParent =
        i.mode === "profile" &&
        i.parent_download_job_id == null &&
        i.download_result_id == null;

      return !isProfileParent;
    });

    if (f.search.trim()) {
      const term = f.search.toLowerCase();
      list = list.filter((i) => `${i.title} ${i.originalUrl}`.toLowerCase().includes(term));
    }
    if (f.platform !== "all") {
      list = list.filter((i) => i.platform === f.platform);
    }
    if (f.source !== "all") {
      list = list.filter((i) => i.sourceType === f.source);
    }
    switch (queueSort) {
      case "platform":
        list.sort((a, b) => a.platform.localeCompare(b.platform));
        break;
      case "title-asc":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "recent":
      default:
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        break;
    }
    return list;
  }, [items, queueFilter, queueSort]);

const counts = useMemo(() => {
    const platforms: Record<string, number> = {};
    const sources: Record<string, number> = {};
    let mp4 = 0;
    let audio = 0;
    for (const it of items) {
      platforms[it.platform] = (platforms[it.platform] ?? 0) + 1;
      sources[it.sourceType] = (sources[it.sourceType] ?? 0) + 1;
      if (it.outputFormat === "mp4") mp4 += 1;
      else audio += 1;
    }
    return {
      total: items.length,
      selected: selectedIds.size,
      platforms,
      sources,
      mp4,
      audio,
    };
  }, [items, selectedIds.size]);

  const isAllSelected = useMemo(() => items.length > 0 && selectedIds.size === items.length, [items.length, selectedIds]);

  // Confirmation dialog helpers
  const requestCancelJob = useCallback((id: string) => {
    setConfirmAction({ type: "cancel", jobId: id });
  }, []);

  const requestRemoveJob = useCallback((id: string) => {
    setConfirmAction({ type: "remove", jobId: id });
  }, []);

  const confirmCancelJob = useCallback(async () => {
    if (!confirmAction || confirmAction.type !== "cancel") return;
    const id = confirmAction.jobId;
    setConfirmLoading(true);
    try {
      await cancelJob(id);
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, cancelJob]);

  const confirmRemoveJob = useCallback(async () => {
    if (!confirmAction || confirmAction.type !== "remove") return;
    const id = confirmAction.jobId;
    setConfirmLoading(true);
    try {
      await removeJob(id);
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, removeJob]);

const dismissConfirm = useCallback(() => {
    setConfirmAction(null);
    setConfirmLoading(false);
  }, []);

  const setProfileStateWithError = useCallback((state: ProfileWorkspaceState, error: string) => {
    setProfileState(state);
    setProfileError(error);
  }, [setProfileState, setProfileError]);

  return {
    // Core
    items,
    settings,
    setSettings,
    selectedIds,
    lastResult,
    clipboardError,
    liveFeedback,
    setLiveFeedback,
    counts,
    isAllSelected,
    inputMode,
    setInputMode,
    // Connection
    connectionState,
    connectionError: polling.error,
    // Profile
    profileUrl,
    setProfileUrl,
    profileState,
    setProfileState,
    profileError,
    profileResults,
    filteredProfile,
    profileFilter,
    setProfileFilter,
    profileSort,
    setProfileSort,
    profileView,
    setProfileView,
    profileSourcePlatform,
    profileJobId,
    analyzeProfile,
    loadProfileResults,
    loadCompletedProfileResults,
    selectProfileResults,
    loadDemoPreview,
    toggleProfileSelect,
    selectAllProfile,
    deselectAllProfile,
    removeProfileResult,
    addSelectedProfileToQueue,
    downloadAllProfileResults,
    addProfileItemToQueue,
    // Queue UI
    queueFilter,
    setQueueFilter,
    queueSort,
    setQueueSort,
    queueView,
    setQueueView,
    filteredQueue,
    // Actions
    addSingleUrl,
    addMultipleUrls,
    cancelJob,
    retryJob,
    removeJob,
    toggleSelect,
    selectAllFiltered,
    deselectAll,
    removeSelected,
    cancelSelected,
    retrySelected,
    downloadMediaSelected,
    isDownloadMediaSubmitting: downloadMediaSubmitting,
    copyItem,
    copySelected,
    // Confirmation dialog
    requestCancelJob,
    requestRemoveJob,
    confirmCancelJob,
    confirmRemoveJob,
    dismissConfirm,
    confirmAction,
    confirmLoading,
    // Action loading
    actionLoading,
// Polling
    fetchJobs: polling.fetchJobs,
    refreshJob: polling.refreshJob,
    // Profile ZIP download
    selectedBatch,
    setSelectedBatch,
    selectedSubmitting,
    allProfileSubmitting,
    // Profile individual download
    individualDownloads,
    setIndividualDownloads,
    profileSubmittingIds,
    profileProcessedIds,
    // Profile batch metadata
    profileBatchMetadata,
    setProfileStateWithError,
    setProfileJobId,
  };
}


