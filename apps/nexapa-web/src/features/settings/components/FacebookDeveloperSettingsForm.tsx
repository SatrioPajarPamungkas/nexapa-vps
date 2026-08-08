import { useState, useMemo } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { SecretField } from "./SecretField";
import { ConfigurationStatus } from "./ConfigurationStatus";

type FacebookSettings = {
  app_id: string;
  app_secret: string;
  has_stored_secret: boolean;
  configuration_id: string | null;
  graph_api_version: string;
  callback_url: string;
};

type FieldErrors = Record<string, string>;

type Props = {
  value: FacebookSettings;
  onChange: (patch: Partial<FacebookSettings>) => void;
  onSave: (payload: any) => Promise<boolean>;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  fieldErrors: FieldErrors;
};

export function FacebookDeveloperSettingsForm({
  value,
  onChange,
  onSave,
  isLoading,
  isSaving,
  saveError,
  fieldErrors,
}: Props) {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const status: "not-configured" | "configured" | "has-errors" = useMemo(() => {
    if (fieldErrors.app_id || fieldErrors.graph_api_version) {
      return "has-errors";
    }
    if (value.app_id && (value.app_secret || value.has_stored_secret)) {
      return "configured";
    }
    return "not-configured";
  }, [value, fieldErrors]);

  const errors = useMemo(() => {
    const e: FieldErrors = { ...fieldErrors };
    if (!value.app_id && !fieldErrors.app_id) {
      e.app_id = "App ID required";
    }
    if (!value.graph_api_version && !fieldErrors.graph_api_version) {
      e.graph_api_version = "Graph API Version required";
    }
    return e;
  }, [value, fieldErrors]);

  const handleSave = async () => {
    const payload = {
      app_id: value.app_id,
      app_secret: value.app_secret,
      configuration_id: value.configuration_id || null,
      graph_api_version: value.graph_api_version,
      has_stored_secret: value.has_stored_secret,
    };
    const success = await onSave(payload);
    if (success) {
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-3 text-sm text-slate-600">Loading Facebook settings...</span>
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
            <h3 className="text-[14px] font-semibold text-slate-900">Facebook Developer Settings</h3>
            <p className="mt-1 text-[12px] text-slate-600">
              Configure your Facebook App credentials for Login for Business and Graph API access.
            </p>
          </div>
          <ConfigurationStatus status={status === "configured" ? "complete-locally" : status === "has-errors" ? "has-errors" : "not-configured"} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fb-app-id" className="block text-[12px] font-medium text-slate-800">
              Facebook App ID
            </label>
            <input
              id="fb-app-id"
              value={value.app_id}
              onChange={(e) => onChange({ app_id: e.target.value.trim() })}
              onBlur={() => {}}
              placeholder="Facebook App ID"
              autoComplete="off"
              className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono ${
                errors.app_id ? "border-rose-300/60" : "border-white/20"
              }`}
            />
            {errors.app_id && (
              <p className="mt-1 text-[11px] text-rose-600">{errors.app_id}</p>
            )}
          </div>

          <SecretField
            label="Facebook App Secret"
            value={value.app_secret}
            onChange={(v) => onChange({ app_secret: v })}
            placeholder="Facebook App Secret"
            description="Encrypted at rest, never logged"
            required={!value.has_stored_secret}
            error={errors.app_secret}
          />

          <div>
            <label htmlFor="fb-config-id" className="block text-[12px] font-medium text-slate-800">
              Login for Business Configuration ID (optional)
            </label>
            <input
              id="fb-config-id"
              value={value.configuration_id || ""}
              onChange={(e) => onChange({ configuration_id: e.target.value.trim() })}
              onBlur={() => {}}
              placeholder="Configuration ID for app review"
              autoComplete="off"
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-600">
              Used during app review. Leave empty if not required.
            </p>
          </div>

          <div>
            <label htmlFor="fb-api-version" className="block text-[12px] font-medium text-slate-800">
              Graph API Version
            </label>
            <input
              id="fb-api-version"
              value={value.graph_api_version}
              onChange={(e) => onChange({ graph_api_version: e.target.value.trim() })}
              onBlur={() => {}}
              placeholder="v21.0"
              autoComplete="off"
              className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono ${
                errors.graph_api_version ? "border-rose-300/60" : "border-white/20"
              }`}
            />
            {errors.graph_api_version && (
              <p className="mt-1 text-[11px] text-rose-600">{errors.graph_api_version}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-600">
              Format: v followed by version number (e.g., v21.0)
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="fb-callback-url" className="block text-[12px] font-medium text-slate-800">
              OAuth Callback URL
            </label>
            <div className="mt-1.5 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur-xl">
              <code className="block whitespace-nowrap font-mono text-[12px] text-slate-100">{value.callback_url}</code>
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              Add this URL to your Facebook App's OAuth redirect URIs
            </p>
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
        These credentials are used for Facebook Login for Business and Graph API access. Only administrators can view or modify these settings.
        The App Secret is encrypted at rest and never exposed after saving.
      </div>
    </div>
  );
}
