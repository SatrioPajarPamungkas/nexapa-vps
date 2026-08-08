import type { ShopeeSettings } from "../settings.types";
import { SHOPEE_ENVIRONMENTS, SHOPEE_DIRECTIONS } from "../settings.constants";
import { SecretField } from "./SecretField";
import { ConfigurationStatus } from "./ConfigurationStatus";
import { useMemo } from "react";
import { isValidHttpsUrl } from "../settings.utils";

type Props = {
  value: ShopeeSettings;
  onChange: (patch: Partial<ShopeeSettings>) => void;
  status: "not-configured" | "partial" | "complete-locally" | "backend-required" | "has-errors";
};

export function ShopeeIntegrationSettings({ value, onChange, status }: Props) {
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!value.partnerId.trim()) e.partnerId = "Partner ID required";
    if (!value.partnerKey.trim()) e.partnerKey = "Partner Key required";
    if (!isValidHttpsUrl(value.redirectUrl)) e.redirectUrl = "Must be valid HTTPS";
    return e;
  }, [value]);

  return (
    <div className="space-y-6 bg-transparent">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[14px] font-semibold text-slate-900">Shopee Integration</h3>
        <ConfigurationStatus status={status} />
      </div>
      <p className="text-[12px] text-slate-600">Shopee is not a direct publishing destination – affiliate and commerce workflow only. Do not claim official API approval.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="shopee-partnerId" className="block text-[12px] font-medium text-slate-700">Partner ID</label>
          <input
            id="shopee-partnerId"
            value={value.partnerId}
            onChange={(e) => onChange({ partnerId: e.target.value.trim() })}
            className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono ${errors.partnerId ? "border-rose-300/60" : "border-white/20"}`}
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <SecretField label="Partner Key" value={value.partnerKey} onChange={(v) => onChange({ partnerKey: v })} required error={errors.partnerKey} />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="shopee-shopId" className="block text-[12px] font-medium text-slate-700">Shop ID (optional)</label>
          <input id="shopee-shopId" value={value.shopId} onChange={(e) => onChange({ shopId: e.target.value.trim() })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="shopee-env" className="block text-[12px] font-medium text-slate-700">Environment</label>
          <select
            id="shopee-env"
            value={value.environment}
            onChange={(e) => onChange({ environment: e.target.value as ShopeeSettings["environment"] })}
            className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          >
            {SHOPEE_ENVIRONMENTS.map((env) => (
              <option key={env} value={env} className="bg-slate-900 text-white">
                {env}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="shopee-redirect" className="block text-[12px] font-medium text-slate-700">Redirect / callback URL</label>
          <div className="mt-1.5 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur-xl">
            <code className="block whitespace-nowrap font-mono text-[12px] text-slate-100">{value.redirectUrl || "https://..."}</code>
          </div>
          <input
            id="shopee-redirect"
            value={value.redirectUrl}
            onChange={(e) => onChange({ redirectUrl: e.target.value.trim() })}
            className="mt-2 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="shopee-webhook" className="block text-[12px] font-medium text-slate-700">Webhook URL</label>
          <input
            id="shopee-webhook"
            value={value.webhookUrl}
            onChange={(e) => onChange({ webhookUrl: e.target.value.trim() })}
            className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <label htmlFor="shopee-direction" className="block text-[12px] font-medium text-slate-700">Integration direction</label>
          <select
            id="shopee-direction"
            value={value.direction}
            onChange={(e) => onChange({ direction: e.target.value as ShopeeSettings["direction"] })}
            className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          >
            {SHOPEE_DIRECTIONS.map((d) => (
              <option key={d} value={d} className="bg-slate-900 text-white">
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-[12px] leading-5 text-amber-900 backdrop-blur-xl">
        Do not treat Shopee as a social Publisher destination. Affiliate workflow, product link management, and commerce synchronization are the intended integration directions. Official approval status depends on Shopee.
      </div>
    </div>
  );
}
