import { useState } from "react";
import { Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DownloadPlatform, SourceType } from "../downloader.types";
import { detectPlatformFromUrl, detectSourceType } from "../downloader.utils";
import { PlatformBadge } from "./PlatformBadge";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onAnalyze: (url: string) => void;
  error: string;
  isAnalyzing?: boolean;
};

export function ProfileUrlInput({ value, onChange, onAnalyze, error, isAnalyzing }: Props) {
  const [localError, setLocalError] = useState<string>("");

  let platform: DownloadPlatform | null = null;
  let source: SourceType | null = null;
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      platform = detectPlatformFromUrl(trimmed);
      source = detectSourceType(trimmed, platform);
    } catch {
      // ignore
    }
  }

  function handleAnalyze() {
    setLocalError("");
    if (!trimmed) {
      setLocalError("Enter a profile, channel, playlist, or creator URL");
      return;
    }
    onAnalyze(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAnalyze();
    }
  }

  const displayError = error || localError;

  return (
    <div id="profile-panel" role="tabpanel" aria-labelledby="tab-profile" className="space-y-3">
      <label htmlFor="profile-url" className="sr-only">
        Profile, channel, or playlist URL
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="profile-url"
            type="url"
            inputMode="url"
            placeholder="Paste a profile, creator, channel, or playlist URL..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (localError) setLocalError("");
            }}
            onKeyDown={handleKeyDown}
            aria-invalid={!!displayError}
            aria-describedby="profile-help"
            className={cn(
              "h-11 w-full rounded-xl border bg-white/15 pl-10 pr-3 text-[14px] text-slate-950 backdrop-blur-xl placeholder:text-slate-600 transition focus:outline-none focus:ring-2",
              displayError
                ? "border-rose-300/60 focus:border-rose-400/60 focus:bg-white/22 focus:ring-rose-200/50"
                : "border-white/25 focus:border-blue-400/60 focus:bg-white/22 focus:ring-2 focus:ring-blue-400/20",
            )}
          />
        </div>
        <button
          type="button"
          disabled={!trimmed || isAnalyzing}
          onClick={handleAnalyze}
          className="inline-flex min-h-[44px] h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
        >
          {isAnalyzing ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" aria-hidden="true" />
              Analyze Profile
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2" id="profile-help">
        <span className="text-[11px] text-slate-700">
          Paste a supported profile, creator, channel, page, or playlist URL
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

      {displayError && (
        <p className="flex items-start gap-1.5 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-800 backdrop-blur-xl" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
}
