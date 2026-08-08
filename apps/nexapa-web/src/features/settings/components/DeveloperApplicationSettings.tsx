import type { DeveloperSettings } from "../settings.types";
import { APP_CATEGORIES, APP_TYPES, MAX_LENGTHS } from "../settings.constants";
import { isValidHttpsUrl, isValidEmail, isValidUrl } from "../settings.utils";
import { useMemo, useState } from "react";

type Props = {
  value: DeveloperSettings;
  onChange: (patch: Partial<DeveloperSettings>) => void;
};

export function DeveloperApplicationSettings({ value, onChange }: Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!value.productName.trim()) e.productName = "Product name required";
    if (!isValidHttpsUrl(value.primaryWebsite)) e.primaryWebsite = "Must be valid HTTPS";
    if (!isValidHttpsUrl(value.appUrl)) e.appUrl = "Must be valid HTTPS";
    if (!isValidHttpsUrl(value.privacyUrl)) e.privacyUrl = "Must be valid HTTPS";
    if (!isValidHttpsUrl(value.termsUrl)) e.termsUrl = "Must be valid HTTPS";
    if (value.supportUrl && !isValidUrl(value.supportUrl)) e.supportUrl = "Must be valid URL";
    if (value.supportEmail && !isValidEmail(value.supportEmail)) e.supportEmail = "Invalid email format";
    if (!value.description.trim()) e.description = "Description required";
    if (value.demoVideoUrl && !isValidUrl(value.demoVideoUrl)) e.demoVideoUrl = "Must be valid URL";
    return e;
  }, [value]);

  const checklistItems: Array<{ key: keyof typeof value.checklist; label: string }> = [
    { key: "nameFinalized", label: "application name finalized" },
    { key: "websiteAvailable", label: "website available" },
    { key: "privacyAvailable", label: "privacy policy available" },
    { key: "termsAvailable", label: "terms of service available" },
    { key: "descriptionPrepared", label: "application description prepared" },
    { key: "testAccountPrepared", label: "test account prepared" },
    { key: "demoVideoPrepared", label: "demo video prepared" },
    { key: "redirectConfigured", label: "redirect URI configured" },
    { key: "scopesDocumented", label: "scopes documented" },
    { key: "reviewerInstructionsPrepared", label: "reviewer instructions prepared" },
  ];

  return (
    <div className="space-y-6 bg-transparent">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Developer application identity</h3>
        <p className="mt-1 text-[12px] text-slate-600">Useful for platform submissions. Values are configuration values that must be verified before submission. No fake approval badge.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dev-product" className="block text-[12px] font-medium text-slate-800">Product name</label>
            <input id="dev-product" value={value.productName} maxLength={MAX_LENGTHS.title} onChange={(e) => onChange({ productName: e.target.value })} onBlur={() => setTouched((t) => ({ ...t, productName: true }))} className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono ${touched.productName && errors.productName ? "border-rose-300/60" : "border-white/20"}`} />
            <p className="mt-1 text-[11px] text-slate-600">{value.productName.length}/{MAX_LENGTHS.title}</p>
          </div>
          <div>
            <label htmlFor="dev-company" className="block text-[12px] font-medium text-slate-800">Company or developer name (optional)</label>
            <input id="dev-company" value={value.companyName} maxLength={MAX_LENGTHS.company} onChange={(e) => onChange({ companyName: e.target.value })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div>
            <label htmlFor="dev-category" className="block text-[12px] font-medium text-slate-800">Application category</label>
            <select id="dev-category" value={value.category} onChange={(e) => onChange({ category: e.target.value as DeveloperSettings["category"] })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20">
              {APP_CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dev-type" className="block text-[12px] font-medium text-slate-800">Application type</label>
            <select id="dev-type" value={value.appType} onChange={(e) => onChange({ appType: e.target.value as DeveloperSettings["appType"] })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20">
              {APP_TYPES.map((t) => <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-[14px] font-semibold text-slate-900">Public URLs</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dev-primary" className="block text-[12px] font-medium text-slate-800">Primary website URL</label>
            <input id="dev-primary" value={value.primaryWebsite} onChange={(e) => onChange({ primaryWebsite: e.target.value.trim() })} onBlur={() => setTouched((t) => ({ ...t, primaryWebsite: true }))} className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${touched.primaryWebsite && errors.primaryWebsite ? "border-rose-300/60" : "border-white/20"}`} />
          </div>
          <div>
            <label htmlFor="dev-appUrl" className="block text-[12px] font-medium text-slate-800">Application URL</label>
            <input id="dev-appUrl" value={value.appUrl} onChange={(e) => onChange({ appUrl: e.target.value.trim() })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div>
            <label htmlFor="dev-privacy" className="block text-[12px] font-medium text-slate-800">Privacy Policy URL</label>
            <input id="dev-privacy" value={value.privacyUrl} onChange={(e) => onChange({ privacyUrl: e.target.value.trim() })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div>
            <label htmlFor="dev-terms" className="block text-[12px] font-medium text-slate-800">Terms of Service URL</label>
            <input id="dev-terms" value={value.termsUrl} onChange={(e) => onChange({ termsUrl: e.target.value.trim() })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div>
            <label htmlFor="dev-supportUrl" className="block text-[12px] font-medium text-slate-800">Support URL</label>
            <input id="dev-supportUrl" value={value.supportUrl} onChange={(e) => onChange({ supportUrl: e.target.value.trim() })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div>
            <label htmlFor="dev-supportEmail" className="block text-[12px] font-medium text-slate-800">Support email (optional)</label>
            <input id="dev-supportEmail" value={value.supportEmail} onChange={(e) => onChange({ supportEmail: e.target.value.trim() })} onBlur={() => setTouched((t) => ({ ...t, supportEmail: true }))} className={`mt-1.5 h-9 w-full rounded-xl border bg-white/12 px-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${touched.supportEmail && errors.supportEmail ? "border-rose-300/60" : "border-white/20"}`} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="dev-demo" className="block text-[12px] font-medium text-slate-800">Demo video URL (optional)</label>
            <input id="dev-demo" value={value.demoVideoUrl} onChange={(e) => onChange({ demoVideoUrl: e.target.value.trim() })} className="mt-1.5 h-9 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-mono text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <label htmlFor="dev-desc" className="block text-[12px] font-medium text-slate-800">Application description</label>
        <textarea id="dev-desc" value={value.description} maxLength={MAX_LENGTHS.description} onChange={(e) => onChange({ description: e.target.value })} rows={4} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/12 px-3 py-2 text-[13px] leading-5 text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
        <p className="mt-1 text-[11px] text-slate-600">{value.description.length}/{MAX_LENGTHS.description}</p>

        <div className="mt-4">
          <label htmlFor="dev-review" className="block text-[12px] font-medium text-slate-800">Review notes (optional)</label>
          <textarea id="dev-review" value={value.reviewNotes} maxLength={MAX_LENGTHS.notes} onChange={(e) => onChange({ reviewNotes: e.target.value })} rows={3} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/12 px-3 py-2 text-[13px] leading-5 text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          <p className="mt-1 text-[11px] text-slate-600">{value.reviewNotes.length}/{MAX_LENGTHS.notes}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h4 className="text-[13px] font-semibold text-slate-900">Developer Submission Checklist (local only)</h4>
        <p className="mt-1 text-[11px] text-slate-600">No fake Approved badge. Checklist does not imply platform approval.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checklistItems.map((it) => (
            <label key={it.key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-700 backdrop-blur-xl">
              <input type="checkbox" checked={value.checklist[it.key]} onChange={(e) => onChange({ checklist: { ...value.checklist, [it.key]: e.target.checked } })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              {it.label}
            </label>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-slate-600">
          Completed: {Object.values(value.checklist).filter(Boolean).length}/{Object.keys(value.checklist).length}
        </div>
      </div>
    </div>
  );
}
