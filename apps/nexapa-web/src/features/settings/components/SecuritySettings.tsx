import type { SecuritySettings as SecuritySettingsType } from "../settings.types";

type Props = {
  value: SecuritySettingsType;
  onChange: (patch: Partial<SecuritySettingsType>) => void;
};

export function SecuritySettings({ value, onChange }: Props) {
  return (
    <div className="space-y-6 bg-transparent">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Security</h3>
        <p className="mt-1 text-[12px] text-slate-600">
          Secret handling, session policy, and audit configuration. Values remain in memory only.
        </p>
      </div>

      <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-[12px] leading-5 text-amber-900 backdrop-blur-xl">
        <span className="font-medium">Important:</span> Masking is not encryption. Backend encrypted secret storage is not yet connected. No browser-side master key exists. Secrets are displayed in plaintext when revealed and must not be persisted in browser storage.
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">Secret storage requirement</h4>
        <div className="space-y-2 text-[12px] text-slate-700">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Encrypted backend secret storage is required before storing real credentials.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>All secret values in this workspace are stored in browser memory only and cleared on page refresh.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">3</span>
            <span>No secrets are transmitted, logged, or persisted until a secure backend is connected.</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">Session handling</h4>
        <div className="space-y-3">
          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Isolated account sessions</span>
              <span className="block text-[11px] text-slate-600">Each connected account uses an isolated session context.</span>
            </span>
            <input
              type="checkbox"
              checked={value.accountIsolatedSessions}
              onChange={(e) => onChange({ accountIsolatedSessions: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div>
            <label htmlFor="sec-expiration" className="block text-[12px] font-medium text-slate-800">
              Session expiration policy (days)
            </label>
            <input
              id="sec-expiration"
              type="number"
              min={1}
              max={365}
              value={value.expirationDays}
              onChange={(e) => onChange({ expirationDays: Number(e.target.value) })}
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Revoke after password change</span>
              <span className="block text-[11px] text-slate-600">Automatically revoke tokens when a connected account password changes.</span>
            </span>
            <input
              type="checkbox"
              checked={value.revokeAfterPasswordChange}
              onChange={(e) => onChange({ revokeAfterPasswordChange: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Disconnect confirmation</span>
              <span className="block text-[11px] text-slate-600">Require confirmation before disconnecting a platform account.</span>
            </span>
            <input
              type="checkbox"
              checked={value.disconnectConfirmation}
              onChange={(e) => onChange({ disconnectConfirmation: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">OAuth and authorization</h4>
        <div className="space-y-3">
          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">OAuth state validation</span>
              <span className="block text-[11px] text-slate-600">Validate OAuth state parameter to prevent CSRF attacks.</span>
            </span>
            <input
              type="checkbox"
              checked={value.stateValidation}
              onChange={(e) => onChange({ stateValidation: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">PKCE when supported</span>
              <span className="block text-[11px] text-slate-600">Use Proof Key for Code Exchange when the platform supports it.</span>
            </span>
            <input
              type="checkbox"
              checked={value.pkce}
              onChange={(e) => onChange({ pkce: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div>
            <label htmlFor="sec-allowlist" className="block text-[12px] font-medium text-slate-800">
              Redirect URI allowlist
            </label>
            <input
              id="sec-allowlist"
              value={value.redirectAllowlist}
              onChange={(e) => onChange({ redirectAllowlist: e.target.value.trim() })}
              placeholder="https://nexapa.app/*"
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
            <p className="mt-1 text-[11px] text-slate-600">Comma-separated patterns for allowed redirect URIs.</p>
          </div>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Token refresh handling</span>
              <span className="block text-[11px] text-slate-600">Automatically refresh expired access tokens when possible.</span>
            </span>
            <input
              type="checkbox"
              checked={value.tokenRefresh}
              onChange={(e) => onChange({ tokenRefresh: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Revocation handling</span>
              <span className="block text-[11px] text-slate-600">Handle token revocation from platforms when accounts are disconnected.</span>
            </span>
            <input
              type="checkbox"
              checked={value.revocationHandling}
              onChange={(e) => onChange({ revocationHandling: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">Audit and logging</h4>
        <div className="space-y-3">
          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Configuration change logging</span>
              <span className="block text-[11px] text-slate-600">Record when settings values are changed.</span>
            </span>
            <input
              type="checkbox"
              checked={value.recordConfigChanges}
              onChange={(e) => onChange({ recordConfigChanges: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Authentication event logging</span>
              <span className="block text-[11px] text-slate-600">Record OAuth and authorization events.</span>
            </span>
            <input
              type="checkbox"
              checked={value.recordAuthEvents}
              onChange={(e) => onChange({ recordAuthEvents: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Publishing attempt logging</span>
              <span className="block text-[11px] text-slate-600">Record publishing attempts and outcomes.</span>
            </span>
            <input
              type="checkbox"
              checked={value.recordPublishAttempts}
              onChange={(e) => onChange({ recordPublishAttempts: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Sensitive-value redaction in logs</span>
              <span className="block text-[11px] text-slate-600">Redact secrets and sensitive values from log output.</span>
            </span>
            <input
              type="checkbox"
              checked={value.redactLogs}
              onChange={(e) => onChange({ redactLogs: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">Credential display and clearing</h4>
        <div className="space-y-3">
          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Hide secrets by default</span>
              <span className="block text-[11px] text-slate-600">Display secret fields as masked by default in the UI.</span>
            </span>
            <input
              type="checkbox"
              checked={value.hideSensitiveDefault}
              onChange={(e) => onChange({ hideSensitiveDefault: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Confirmation before clearing credentials</span>
              <span className="block text-[11px] text-slate-600">Require confirmation before bulk-clearing credential values.</span>
            </span>
            <input
              type="checkbox"
              checked={value.confirmClearCredentials}
              onChange={(e) => onChange({ confirmClearCredentials: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div>
            <label htmlFor="sec-autoClear" className="block text-[12px] font-medium text-slate-800">
              Temporary secret inactivity clearing (minutes)
            </label>
            <input
              id="sec-autoClear"
              type="number"
              min={0}
              max={1440}
              value={value.autoClearSecretsMinutes}
              onChange={(e) => onChange({ autoClearSecretsMinutes: Number(e.target.value) })}
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
            <p className="mt-1 text-[11px] text-slate-600">
              Set to 0 to disable automatic clearing. When enabled, revealed secrets are hidden after the specified period of inactivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
