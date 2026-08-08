import type { DownloaderSettings } from "../downloader.types";

type Props = {
  settings: DownloaderSettings;
  batchLimit: 10 | 25 | 50;
  onSettingsChange: (next: DownloaderSettings) => void;
  onBatchLimitChange: (v: 10 | 25 | 50) => void;
};

export function DownloaderSettingsPanel({ settings, batchLimit, onSettingsChange, onBatchLimitChange }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-[13px] font-semibold text-slate-900">Output preferences</h3>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">Affects only newly added queue items. Existing items retain their captured settings.</p>

      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor="output-format" className="block text-[12px] font-medium text-slate-700">Output format</label>
          <select
            id="output-format"
            value={settings.outputFormat}
            onChange={(e) => onSettingsChange({ ...settings, outputFormat: e.target.value as DownloaderSettings["outputFormat"] })}
            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="original">Auto / Original (preserve source format)</option>
            <option value="mp4">Video MP4 (convert to mp4)</option>
            <option value="audio">Audio only (extract audio)</option>
          </select>
        </div>

        <div>
          <label htmlFor="video-quality" className="block text-[12px] font-medium text-slate-700">Video quality</label>
          <select
            id="video-quality"
            value={settings.quality}
            onChange={(e) => onSettingsChange({ ...settings, quality: e.target.value as DownloaderSettings["quality"] })}
            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="best">Best available</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>

        <div>
          <label htmlFor="filename-mode" className="block text-[12px] font-medium text-slate-700">Filename mode</label>
          <select
            id="filename-mode"
            value={settings.filenameMode}
            onChange={(e) => onSettingsChange({ ...settings, filenameMode: e.target.value as DownloaderSettings["filenameMode"] })}
            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="original">Original title</option>
            <option value="platform_date">Platform and date</option>
            <option value="safe">Safe generated name</option>
          </select>
        </div>

        <div>
          <label htmlFor="queue-delay" className="block text-[12px] font-medium text-slate-700">Queue delay</label>
          <select
            id="queue-delay"
            value={settings.delaySeconds}
            onChange={(e) => onSettingsChange({ ...settings, delaySeconds: Number(e.target.value) as DownloaderSettings["delaySeconds"] })}
            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value={0}>0 seconds</option>
            <option value={2}>2 seconds</option>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={15}>15 seconds</option>
          </select>
        </div>

        <div>
          <label htmlFor="batch-limit" className="block text-[12px] font-medium text-slate-700">Batch limit per add</label>
          <select
            id="batch-limit"
            value={batchLimit}
            onChange={(e) => onBatchLimitChange(Number(e.target.value) as 10 | 25 | 50)}
            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div>
          <label htmlFor="concurrent" className="block text-[12px] font-medium text-slate-700">Concurrent jobs</label>
          <input id="concurrent" disabled value="1 job" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-500 disabled:cursor-not-allowed" />
          <p className="mt-1 text-[11px] text-slate-500">Concurrency will be controlled by the Nexapa download worker.</p>
        </div>

        <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800 ring-1 ring-amber-200">
          These preferences do not affect real downloads yet. Worker will respect them after API is connected.
        </div>
      </div>
    </div>
  );
}
