import type {
  AllWorkerSettings,
  DownloaderWorkerSettings,
  SchedulerWorkerSettings,
  PublishingWorkerSettings,
  BrowserWorkerSettings,
  PythonWorkerSettings,
} from "../settings.types";
import { BROWSER_ENGINES } from "../settings.constants";

type Props = {
  value: AllWorkerSettings;
  onChange: (patch: Partial<AllWorkerSettings>) => void;
};

function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl">
      <span>
        <span className="block text-[12px] font-medium text-slate-800">{label}</span>
        {description && <span className="block text-[11px] text-slate-600">{description}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
    </label>
  );
}

function WorkerSection<T extends Record<string, unknown>>({
  title,
  fields,
  value,
  onUpdate,
}: {
  title: string;
  fields: Array<{ id: string; label: string; key: keyof T; type?: "text" | "number" | "select"; min?: number; max?: number; options?: string[]; mono?: boolean }>;
  value: T;
  onUpdate: (patch: Partial<T>) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <h4 className="text-[13px] font-semibold text-slate-900">{title}</h4>
      <div className="mt-3 grid grid-cols-1 gap-3">
        {fields.map((f) => {
          const currentValue = value[f.key];
          if (f.type === "select" && f.options) {
            return (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-[11px] font-medium text-slate-600">{f.label}</label>
                <select
                  id={f.id}
                  value={String(currentValue)}
                  onChange={(e) => onUpdate({ [f.key]: e.target.value } as Partial<T>)}
                  className="mt-1 h-8 w-full rounded-xl border border-white/20 bg-white/12 px-2 text-[13px] text-slate-950 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                >
                  {f.options.map((opt) => <option key={opt} value={opt} className="bg-slate-900 text-white">{opt}</option>)}
                </select>
              </div>
            );
          }
          return (
            <div key={f.id}>
              <label htmlFor={f.id} className="block text-[11px] font-medium text-slate-600">{f.label}</label>
              <input
                id={f.id}
                type={f.type ?? "text"}
                min={f.min}
                max={f.max}
                value={currentValue as string | number}
                onChange={(e) => {
                  const val = f.type === "number" ? Number(e.target.value) : e.target.value;
                  onUpdate({ [f.key]: val } as Partial<T>);
                }}
                className={`mt-1 h-8 w-full rounded-xl border border-white/20 bg-white/12 px-2 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${f.mono ? "font-mono" : ""}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorkerSettings({ value, onChange }: Props) {
  const updateDownloader = (patch: Partial<DownloaderWorkerSettings>) => {
    onChange({ downloader: { ...value.downloader, ...patch } });
  };

  const updateScheduler = (patch: Partial<SchedulerWorkerSettings>) => {
    onChange({ scheduler: { ...value.scheduler, ...patch } });
  };

  const updatePublishing = (patch: Partial<PublishingWorkerSettings>) => {
    onChange({ publishing: { ...value.publishing, ...patch } });
  };

  const updateBrowser = (patch: Partial<BrowserWorkerSettings>) => {
    onChange({ browser: { ...value.browser, ...patch } });
  };

  const updatePython = (patch: Partial<PythonWorkerSettings>) => {
    onChange({ python: { ...value.python, ...patch } });
  };

  return (
    <div className="space-y-6 bg-transparent">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Workers – Configuration only</h3>
        <p className="mt-1 text-[12px] text-slate-600">All values remain local. Toggles do not start a worker. No process execution. No network request.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Toggle label="Download worker enabled" checked={value.enabled.downloader} onChange={(v) => onChange({ enabled: { ...value.enabled, downloader: v } })} description="Media extraction" />
        <Toggle label="Scheduler worker enabled" checked={value.enabled.scheduler} onChange={(v) => onChange({ enabled: { ...value.enabled, scheduler: v } })} description="Timed execution" />
        <Toggle label="Publishing worker enabled" checked={value.enabled.publishing} onChange={(v) => onChange({ enabled: { ...value.enabled, publishing: v } })} description="Platform posting" />
        <Toggle label="Browser worker enabled" checked={value.enabled.browser} onChange={(v) => onChange({ enabled: { ...value.enabled, browser: v } })} description="Isolated profiles" />
        <Toggle label="Python worker enabled" checked={value.enabled.python} onChange={(v) => onChange({ enabled: { ...value.enabled, python: v } })} description="Optional processing" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WorkerSection
          title="Download worker"
          value={value.downloader}
          onUpdate={updateDownloader}
          fields={[
            { id: "dw-url", label: "Worker URL", key: "url", type: "text", mono: true },
            { id: "dw-conc", label: "Concurrency", key: "concurrency", type: "number", min: 1, max: 10 },
            { id: "dw-delay", label: "Default delay (s)", key: "delaySeconds", type: "number", min: 0, max: 30 },
            { id: "dw-batch", label: "Max batch", key: "maxBatch", type: "number", min: 1, max: 100 },
            { id: "dw-timeout", label: "Timeout (s)", key: "timeoutSeconds", type: "number", min: 5, max: 600 },
            { id: "dw-retry", label: "Retry count", key: "retryCount", type: "number", min: 0, max: 10 },
          ]}
        />

        <WorkerSection
          title="Scheduler worker"
          value={value.scheduler}
          onUpdate={updateScheduler}
          fields={[
            { id: "sw-url", label: "Worker URL", key: "url", type: "text", mono: true },
            { id: "sw-poll", label: "Polling (s)", key: "pollingSeconds", type: "number", min: 5, max: 3600 },
            { id: "sw-retry", label: "Retry", key: "retryCount", type: "number", min: 0, max: 10 },
            { id: "sw-confirm", label: "Confirm timeout (s)", key: "confirmationTimeoutSeconds", type: "number", min: 10, max: 600 },
          ]}
        />

        <WorkerSection
          title="Publishing worker"
          value={value.publishing}
          onUpdate={updatePublishing}
          fields={[
            { id: "pw-url", label: "Worker URL", key: "url", type: "text", mono: true },
            { id: "pw-parallel", label: "Max parallel jobs", key: "maxParallel", type: "number", min: 1, max: 20 },
            { id: "pw-retry", label: "Retry count", key: "retryCount", type: "number", min: 0, max: 10 },
          ]}
        />

        <WorkerSection
          title="Browser worker"
          value={value.browser}
          onUpdate={updateBrowser}
          fields={[
            { id: "bw-url", label: "Worker URL", key: "url", type: "text", mono: true },
            { id: "bw-engine", label: "Browser engine", key: "engine", type: "select", options: [...BROWSER_ENGINES] },
            { id: "bw-session", label: "Session validation (min)", key: "sessionValidationMinutes", type: "number", min: 5, max: 1440 },
          ]}
        />

        <WorkerSection
          title="Python worker"
          value={value.python}
          onUpdate={updatePython}
          fields={[
            { id: "py-url", label: "Worker URL", key: "url", type: "text", mono: true },
            { id: "py-health", label: "Health path", key: "healthPath", type: "text" },
          ]}
        />

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-[13px] font-semibold text-slate-900">Browser worker</h4>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-[12px] text-slate-700">
              <input
                type="checkbox"
                checked={value.browser.isolatedProfile}
                onChange={(e) => updateBrowser({ isolatedProfile: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              /> Isolated profile mode
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] leading-4 text-slate-600 backdrop-blur-xl">
        Do not expose local filesystem paths in the web frontend. Configuration only – enabling does not start a worker or open a browser.
      </div>
    </div>
  );
}
