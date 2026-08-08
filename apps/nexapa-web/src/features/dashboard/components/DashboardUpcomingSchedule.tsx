import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { DASHBOARD_EMPTY_SCHEDULE } from "../dashboard.constants";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

export function DashboardUpcomingSchedule() {
  return (
    <div className="animate-card-enter animate-stagger-7 relative isolate overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-6">
      <div className="relative z-10">
        <DashboardSectionHeader title="Upcoming Schedule" />

        <div className="mt-4 flex flex-col items-center rounded-xl border border-white/10 bg-white/5 py-6 text-center backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <CalendarClock className="h-5 w-5 text-slate-500" aria-hidden="true" />
          </div>
          <h4 className="mt-3 text-[13px] font-semibold text-slate-950">
            {DASHBOARD_EMPTY_SCHEDULE.title}
          </h4>
          <p className="mt-1 max-w-[280px] text-[12px] text-slate-600">
            {DASHBOARD_EMPTY_SCHEDULE.description}
          </p>
          <Link
            to={DASHBOARD_EMPTY_SCHEDULE.actionHref}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {DASHBOARD_EMPTY_SCHEDULE.actionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
