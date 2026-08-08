import type { EnvironmentSettings as EnvironmentSettingsType, AppEnvironmentMode } from "../settings.types";
import { APP_ENVIRONMENTS } from "../settings.constants";
import { getFrontendDetection } from "../settings.utils";
import { useMemo } from "react";

type Props = {
  value: EnvironmentSettingsType;
  onChange: (patch: Partial<EnvironmentSettingsType>) => void;
};

export function EnvironmentSettings({ value, onChange }: Props) {
  const detection = useMemo(() => getFrontendDetection(), []);

  const modeDescriptions: Record<AppEnvironmentMode, string> = {
    Development: "Local development mode. Demo data allowed. Debug UI enabled.",
    Staging: "Pre-production staging environment. Demo data disabled by default.",
    Production: "Live production environment. Demo data disabled by default. Debug UI off.",
  };

  return (
    <div className="space-y-6 bg-transparent">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Environment</h3>
        <p className="mt-1 text-[12px] text-slate-600">
          Application mode and frontend environment detection. Changing environment does not contact a server.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <label htmlFor="env-mode" className="block text-[12px] font-medium text-slate-800">
          Environment mode
        </label>
        <select
          id="env-mode"
          value={value.mode}
          onChange={(e) => onChange({ mode: e.target.value as AppEnvironmentMode })}
          className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
        >
          {APP_ENVIRONMENTS.map((m) => (
            <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-600">{modeDescriptions[value.mode]}</p>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">Application URLs</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="env-webUrl" className="block text-[12px] font-medium text-slate-800">
              Nexapa Web URL
            </label>
            <input
              id="env-webUrl"
              value={value.webUrl}
              onChange={(e) => onChange({ webUrl: e.target.value.trim() })}
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
          <div>
            <label htmlFor="env-apiUrl" className="block text-[12px] font-medium text-slate-800">
              Nexapa API URL
            </label>
            <input
              id="env-apiUrl"
              value={value.apiUrl}
              onChange={(e) => onChange({ apiUrl: e.target.value.trim() })}
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
          <div>
            <label htmlFor="env-mediaUrl" className="block text-[12px] font-medium text-slate-800">
              Media URL
            </label>
            <input
              id="env-mediaUrl"
              value={value.mediaUrl}
              onChange={(e) => onChange({ mediaUrl: e.target.value.trim() })}
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
          <div>
            <label htmlFor="env-label" className="block text-[12px] font-medium text-slate-800">
              Environment label
            </label>
            <input
              id="env-label"
              value={value.label}
              onChange={(e) => onChange({ label: e.target.value.trim() })}
              placeholder="local"
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">Feature toggles</h4>
        <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
          <span>
            <span className="block text-[12px] font-medium text-slate-800">Debug UI</span>
            <span className="block text-[11px] text-slate-600">Show development debugging tools in the interface.</span>
          </span>
          <input
            type="checkbox"
            checked={value.debugUi}
            onChange={(e) => onChange({ debugUi: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
          <span>
            <span className="block text-[12px] font-medium text-slate-800">Demo data toggle</span>
            <span className="block text-[11px] text-slate-600">Allow demo/placeholder data in the workspace.</span>
          </span>
          <input
            type="checkbox"
            checked={value.demoToggle}
            onChange={(e) => onChange({ demoToggle: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        {value.mode === "Production" && value.demoToggle && (
          <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 backdrop-blur-xl">
            Demo data is not recommended in production. Consider disabling the demo data toggle.
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">Detected values</h4>
        <p className="text-[11px] text-slate-600">Read-only values detected from the current browser environment. These are safe, non-sensitive values only.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-600">Hostname</span>
            <span className="block mt-0.5 text-[13px] font-mono text-slate-800">{detection.hostname}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-600">Protocol</span>
            <span className="block mt-0.5 text-[13px] font-mono text-slate-800">{detection.protocol}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-600">Browser timezone</span>
            <span className="block mt-0.5 text-[13px] font-mono text-slate-800">{detection.timezone}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-600">Configured API base</span>
            <span className="block mt-0.5 text-[13px] font-mono text-slate-800">{detection.apiBase || "Not configured"}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-600">Vite build mode</span>
            <span className="block mt-0.5 text-[13px] font-mono text-slate-800">{detection.buildMode}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-[12px] leading-5 text-blue-900 backdrop-blur-xl">
        Changing environment mode does not contact a server. The raw <code className="rounded bg-blue-500/15 px-1 text-[11px]">import.meta.env</code> object is not displayed here — only safe, detected values are shown. Private environment values are never exposed.
      </div>
    </div>
  );
}
