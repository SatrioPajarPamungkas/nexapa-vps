import { useState } from "react";
import type { ChartPeriod } from "../dashboard.types";
import { CHART_SERIES_COLORS, PERIOD_LABELS } from "../dashboard.constants";
import { getPeriodDayCount, buildLinePath, buildAreaPath } from "../dashboard.utils";
import { DashboardSectionHeader } from "./DashboardSectionHeader";
import { cn } from "@/lib/cn";

const WIDTH = 700;
const HEIGHT = 260;
const PADDING = { top: 20, right: 20, bottom: 40, left: 40 };

export function DashboardActivityChart() {
  const [period, setPeriod] = useState<ChartPeriod>("7d");
  const days = getPeriodDayCount(period);
  const baselineY = HEIGHT - PADDING.bottom;
  const usableWidth = WIDTH - PADDING.left - PADDING.right;
  const gridLines = 5;

  const gridPaths = Array.from({ length: gridLines }, (_, i) => {
    const y = PADDING.top + (i / (gridLines - 1)) * (HEIGHT - PADDING.top - PADDING.bottom);
    return y;
  });

  const xLabels = Array.from({ length: Math.min(days, 7) }, (_, i) => {
    const dayIndex = Math.floor((i / 6) * (days - 1));
    const x = PADDING.left + (dayIndex / Math.max(days - 1, 1)) * usableWidth;
    return { x, label: `D${dayIndex + 1}` };
  });

  const zeroPoints = Array.from({ length: days }, (_, i) => ({
    x: PADDING.left + (i / Math.max(days - 1, 1)) * usableWidth,
    y: baselineY,
  }));

  const linePath = buildLinePath(zeroPoints);
  const areaPath = buildAreaPath(zeroPoints, baselineY);

  return (
    <div className="animate-card-enter animate-stagger-6 relative isolate overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-6">
      <div className="relative z-10">
        <DashboardSectionHeader
          title="Workflow Activity"
          description="Downloads, uploads, published, and scheduled over time"
          action={
            <div className="flex gap-1 rounded-lg border border-white/40 bg-white/20 p-0.5 backdrop-blur-sm">
              {(Object.keys(PERIOD_LABELS) as ChartPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md px-3 py-1 text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                    period === p
                      ? "bg-white/70 text-navy-900 shadow-sm backdrop-blur-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                  aria-pressed={period === p}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          }
        />

        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`Workflow Activity chart, ${PERIOD_LABELS[period]}. No data yet.`}
        >
          <title>Workflow Activity</title>
          <desc>Line and area chart showing workflow activity. Currently all values are zero.</desc>

          {/* Grid lines */}
          {gridPaths.map((y, i) => (
            <line
              key={i}
              x1={PADDING.left}
              y1={y}
              x2={WIDTH - PADDING.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Y-axis labels */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = PADDING.top + (i / (gridLines - 1)) * (HEIGHT - PADDING.top - PADDING.bottom);
            return (
              <text
                key={i}
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400"
                fontSize="10"
              >
                0
              </text>
            );
          })}

          {/* X-axis labels */}
          {xLabels.map((l, i) => (
            <text
              key={i}
              x={l.x}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize="10"
            >
              {l.label}
            </text>
          ))}

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#activityGradient)"
            className="chart-area-animated"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-line-animated"
          />

          {/* Series legend dots */}
          {CHART_SERIES_COLORS.map((s, i) => (
            <g key={s.label} transform={`translate(${PADDING.left + i * 90}, ${HEIGHT - 24})`}>
              <circle cx="0" cy="0" r="3.5" fill={s.color} />
              <text x="8" y="3.5" className="fill-slate-500" fontSize="9.5">
                {s.label}
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
            </linearGradient>
          </defs>
        </svg>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
          <p className="text-[12px] font-medium text-slate-600">
            No workflow activity yet.
          </p>
          <span className="text-[12px] text-slate-400">
            Activity will appear after Nexapa services begin processing jobs.
          </span>
        </div>
      </div>
    </div>
  );
}
