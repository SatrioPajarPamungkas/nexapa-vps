import { useState, useMemo } from "react";
import { useDeveloperSettings } from "../hooks/useDeveloperSettings";
import { SecretField } from "./SecretField";
import { ConfigurationStatus } from "./ConfigurationStatus";
import { TIKTOK_ENVIRONMENTS, TIKTOK_POSTING_MODES } from "../settings.constants";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function TikTokDeveloperSettingsForm() {
  const {
    tiktokSettings,
    isLoading,
    isSaving,
    saveError,
    fieldErrors,
    updateSettings,
    saveSettings,
  } = useDeveloperSettings();

  const [saveSuccess, setSaveSuccess] = useState(false);

  const status: "not-configured" | "configured" | "has-errors" = useMemo(() => {
    if (fieldErrors.client_key || fieldErrors.client_secret) {
      return "has-errors";
    }
    if (tiktokSettings.client_key && tiktokSettings.client_secret) {
      return "configured";
    }
    return "not-configured";
  }, [tiktokSettings, fieldErrors]);

  const errors = useMemo(() => {
    const e: Record<string, string> = { ...fieldErrors };
    if (!tiktokSettings.client_key && !fieldErrors.client_key) {
      e.client_key = "Client Key required";
    }
    if (!tiktokSettings.client_secret && !fieldErrors.client_secret) {
      e.client_secret = "Client Secret required";
    }
    return e;
  }, [tiktokSettings, fieldErrors]);

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-3 text-sm text-slate-600">Loading TikTok settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-transparent">
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-3 text-[13px] text-emerald-800 backdrop-blur-xl" role="status">
          <CheckCircle2 className="h-5 w-5" />
          Settings saved successfully
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-800 backdrop-blur-xl" role="alert">
          <AlertCircle className="h-5 w-5" />
          {saveError}
        </div>
      )}

      <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-xl shadow-[0_18px_55px_rgba(2,6,23,0.18)] ring-1 ring-white/10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">TikTok Developer Settings</h3>
            <p className="mt-1 text-[12px] text-slate-600">
              Configure your TikTok API credentials. These values are encrypted at rest.
            </p>
          </div>
          <ConfigurationStatus status={status === "configured" ? "complete-locally" : status === "has-errors" ? "has-errors" : "not-configured"} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tt-client-key" className="block text-[12px] font-medium text-slate-800">
              Client Key
            </label>
            <input
              id="tt-client-key"
              value={tiktokSettings.client_key}
              onChange={(e) => updateSettings({ client_key: e.target.value.trim() })}
              onBlur={() => {}}
              placeholder="Client Key"
              autoComplete="off"
              className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono ${
                errors.client_key ? "border-rose-300/60" : "border-white/20"
              }`}
            />
            {errors.client_key && (
              <p className="mt-1 text-[11px] text-rose-600">{errors.client_key}</p>
            )}
          </div>

          <SecretField
            label="Client Secret"
            value={tiktokSettings.client_secret}
            onChange={(v) => updateSettings({ client_secret: v })}
            placeholder="Client Secret"
            description="Encrypted at rest, never logged"
            required
            error={errors.client_secret}
          />

          <div>
            <label htmlFor="tt-env" className="block text-[12px] font-medium text-slate-800">
              Environment
            </label>
            <select
              id="tt-env"
              value={tiktokSettings.environment}
              onChange={(e) => updateSettings({ environment: e.target.value as "sandbox" | "production" })}
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            >
              {TIKTOK_ENVIRONMENTS.map((env) => (
                <option key={env} value={env} className="bg-slate-900 text-white">
                  {env === "sandbox" ? "Sandbox" : "Production"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tt-mode" className="block text-[12px] font-medium text-slate-800">
              Content posting mode
            </label>
            <select
              id="tt-mode"
              value={tiktokSettings.content_posting_mode}
              onChange={(e) =>
                updateSettings({ content_posting_mode: e.target.value as "direct_post" | "upload_as_draft" | "both_when_authorized" })
              }
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            >
              {TIKTOK_POSTING_MODES.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {m === "direct_post" ? "Direct post" : m === "upload_as_draft" ? "Upload as draft" : "Both when authorized"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-[12px] leading-5 text-blue-900 backdrop-blur-xl">
        These credentials are used for TikTok OAuth authentication and API access. Only administrators can view or modify these settings.
      </div>
    </div>
  );
}
