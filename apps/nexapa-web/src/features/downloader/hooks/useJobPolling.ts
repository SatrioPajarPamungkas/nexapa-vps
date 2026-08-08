import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiDownloadJob } from "@/lib/api/response.types";
import { listDownloadJobs, getDownloadJob } from "@/lib/api/download-jobs";
import { isApiConfigured } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { POLL_INTERVAL_MS } from "../downloader.constants";
import type { ConnectionState } from "../downloader.types";
import { isJobActive, isJobAwaitingSelection } from "../downloader.utils";

export function useJobPolling() {
  const [jobs, setJobs] = useState<ApiDownloadJob[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);
  const isPausedRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);

  const fetchJobs = useCallback(async () => {
    if (isFetchingRef.current) return;

    if (!isApiConfigured()) {
      setConnectionState("unreachable");
      setError("API not configured");
      return;
    }

    isFetchingRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const collectedJobs: ApiDownloadJob[] = [];
      const seenJobIds = new Set<string>();
      let page = 1;
      let lastPage = 1;

      do {
        if (controller.signal.aborted) return;

        const result = await listDownloadJobs(
          { per_page: 50, page, sort: "-created_at" },
          controller.signal,
        );

        if (controller.signal.aborted) return;

        for (const job of result.data) {
          if (!seenJobIds.has(job.id)) {
            seenJobIds.add(job.id);
            collectedJobs.push(job);
          }
        }

        lastPage = result.meta.last_page;
        page += 1;
      } while (page <= lastPage);

      setJobs(collectedJobs);
      setConnectionState("connected");
      setError(null);
      consecutiveErrorsRef.current = 0;
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setConnectionState("auth_required");
          setError(err.message);
          stopPolling();
          return;
        }
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= 3) {
          setConnectionState("unreachable");
          setError(err.message);
        }
      } else {
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= 3) {
          setConnectionState("unreachable");
          setError("Nexapa API cannot be reached.");
        }
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      isFetchingRef.current = false;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    fetchJobs();
    pollTimerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        fetchJobs();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchJobs]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const refreshJob = useCallback(async (id: string): Promise<ApiDownloadJob | null> => {
    try {
      const detail = await getDownloadJob(id);
      // Map ApiDownloadJobDetail to ApiDownloadJob for state consistency
      const job: ApiDownloadJob = {
        id: detail.id,
        user_id: null,
        mode: detail.mode,
        original_input: detail.original_input,
        normalized_url: detail.normalized_url,
        platform: detail.platform,
        source_type: detail.source_type,
        output_format: detail.output_format,
        quality: detail.quality,
        filename_mode: detail.filename_mode,
        delay_seconds: detail.delay_seconds,
        status: detail.status,
        progress: detail.progress,
        current_stage: detail.current_stage,
        error_code: detail.error_code,
        error_message: detail.error_message,
        retry_count: detail.retry_count,
        max_retries: detail.max_retries,
        claimed_at: detail.claimed_at,
        started_at: detail.started_at,
        completed_at: detail.completed_at,
        cancelled_at: detail.cancelled_at,
        metadata: null,
        created_at: detail.created_at,
        updated_at: detail.created_at,
        results_count: detail.results?.length,
        media_assets_count:
          detail.available_media_assets_count ??
          detail.media_assets?.length ??
          0,
      };
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === id);
        if (idx === -1) return [...prev, job];
        const next = [...prev];
        next[idx] = job;
        return next;
      });
      return job;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    startPolling();
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  useEffect(() => {
    const handleVisibility = () => {
      isPausedRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const activeJobs = jobs.filter((j) => isJobActive(j.status));
  const awaitingSelectionJobs = jobs.filter((j) => isJobAwaitingSelection(j.status));

  return {
    jobs,
    activeJobs,
    awaitingSelectionJobs,
    connectionState,
    error,
    fetchJobs,
    refreshJob,
    startPolling,
    stopPolling,
    setJobs,
  };
}
