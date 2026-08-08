import { useMemo, useState } from "react";
import { ListPlus, CheckCircle2, AlertTriangle, Info, Loader2 } from "lucide-react";
import type { AddUrlResult } from "../downloader.types";
import { MAX_QUEUE } from "../downloader.constants";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onAddMultiple: () => Promise<AddUrlResult | void> | AddUrlResult | void;
  queueCount: number;
  feedback: string;
  isSubmitting?: boolean;
};

function buildCompactSummary(result: AddUrlResult): { text: string; tone: "success" | "warning" | "neutral" } {
  const parts: string[] = [];
  let hasIssues = false;
  if (result.added.length > 0) parts.push(`${result.added.length} added`);
  if (result.invalidLines.length > 0) {
    parts.push(`${result.invalidLines.length} invalid`);
    hasIssues = true;
  }
  if (result.duplicateLines.length > 0) {
    parts.push(`${result.duplicateLines.length} duplicate`);
    hasIssues = true;
  }
  if (result.overLimitSkipped > 0) {
    parts.push(`${result.overLimitSkipped} over limit`);
    hasIssues = true;
  }
  if (parts.length === 0) return { text: "No valid URLs to add", tone: "neutral" };
  return {
    text: parts.join(" · "),
    tone: result.added.length > 0 && !hasIssues ? "success" : hasIssues ? "warning" : "neutral",
  };
}

export function MultipleUrlInput({ value, onChange, onAddMultiple, queueCount, feedback, isSubmitting }: Props) {
  const [lastResult, setLastResult] = useState<AddUrlResult | null>(null);
  const summary = lastResult ? buildCompactSummary(lastResult) : null;

  const lines = useMemo(() => value.split(/\r?\n/), [value]);
  const nonEmpty = useMemo(() => lines.filter((l) => l.trim()).length, [lines]);

  async function handleAdd() {
    const res = await onAddMultiple();
    if (!res) return;
    setLastResult(res);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div id="multi-panel" role="tabpanel" aria-labelledby="tab-multi" className="space-y-3">
      <label htmlFor="multi-urls" className="sr-only">
        Media URLs, one per line
      </label>
      <textarea
        id="multi-urls"
        rows={6}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (lastResult) setLastResult(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder={"Paste multiple URLs, one per line...\nhttps://www.tiktok.com/@user/video/123\nhttps://youtu.be/abc\nhttps://www.instagram.com/p/..."}
        aria-describedby="multi-help"
        className="w-full resize-y rounded-xl border border-white/25 bg-white/15 p-3 font-mono text-[13px] leading-6 text-slate-950 backdrop-blur-xl placeholder:text-slate-600 transition focus:border-blue-400/60 focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2" id="multi-help">
          <span className="text-[11px] text-slate-700">
            {nonEmpty} URL{nonEmpty !== 1 ? "s" : ""} · {queueCount}/{MAX_QUEUE} queued
          </span>
          <span className="text-[11px] text-slate-500">
            ⌘ Enter to add
          </span>
        </div>
        <button
          type="button"
          disabled={nonEmpty === 0 || queueCount >= MAX_QUEUE || isSubmitting}
          onClick={handleAdd}
          className="inline-flex min-h-[40px] h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ListPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? "Adding..." : "Add All to Queue"}
        </button>
      </div>

      <div aria-live="polite" className="space-y-2">
        {summary && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium backdrop-blur-xl ${
              summary.tone === "success"
                ? "border-emerald-300/30 bg-emerald-500/12 text-emerald-800"
                : summary.tone === "warning"
                  ? "border-amber-300/30 bg-amber-500/12 text-amber-800"
                  : "border-white/15 bg-white/8 text-slate-700"
            }`}
            role="status"
          >
            {summary.tone === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : summary.tone === "warning" ? (
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {summary.text}
          </div>
        )}

        {lastResult && lastResult.invalidLines.length > 0 && (
          <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 backdrop-blur-xl">
            <ul className="space-y-0.5 text-[11px] leading-5 text-amber-800">
              {lastResult.invalidLines.slice(0, 3).map((l) => (
                <li key={`${l.lineNumber}-${l.value}`}>
                  Line {l.lineNumber}: {l.reason}
                </li>
              ))}
              {lastResult.invalidLines.length > 3 && (
                <li>+{lastResult.invalidLines.length - 3} more</li>
              )}
            </ul>
          </div>
        )}

        {feedback && !summary && (
          <p className="text-[11px] text-slate-600">{feedback}</p>
        )}
      </div>
    </div>
  );
}
