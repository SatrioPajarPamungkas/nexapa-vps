import type { YouTubeSettings } from "../settings.types";
import { YOUTUBE_ENVIRONMENTS, YOUTUBE_SCOPES } from "../settings.constants";
import { SecretField } from "./SecretField";
import { ConfigurationStatus } from "./ConfigurationStatus";
import { useMemo } from "react";
import { isValidHttpsUrl } from "../settings.utils";

type Props = {
  value: YouTubeSettings;
  onChange: (patch: Partial<YouTubeSettings>) => void;
  status: "not-configured" | "partial" | "complete-locally" | "backend-required" | "has-errors";
};

export function YouTubeIntegrationSettings({ value, onChange, status }: Props) {
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!value.clientId.trim()) e.clientId = "Client ID required";
    if (!value.clientSecret.trim()) e.clientSecret = "Client Secret required";
    if (!isValidHttpsUrl(value.redirectUri)) e.redirectUri = "Must be valid HTTPS";
    return e;
  }, [value]);

  return (
    <div className="space-y-6 bg-transparent">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[14px] font-semibold text-slate-900">YouTube Integration</h3>
        <ConfigurationStatus status={status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="yt-clientId" className="block text-[12px] font-medium text-slate-700">Google Client ID</label>
          <input
            id="yt-clientId"
            value={value.clientId}
            onChange={(e) => onChange({ clientId: e.target.value.trim() })}
            className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono ${errors.clientId ? "border-rose-300/60" : "border-white/20"}`}
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <SecretField label="Google Client Secret" value={value.clientSecret} onChange={(v) => onChange({ clientSecret: v })} required error={errors.clientSecret} />
        </div>
        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="yt-redirect" className="block text-[12px] font-medium text-slate-700">Redirect URI</label>
          <input
            id="yt-redirect"
            value={value.redirectUri}
            onChange={(e) => onChange({ redirectUri: e.target.value.trim() })}
            className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
          <p className="mt-1 text-[11px] text-slate-500">Default: https://nexapa.app/auth/youtube/callback</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="yt-project" className="block text-[12px] font-medium text-slate-700">Project ID (optional)</label>
          <input
            id="yt-project"
            value={value.projectId}
            onChange={(e) => onChange({ projectId: e.target.value.trim() })}
            className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="yt-env" className="block text-[12px] font-medium text-slate-700">Environment</label>
          <select
            id="yt-env"
            value={value.environment}
            onChange={(e) => onChange({ environment: e.target.value as YouTubeSettings["environment"] })}
            className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          >
            {YOUTUBE_ENVIRONMENTS.map((env) => (
              <option key={env} value={env} className="bg-slate-900 text-white">
                {env}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <p className="text-[12px] font-medium text-slate-900">Requested scopes</p>
        <p className="mt-1 text-[11px] text-slate-600">Use configurable constants – no hardcoded ad-hoc scopes.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {YOUTUBE_SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-700 backdrop-blur-xl">
              <input type="checkbox" checked={value.scopes.includes(scope)} onChange={(e) => { const next = e.target.checked ? [...value.scopes, scope] : value.scopes.filter((x) => x !== scope); onChange({ scopes: next }); }} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{" "}
              <span className="truncate font-mono text-slate-800">{scope}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-[12px] leading-5 text-blue-900 backdrop-blur-xl">
        <p>OAuth consent screen required. Test users may be required while in testing. Video upload authorization required. Final quota and scope access depend on Google configuration. Do not claim quota availability. No OAuth performed here.</p>
      </div>
    </div>
  );
}
