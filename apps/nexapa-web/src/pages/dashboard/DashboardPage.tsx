import { Link } from "react-router-dom";
import { Download, Send } from "lucide-react";
import { DASHBOARD_METRICS } from "@/features/dashboard/dashboard.constants";
import { DashboardMetricCard } from "@/features/dashboard/components/DashboardMetricCard";
import { DashboardActivityChart } from "@/features/dashboard/components/DashboardActivityChart";
import { DashboardVolumeChart } from "@/features/dashboard/components/DashboardVolumeChart";
import { DashboardAccountChart } from "@/features/dashboard/components/DashboardAccountChart";
import { DashboardWorkflowVisual } from "@/features/dashboard/components/DashboardWorkflowVisual";
import { DashboardQuickActions } from "@/features/dashboard/components/DashboardQuickActions";
import { DashboardUpcomingSchedule } from "@/features/dashboard/components/DashboardUpcomingSchedule";
import { DashboardRecentActivity } from "@/features/dashboard/components/DashboardRecentActivity";

export function DashboardPage() {
  return (
    <div className="w-full">
      {/* HERO: normal app shell header, no company wallpaper */}
      <div className="-mx-4 -mt-4 flex flex-col justify-center px-4 py-10 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-12 lg:-mx-8 lg:-mt-6 lg:px-8 lg:py-16">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col">
          <div className="nexapa-glass-card relative overflow-hidden rounded-2xl border border-white/20 shadow-[0_18px_55px_rgba(2,6,23,0.18)]">
            <div className="relative z-10 flex flex-col gap-4 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
                  Workspace Overview
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px] sm:leading-[1.15]">
                  Dashboard
                </h1>
                <p className="mt-2 max-w-[620px] text-[14px] leading-6 text-slate-600">
                  Monitor downloads, media, connected accounts, publishing, and schedules from one Nexapa workspace.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <Link
                  to="/publisher"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)] transition-all duration-200 hover:bg-blue-700 hover:shadow-[0_10px_28px_rgba(37,99,235,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Create Post
                </Link>
                <Link
                  to="/downloader"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-white/35 hover:bg-white/20 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download Media
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* END HERO */}

      {/* AFTER HERO - transparent to show app background */}
      <div className="-mx-4 space-y-6 px-4 py-6 sm:-mx-6 sm:px-6 sm:py-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-[1440px] space-y-6">
          {/* Metrics now outside hero to ensure wallpaper stops at hero */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DASHBOARD_METRICS.map((metric, i) => (
              <DashboardMetricCard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                supporting={metric.supporting}
                icon={metric.icon}
                accent={metric.accent}
                index={i}
              />
            ))}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 flex-1">
              <DashboardActivityChart />
            </div>
            <div className="w-full shrink-0 lg:w-[340px] xl:w-[380px]">
              <DashboardWorkflowVisual />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardVolumeChart />
            <DashboardAccountChart />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardQuickActions />
            <DashboardUpcomingSchedule />
          </div>

          <div>
            <DashboardRecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
}
