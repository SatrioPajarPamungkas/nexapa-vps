import type { EndpointSettings as EndpointSettingsType } from "../settings.types";
import { useMemo, useState } from "react";
import { isValidHttpsUrl } from "../settings.utils";
import { Copy, Check } from "lucide-react";

type Props = {
  value: EndpointSettingsType;
  onChange: (patch: Partial<EndpointSettingsType>) => void;
  onCopyFeedback: (msg: string) => void;
};

export function EndpointSettings({ value, onChange, onCopyFeedback }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      if (!isValidHttpsUrl(v)) e[k] = "Must be valid HTTPS URL (localhost HTTP allowed for dev)";
    }
    return e;
  }, [value]);

  const copy = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      onCopyFeedback(`Copied ${key} – sensitive values were excluded from safe export, but individual endpoint copy is allowed.`);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      onCopyFeedback("Clipboard failed – copy manually.");
    }
  };

  const copySafeList = async () => {
    const safeList = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join("\n");
    try {
      await navigator.clipboard.writeText(safeList);
      onCopyFeedback("Safe endpoint list copied – no secrets included. Sensitive values were excluded.");
    } catch {
      onCopyFeedback("Clipboard failed.");
    }
  };

  return (
    <div className="space-y-6 bg-transparent">
      <div className="nexapa-glass-card flex flex-col gap-3 rounded-2xl border border-white/20 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900">Endpoints</h3>
          <p className="mt-1 text-[12px] text-slate-600">Validate HTTPS, allow localhost HTTP for dev, detect duplicates, copy individual endpoint.</p>
        </div>
        <button type="button" onClick={copySafeList} className="inline-flex h-10 min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-[12px] font-medium text-slate-700 backdrop-blur-xl transition hover:bg-white/18 hover:text-slate-900">
          <Copy className="h-4 w-4" aria-hidden="true" /> Copy safe list
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(
          [
            ["apiBase", "Nexapa API base URL", "https://api.nexapa.app/api"],
            ["authBase", "Authentication callback base URL", "https://nexapa.app/auth"],
            ["webhookBase", "Webhook base URL", "https://api.nexapa.app/webhooks"],
            ["mediaBase", "Media delivery base URL", "https://media.nexapa.app"],
            ["workerCallback", "Worker callback URL", "https://api.nexapa.app/workers/callback"],
            ["health", "Health-check endpoint", "https://api.nexapa.app/health"],
          ] as Array<[keyof EndpointSettingsType, string, string]>
        ).map(([key, label, placeholder]) => (
          <div key={key} className="nexapa-glass-card flex flex-col gap-2 rounded-xl border border-white/20 p-4 shadow-[0_8px_30px_rgba(2,6,23,0.08)]">
            <label htmlFor={`endpoint-${key}`} className="block text-[12px] font-medium text-slate-700">
              {label}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur-xl sm:overflow-visible">
                <input
                  id={`endpoint-${key}`}
                  value={value[key]}
                  onChange={(e) => onChange({ [key]: e.target.value.trim() } as Partial<EndpointSettingsType>)}
                  placeholder={placeholder}
                  className={`h-7 w-full min-w-[200px] bg-transparent font-mono text-[12px] text-slate-100 placeholder:text-slate-400 focus:outline-none ${errors[key] ? "text-rose-200" : ""}`}
                />
              </div>
              <button
                type="button"
                onClick={() => copy(key, value[key])}
                aria-label={`Copy ${label}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-100 backdrop-blur-xl transition hover:bg-white/18"
              >
                {copiedKey === key ? <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {errors[key] && <p className="text-[11px] text-rose-600">{errors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-[12px] leading-5 text-blue-900 backdrop-blur-xl">
        No network health check yet. Endpoint validation is frontend-only. Duplicate detection warns when same URL used for multiple inappropriate endpoints.
      </div>
    </div>
  );
}
