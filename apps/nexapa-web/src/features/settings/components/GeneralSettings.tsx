import type { GeneralSettings } from "../settings.types";
import { LANGUAGES, TIMEZONES, DATE_FORMATS, TIME_FORMATS, LANDING_PAGES } from "../settings.constants";
import { isValidHttpsUrl, isValidUrl } from "../settings.utils";
import { useMemo, useState } from "react";

type Props = {
  value: GeneralSettings;
  onChange: (patch: Partial<GeneralSettings>) => void;
};

export function GeneralSettingsForm({ value, onChange }: Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!value.appName.trim()) e.appName = "Application name required";
    if (!isValidUrl(value.marketingDomain)) e.marketingDomain = "Must be valid URL";
    else if (!isValidHttpsUrl(value.marketingDomain)) e.marketingDomain = "Should be HTTPS";
    if (!isValidUrl(value.appDomain)) e.appDomain = "Must be valid URL";
    if (!isValidHttpsUrl(value.apiBaseUrl)) e.apiBaseUrl = "Must be valid HTTPS URL";
    return e;
  }, [value]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Application identity</h3>
        <p className="mt-1 text-[12px] text-slate-500">Defaults use Nexapa branding. Values remain in memory only.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gen-appName" className="block text-[12px] font-medium text-slate-700">Application name</label>
            <input id="gen-appName" value={value.appName} onChange={(e) => onChange({ appName: e.target.value })} onBlur={() => setTouched((t) => ({ ...t, appName: true }))} className={`mt-1.5 h-9 w-full rounded-lg border bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${touched.appName && errors.appName ? "border-rose-300" : "border-slate-200"}`} />
            {touched.appName && errors.appName && <p className="mt-1 text-[11px] text-rose-600">{errors.appName}</p>}
          </div>
          <div>
            <label htmlFor="gen-lang" className="block text-[12px] font-medium text-slate-700">Default language</label>
            <select id="gen-lang" value={value.language} onChange={(e) => onChange({ language: e.target.value as GeneralSettings["language"] })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="gen-marketing" className="block text-[12px] font-medium text-slate-700">Marketing domain</label>
            <input id="gen-marketing" value={value.marketingDomain} onChange={(e) => onChange({ marketingDomain: e.target.value.trim() })} onBlur={() => setTouched((t) => ({ ...t, marketingDomain: true }))} placeholder="https://nexapa.app" className={`mt-1.5 h-9 w-full rounded-lg border bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${touched.marketingDomain && errors.marketingDomain ? "border-rose-300" : "border-slate-200"}`} />
            {touched.marketingDomain && errors.marketingDomain && <p className="mt-1 text-[11px] text-rose-600">{errors.marketingDomain}</p>}
          </div>
          <div>
            <label htmlFor="gen-appDomain" className="block text-[12px] font-medium text-slate-700">Application domain</label>
            <input id="gen-appDomain" value={value.appDomain} onChange={(e) => onChange({ appDomain: e.target.value.trim() })} onBlur={() => setTouched((t) => ({ ...t, appDomain: true }))} placeholder="https://nexapa.app" className={`mt-1.5 h-9 w-full rounded-lg border bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${touched.appDomain && errors.appDomain ? "border-rose-300" : "border-slate-200"}`} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="gen-api" className="block text-[12px] font-medium text-slate-700">API base URL</label>
            <input id="gen-api" value={value.apiBaseUrl} onChange={(e) => onChange({ apiBaseUrl: e.target.value.trim() })} onBlur={() => setTouched((t) => ({ ...t, apiBase: true }))} placeholder="https://api.nexapa.app/api" className={`mt-1.5 h-9 w-full rounded-lg border bg-white px-3 text-[13px] font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${touched.apiBase && errors.apiBaseUrl ? "border-rose-300" : "border-slate-200"}`} />
            {touched.apiBase && errors.apiBaseUrl && <p className="mt-1 text-[11px] text-rose-600">{errors.apiBaseUrl}</p>}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-[14px] font-semibold text-slate-900">Localization and defaults</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="gen-tz" className="block text-[12px] font-medium text-slate-700">Default timezone</label>
            <select id="gen-tz" value={value.timezone} onChange={(e) => onChange({ timezone: e.target.value as GeneralSettings["timezone"] })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="gen-date" className="block text-[12px] font-medium text-slate-700">Date format</label>
            <select id="gen-date" value={value.dateFormat} onChange={(e) => onChange({ dateFormat: e.target.value as GeneralSettings["dateFormat"] })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="gen-time" className="block text-[12px] font-medium text-slate-700">Time format</label>
            <select id="gen-time" value={value.timeFormat} onChange={(e) => onChange({ timeFormat: e.target.value as GeneralSettings["timeFormat"] })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {TIME_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="gen-landing" className="block text-[12px] font-medium text-slate-700">Default landing page after login</label>
            <select id="gen-landing" value={value.landingPage} onChange={(e) => onChange({ landingPage: e.target.value as GeneralSettings["landingPage"] })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {LANDING_PAGES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
