import type { ProxySettings as ProxySettingsType } from "../settings.types";
import { PROXY_MODES, PROXY_PROTOCOLS, PROXY_ROTATIONS } from "../settings.constants";
import { SecretField } from "./SecretField";

type Props = {
  value: ProxySettingsType;
  onChange: (patch: Partial<ProxySettingsType>) => void;
};

export function ProxySettings({ value, onChange }: Props) {
  const isEnabled = value.mode !== "Disabled";

  return (
    <div className="space-y-6 bg-transparent">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Proxy</h3>
        <p className="mt-1 text-[12px] text-slate-600">
          Optional proxy routing configuration. Values remain in memory only. No connection test is performed.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <label htmlFor="proxy-mode" className="block text-[12px] font-medium text-slate-800">
          Proxy mode
        </label>
        <select
          id="proxy-mode"
          value={value.mode}
          onChange={(e) => onChange({ mode: e.target.value as ProxySettingsType["mode"] })}
          className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
        >
          {PROXY_MODES.map((m) => (
            <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-600">
          {value.mode === "Disabled" && "Proxy routing is disabled. All requests go direct."}
          {value.mode === "Global proxy" && "All outgoing requests use a single proxy configuration."}
          {value.mode === "Per-platform proxy pool" && "Each platform integration uses a separate proxy pool."}
          {value.mode === "Per-account proxy assignment" && "Each connected account is assigned an individual proxy."}
        </p>
      </div>

      {isEnabled && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 backdrop-blur-xl">
            Configuration only — no connection test, no credential export.
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="proxy-protocol" className="block text-[12px] font-medium text-slate-800">
                Protocol
              </label>
              <select
                id="proxy-protocol"
                value={value.protocol}
                onChange={(e) => onChange({ protocol: e.target.value as ProxySettingsType["protocol"] })}
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                {PROXY_PROTOCOLS.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white">{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="proxy-host" className="block text-[12px] font-medium text-slate-800">
                Host
              </label>
              <input
                id="proxy-host"
                value={value.host}
                onChange={(e) => onChange({ host: e.target.value.trim() })}
                placeholder="proxy.example.com"
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
            <div>
              <label htmlFor="proxy-port" className="block text-[12px] font-medium text-slate-800">
                Port
              </label>
              <input
                id="proxy-port"
                value={value.port}
                onChange={(e) => onChange({ port: e.target.value.trim() })}
                placeholder="8080"
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="proxy-username" className="block text-[12px] font-medium text-slate-800">
                Username (optional)
              </label>
              <input
                id="proxy-username"
                value={value.username}
                onChange={(e) => onChange({ username: e.target.value })}
                placeholder="proxy user"
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
            <SecretField
              label="Password"
              value={value.password}
              onChange={(v) => onChange({ password: v })}
              placeholder="Proxy password"
              description="Never logged, never included in safe export."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="proxy-rotation" className="block text-[12px] font-medium text-slate-800">
                Rotation mode
              </label>
              <select
                id="proxy-rotation"
                value={value.rotation}
                onChange={(e) => onChange({ rotation: e.target.value as ProxySettingsType["rotation"] })}
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                {PROXY_ROTATIONS.map((r) => (
                  <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="proxy-region" className="block text-[12px] font-medium text-slate-800">
                Region label (optional)
              </label>
              <input
                id="proxy-region"
                value={value.regionLabel}
                onChange={(e) => onChange({ regionLabel: e.target.value.trim() })}
                placeholder="us-east"
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="proxy-notes" className="block text-[12px] font-medium text-slate-800">
              Notes (optional)
            </label>
            <textarea
              id="proxy-notes"
              value={value.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              placeholder="Additional notes about proxy configuration"
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/12 px-3 py-2 text-[13px] leading-5 text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
        </div>
      )}

      {!isEnabled && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-[12px] text-slate-600 backdrop-blur-xl">
          Proxy is disabled. Enable a proxy mode to configure routing settings.
        </div>
      )}
    </div>
  );
}
