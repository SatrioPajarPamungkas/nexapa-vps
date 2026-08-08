export function RecentActivityPanel() {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <h3 className="mb-3 text-[13px] font-semibold text-slate-900">Recent Activity</h3>
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/15 bg-white/8 py-6 backdrop-blur-xl">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/20 backdrop-blur-xl">
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-[11px] text-slate-600">No recent account activity</p>
      </div>
    </div>
  );
}