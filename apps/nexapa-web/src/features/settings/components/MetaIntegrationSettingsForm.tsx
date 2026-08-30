import { useState, useMemo, useCallback, useEffect } from "react";
import { AlertCircle, Copy, CopyCheck } from "lucide-react";
import type { FacebookSettings } from "@/lib/api/developer-settings";
import { META_ENVIRONMENTS, META_PRODUCTS, META_PERMISSIONS } from "../settings.constants";
import { ConfigurationStatus } from "./ConfigurationStatus";

type Props = {
  settings: FacebookSettings;
  status: "not-configured" | "partial" | "complete-locally" | "backend-required" | "has-errors";
  onSave: (payload: any) => Promise<boolean>;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  fieldErrors: Record<string, string>;
  hasStoredSecret: boolean;
  onUpdate: (patch: Partial<FacebookSettings>) => void;
  onRefetch: () => void;
};

const DEFAULT_CALLBACK_URL = "https://api.nexapa.app/api/v1/oauth/facebook/callback";

export function MetaIntegrationSettingsForm({
  settings,
  status,
  onSave,
  isLoading,
  isSaving,
  saveError,
  fieldErrors,
  hasStoredSecret,
  onRefetch,
}: Props) {
  const [localValues, setLocalValues] = useState<Partial<FacebookSettings>>({
    app_id: settings.app_id,
    app_secret: "",
    webhook_url: settings.webhook_url,
    webhook_verify_token: "",
    environment: settings.environment,
    graph_api_version: settings.graph_api_version,
    configuration_id: settings.configuration_id,
    planned_products: settings.planned_products,
    requested_permissions: settings.requested_permissions,
  });

  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);

  const callbackUrl = settings.callback_url || DEFAULT_CALLBACK_URL;

  useEffect(() => {
    if (!touched && settings.app_id) {
      setLocalValues({
        app_id: settings.app_id || "",
        app_secret: "",
        webhook_url: settings.webhook_url || "",
        webhook_verify_token: "",
        environment: settings.environment || "Development",
        graph_api_version: settings.graph_api_version || "v21.0",
        configuration_id: settings.configuration_id ?? null,
        planned_products: settings.planned_products || [],
        requested_permissions: settings.requested_permissions || [],
      });
    }
  }, [settings, touched]);

  const isDirty = useMemo(() => {
    return (
      localValues.app_id !== settings.app_id ||
      localValues.app_secret !== "" ||
      localValues.webhook_url !== settings.webhook_url ||
      localValues.webhook_verify_token !== "" ||
      localValues.environment !== settings.environment ||
      localValues.graph_api_version !== settings.graph_api_version ||
      localValues.configuration_id !== settings.configuration_id ||
      JSON.stringify(localValues.planned_products) !== JSON.stringify(settings.planned_products) ||
      JSON.stringify(localValues.requested_permissions) !== JSON.stringify(settings.requested_permissions)
    );
  }, [localValues, settings]);

  const errors = useMemo(() => {
    const e: Record<string, string> = { ...fieldErrors };
    if (!localValues.app_id?.trim() && !e.app_id) {
      e.app_id = "App ID required";
    }
    if (localValues.app_id && !/^[a-zA-Z0-9_-]+$/.test(localValues.app_id)) {
      e.app_id = "Invalid App ID format";
    }
    if (localValues.graph_api_version && !/^v\d+\.\d+$/.test(localValues.graph_api_version)) {
      e.graph_api_version = "Graph API Version must be in format v21.0";
    }
    if (localValues.app_secret && localValues.app_secret.trim() === "") {
      e.app_secret = "App Secret cannot be only whitespace";
    }
    if (localValues.webhook_verify_token && localValues.webhook_verify_token.trim() === "") {
      e.webhook_verify_token = "Verify Token cannot be only whitespace";
    }
    return e;
  }, [localValues, fieldErrors]);

  const configStatus: "not-configured" | "configured" | "has-errors" = useMemo(() => {
    if (errors.app_id || errors.app_secret) {
      return "has-errors";
    }
    if (settings.app_id && (settings.app_secret || hasStoredSecret)) {
      return "configured";
    }
    return "not-configured";
  }, [settings, hasStoredSecret, errors]);

  const handleSave = useCallback(async () => {
    const payload = {
      app_id: localValues.app_id?.trim() || "",
      app_secret: localValues.app_secret?.trim() !== "" ? localValues.app_secret : undefined,
      has_stored_secret: hasStoredSecret && localValues.app_secret === "",
      graph_api_version: localValues.graph_api_version || "v21.0",
      configuration_id: localValues.configuration_id,
      webhook_url: localValues.webhook_url,
      webhook_verify_token: localValues.webhook_verify_token?.trim() !== "" ? localValues.webhook_verify_token : undefined,
      environment: localValues.environment,
      planned_products: localValues.planned_products,
      requested_permissions: localValues.requested_permissions,
    };

    const success = await onSave(payload);
    if (success) {
      setTouched(false);
      setLocalValues((prev) => ({
        ...prev,
        app_secret: "",
        webhook_verify_token: "",
      }));
      onRefetch();
    }
  }, [localValues, hasStoredSecret, onSave, onRefetch]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [callbackUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="ml-3 text-sm text-slate-600">Loading Meta settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-transparent">
      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-800 backdrop-blur-xl" role="alert">
          <AlertCircle className="h-5 w-5" />
          {saveError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900">Meta (Facebook &amp; Instagram)</h3>
          <p className="mt-1 text-[12px] text-slate-600">Configure Meta credentials for Facebook Login and Instagram Graph API.</p>
        </div>
        <ConfigurationStatus status={configStatus === "configured" ? "complete-locally" : configStatus === "has-errors" ? "has-errors" : status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="meta-app-id" className="block text-[12px] font-medium text-slate-700">Meta App ID</label>
          <input
            id="meta-app-id"
            type="text"
            value={localValues.app_id || ""}
            onChange={(e) => {
              setTouched(true);
              setLocalValues((prev) => ({ ...prev, app_id: e.target.value }));
            }}
            className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono ${
              errors.app_id ? "border-rose-300/60" : "border-white/20"
            }`}
          />
          {errors.app_id && <p className="mt-1 text-[11px] text-rose-600">{errors.app_id}</p>}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="meta-app-secret" className="block text-[12px] font-medium text-slate-700">Meta App Secret</label>
          <div className="relative mt-1.5">
            <input
              id="meta-app-secret"
              type="password"
              value={localValues.app_secret || ""}
              onChange={(e) => {
                setTouched(true);
                setLocalValues((prev) => ({ ...prev, app_secret: e.target.value }));
              }}
              placeholder={hasStoredSecret ? "Leave blank to keep existing secret" : "Meta App Secret"}
              autoComplete="off"
              className={`h-9 w-full rounded-xl border bg-white/12 px-3 pr-10 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${
                errors.app_secret ? "border-rose-300/60" : "border-white/20"
              }`}
            />
            {localValues.app_secret && (
              <button
                type="button"
                onClick={() => {
                  setTouched(true);
                  setLocalValues((prev) => ({ ...prev, app_secret: "" }));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-500 backdrop-blur-xl hover:bg-white/18"
                aria-label="Clear App Secret"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {hasStoredSecret && !localValues.app_secret && (
            <p className="mt-1 text-[11px] text-emerald-700">App Secret already configured. Leave blank to keep the current secret.</p>
          )}
          {errors.app_secret && <p className="mt-1 text-[11px] text-rose-600">{errors.app_secret}</p>}
          {!hasStoredSecret && <p className="mt-1 text-[11px] text-slate-500">Encrypted at rest, never logged</p>}
        </div>

        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="meta-callback-url" className="block text-[12px] font-medium text-slate-700">OAuth Callback URL</label>
          <div className="relative mt-1.5 flex gap-2">
            <div className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur-xl">
              <code className="block whitespace-nowrap font-mono text-[12px] text-slate-100">{callbackUrl}</code>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-100 backdrop-blur-xl hover:bg-white/18"
              aria-label="Copy Callback URL"
            >
              {copied ? <CopyCheck className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Add this URL to your Meta App's OAuth redirect URIs</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="meta-webhook-url" className="block text-[12px] font-medium text-slate-700">Webhook URL</label>
          <input
            id="meta-webhook-url"
            type="text"
            value={localValues.webhook_url || ""}
            onChange={(e) => {
              setTouched(true);
              setLocalValues((prev) => ({ ...prev, webhook_url: e.target.value }));
            }}
            className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 backdrop-blur-xl placeholder:text-slate-600 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="meta-verify-token" className="block text-[12px] font-medium text-slate-700">Webhook Verify Token</label>
          <div className="relative mt-1.5">
            <input
              id="meta-verify-token"
              type="password"
              value={localValues.webhook_verify_token || ""}
              onChange={(e) => {
                setTouched(true);
                setLocalValues((prev) => ({ ...prev, webhook_verify_token: e.target.value }));
              }}
              placeholder="Secret token for webhook verification"
              autoComplete="off"
              className="h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 pr-10 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
            {localValues.webhook_verify_token && (
              <button
                type="button"
                onClick={() => {
                  setTouched(true);
                  setLocalValues((prev) => ({ ...prev, webhook_verify_token: "" }));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-500 backdrop-blur-xl hover:bg-white/18"
                aria-label="Clear Verify Token"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {errors.webhook_verify_token && <p className="mt-1 text-[11px] text-rose-600">{errors.webhook_verify_token}</p>}
          <p className="mt-1 text-[11px] text-slate-500">Sensitive value not displayed after saving</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="meta-environment" className="block text-[12px] font-medium text-slate-700">Environment</label>
          <select
            id="meta-environment"
            value={localValues.environment || "Development"}
            onChange={(e) => {
              setTouched(true);
              setLocalValues((prev) => ({ ...prev, environment: e.target.value }));
            }}
            className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          >
            {META_ENVIRONMENTS.map((env) => (
              <option key={env} value={env} className="bg-slate-900 text-white">
                {env}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <p className="text-[12px] font-medium text-slate-900">Planned products</p>
          <div className="mt-2 space-y-2">
            {META_PRODUCTS.map((p) => (
              <label key={p} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-700 backdrop-blur-xl">
                <input
                  type="checkbox"
                  checked={(localValues.planned_products || []).includes(p)}
                  onChange={(e) => {
                    setTouched(true);
                    const next = e.target.checked
                      ? [...(localValues.planned_products || []), p]
                      : (localValues.planned_products || []).filter((x) => x !== p);
                    setLocalValues((prev) => ({ ...prev, planned_products: next }));
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                {p}
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <p className="text-[12px] font-medium text-slate-900">Requested permissions</p>
          <div className="mt-2 space-y-2">
            {META_PERMISSIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 text-[12px] text-slate-700">
                <input
                  type="checkbox"
                  checked={(localValues.requested_permissions || []).includes(perm)}
                  onChange={(e) => {
                    setTouched(true);
                    const next = e.target.checked
                      ? [...(localValues.requested_permissions || []), perm]
                      : (localValues.requested_permissions || []).filter((x) => x !== perm);
                    setLocalValues((prev) => ({ ...prev, requested_permissions: next }));
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                {perm}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Do not claim permissions are approved.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isSaving ? "Saving..." : "Save Meta Settings"}
        </button>
      </div>

      <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-[12px] leading-5 text-blue-900 backdrop-blur-xl">
        <p>Facebook Page publishing requires Page authorization. Instagram publishing requires a supported professional account. Final permission availability depends on Meta review and authorization.</p>
      </div>
    </div>
  );
}
