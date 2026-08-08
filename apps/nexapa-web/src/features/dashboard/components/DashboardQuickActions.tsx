import { Link } from "react-router-dom";
import { DASHBOARD_QUICK_ACTIONS } from "../dashboard.constants";
import { DashboardSectionHeader } from "./DashboardSectionHeader";
import { cn } from "@/lib/cn";

export function DashboardQuickActions() {
  return (
    <div className="animate-card-enter animate-stagger-6 relative isolate overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-6">
      <div className="relative z-10">
        <DashboardSectionHeader title="Quick Actions" description="Jump directly into productive workflows" />

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {DASHBOARD_QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                to={action.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-left backdrop-blur-sm transition-all duration-200",
                  "hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_25px_rgba(2,6,23,0.08)] hover:-translate-y-px",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border backdrop-blur-xl transition-transform duration-200 group-hover:scale-105",
                    action.accent === "blue"
                      ? "bg-white/25 border-white/25 text-blue-600 ring-1 ring-white/10"
                      : "bg-white/25 border-white/25 text-cyan-600 ring-1 ring-white/10",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-navy-900">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-slate-600">
                    {action.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
