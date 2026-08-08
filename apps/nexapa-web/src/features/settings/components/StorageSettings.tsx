import type { StorageSettings as StorageSettingsType } from "../settings.types";
import { STORAGE_PROVIDERS } from "../settings.constants";
import { SecretField } from "./SecretField";
import { useMemo } from "react";

type Props = {
  value: StorageSettingsType;
  onChange: (patch: Partial<StorageSettingsType>) => void;
};

const PROVIDER_DESCRIPTIONS: Record<StorageSettingsType["provider"], string> = {
  "Not configured": "No storage provider selected. Media files will not be persisted remotely.",
  "S3 compatible": "Amazon S3 or any S3-compatible object storage service.",
  "Cloudflare R2": "Cloudflare R2 object storage with zero egress fees.",
  MinIO: "MinIO self-hosted object storage for development or on-premise deployments.",
  "Local server storage": "Files stored on the local server filesystem. Not recommended for production.",
};

export function StorageSettings({ value, onChange }: Props) {
  const isConfigured = value.provider !== "Not configured";
  const isLocal = value.provider === "Local server storage";

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (isConfigured && !isLocal && !value.endpoint.trim()) {
      e.endpoint = "Endpoint is required for selected provider.";
    }
    if (isConfigured && !value.bucket.trim()) {
      e.bucket = "Bucket name is required.";
    }
    return e;
  }, [value, isConfigured, isLocal]);

  return (
    <div className="space-y-6 bg-transparent">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Storage</h3>
        <p className="mt-1 text-[12px] text-slate-600">
          Configure media persistence provider. Values remain in memory only. No upload testing or credential validation is performed.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <label htmlFor="storage-provider" className="block text-[12px] font-medium text-slate-800">
          Storage provider
        </label>
        <select
          id="storage-provider"
          value={value.provider}
          onChange={(e) => onChange({ provider: e.target.value as StorageSettingsType["provider"] })}
          className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
        >
          {STORAGE_PROVIDERS.map((p) => (
            <option key={p} value={p} className="bg-slate-900 text-white">{p}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-600">{PROVIDER_DESCRIPTIONS[value.provider]}</p>
      </div>

      {isConfigured && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 backdrop-blur-xl">
            Configuration only — no upload test, no credential persistence, no connected claim.
          </div>

          {!isLocal && (
            <div>
              <label htmlFor="storage-endpoint" className="block text-[12px] font-medium text-slate-800">
                Endpoint
              </label>
              <input
                id="storage-endpoint"
                value={value.endpoint}
                onChange={(e) => onChange({ endpoint: e.target.value.trim() })}
                placeholder="https://s3.amazonaws.com"
                className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${errors.endpoint ? "border-rose-300/60" : "border-white/20"}`}
              />
              {errors.endpoint && <p className="mt-1 text-[11px] text-rose-600">{errors.endpoint}</p>}
            </div>
          )}

          {!isLocal && (
            <div>
              <label htmlFor="storage-region" className="block text-[12px] font-medium text-slate-800">
                Region (optional)
              </label>
              <input
                id="storage-region"
                value={value.region}
                onChange={(e) => onChange({ region: e.target.value.trim() })}
                placeholder="us-east-1"
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          )}

          <div>
            <label htmlFor="storage-bucket" className="block text-[12px] font-medium text-slate-800">
              Bucket
            </label>
            <input
              id="storage-bucket"
              value={value.bucket}
              onChange={(e) => onChange({ bucket: e.target.value.trim() })}
              placeholder="nexapa-media"
              className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${errors.bucket ? "border-rose-300/60" : "border-white/20"}`}
            />
            {errors.bucket && <p className="mt-1 text-[11px] text-rose-600">{errors.bucket}</p>}
          </div>

          {!isLocal && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="storage-accessKey" className="block text-[12px] font-medium text-slate-800">
                  Access key
                </label>
                <input
                  id="storage-accessKey"
                  value={value.accessKey}
                  onChange={(e) => onChange({ accessKey: e.target.value })}
                  placeholder="Access key ID"
                  className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <SecretField
                label="Secret key"
                value={value.secretKey}
                onChange={(v) => onChange({ secretKey: v })}
                placeholder="Secret access key"
                description="Never logged, never included in safe export."
                required={isConfigured && !isLocal}
              />
            </div>
          )}

          <div>
            <label htmlFor="storage-publicUrl" className="block text-[12px] font-medium text-slate-800">
              Public media URL (optional)
            </label>
            <input
              id="storage-publicUrl"
              value={value.publicUrl}
              onChange={(e) => onChange({ publicUrl: e.target.value.trim() })}
              placeholder="https://media.nexapa.app"
              className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
            <p className="mt-1 text-[11px] text-slate-600">Public-facing URL prefix for served media files.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="storage-uploadLimit" className="block text-[12px] font-medium text-slate-800">
                Upload size limit (MB)
              </label>
              <input
                id="storage-uploadLimit"
                type="number"
                min={1}
                max={5000}
                value={value.uploadLimitMb}
                onChange={(e) => onChange({ uploadLimitMb: Number(e.target.value) })}
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
            <div>
              <label htmlFor="storage-signedUrl" className="block text-[12px] font-medium text-slate-800">
                Signed URL duration (minutes)
              </label>
              <input
                id="storage-signedUrl"
                type="number"
                min={1}
                max={10080}
                value={value.signedUrlMinutes}
                onChange={(e) => onChange({ signedUrlMinutes: Number(e.target.value) })}
                className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          </div>
        </div>
      )}

      {!isConfigured && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-[12px] text-slate-600 backdrop-blur-xl">
          Select a storage provider to configure media persistence settings.
        </div>
      )}
    </div>
  );
}
