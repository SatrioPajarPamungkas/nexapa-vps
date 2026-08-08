import { useState } from "react";
import { Link, Plus, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DownloadPlatform, SourceType, AddUrlResult } from "../downloader.types";
import { detectPlatformFromUrl, detectSourceType } from "../downloader.utils";
import { PlatformBadge } from "./PlatformBadge";
import { MAX_QUEUE } from "../downloader.constants";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => Promise<AddUrlResult | void> | AddUrlResult | void;
  queueCount: number;
  feedback: string;
  isSubmitting?: boolean;
};

export function SingleUrlInput({ value, onChange, onAdd, queueCount, feedback, isSubmitting }: Props) {
  const [errorText, setErrorText] = useState<string>("");
  const [localResult, setLocalResult] = useState<AddUrlResult | null>(null);

  const trimmed = value.trim();
  let platform: DownloadPlatform | null = null;
  let source: SourceType | null = null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      platform = detectPlatformFromUrl(trimmed);
      source = detectSourceType(trimmed, platform);
    } catch {
      // ignore
    }
  }

  async function handleAdd() {
    setErrorText("");
    if (!trimmed) {
      setErrorText("Please enter a URL starting with http:// or https://");
      return;
    }
    if (queueCount >= MAX_QUEUE) {
      setErrorText(`Queue limit reached (${MAX_QUEUE}). Remove items first.`);
      return;
    }
    const res = await onAdd();
    if (!res) return;
    setLocalResult(res);
    if (res.invalidLines.length > 0) {
      setErrorText(res.invalidLines[0]?.reason ?? "Invalid URL");
    } else if (res.duplicateLines.length > 0) {
      setErrorText("This URL is already in the queue");
    } else if (res.overLimitSkipped > 0) {
      setErrorText("Queue is full");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-3" id="single-panel" role="tabpanel" aria-labelledby="tab-single">
      <label htmlFor="single-url" className="sr-only">
        Media URL
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative flex-1">
          <Link className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="single-url"
            type="url"
            inputMode="url"
            placeholder="Paste a video, post, or profile URL..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (errorText) setErrorText("");
              if (localResult) setLocalResult(null);
            }}
            onKeyDown={handleKeyDown}
            aria-invalid={!!errorText}
            aria-describedby={errorText ? "single-url-error" : "single-url-help"}
            className={cn(
              "h-11 w-full rounded-xl border bg-white/15 pl-10 pr-3 text-[14px] text-slate-950 backdrop-blur-xl placeholder:text-slate-600 transition focus:outline-none focus:ring-2 autofill:!bg-white/15",
              errorText
                ? "border-rose-300/60 focus:border-rose-400/60 focus:bg-white/22 focus:ring-rose-200/50"
                : "border-white/25 focus:border-blue-400/60 focus:bg-white/22 focus:ring-2 focus:ring-blue-400/20",
            )}
          />
        </div>
        <button
          type="button"
          disabled={!trimmed || queueCount >= MAX_QUEUE || isSubmitting}
          onClick={handleAdd}
          className="inline-flex min-h-[44px] h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? "Adding..." : "Add to Queue"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span id="single-url-help" className="text-[11px] text-slate-700">
          {queueCount}/{MAX_QUEUE} queued
        </span>
        {platform && source && (
          <>
            <span className="text-[11px] text-white/40" aria-hidden="true">·</span>
            <PlatformBadge platform={platform} />
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[11px] text-slate-700 backdrop-blur-xl">
              Likely <span className="font-medium capitalize">{source}</span>
            </span>
          </>
        )}
      </div>

      {errorText && (
        <p id="single-url-error" className="flex items-start gap-1.5 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-[12px] leading-5 text-rose-800 backdrop-blur-xl" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{errorText}</span>
        </p>
      )}

      <div aria-live="polite" aria-atomic="true">
        {feedback && !errorText && (
          <p className="text-[11px] text-slate-600">{feedback}</p>
        )}
      </div>
    </div>
  );
}
