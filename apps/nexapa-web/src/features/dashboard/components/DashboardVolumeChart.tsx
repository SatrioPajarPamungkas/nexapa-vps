import { VOLUME_CATEGORIES } from "../dashboard.constants";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

const WIDTH = 340;
const HEIGHT = 240;
const BAR_WIDTH = 42;
const DEPTH_OFFSET = 8;
const MAX_BAR_HEIGHT = 140;
const BASELINE_Y = 180;

export function DashboardVolumeChart() {
  const totalBars = VOLUME_CATEGORIES.length;
  const spacing = (WIDTH - 60) / totalBars;

  return (
    <div className="animate-card-enter animate-stagger-7 relative isolate overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-6">
      <div className="relative z-10">
        <DashboardSectionHeader
          title="Workflow Volume"
          description="No volume data"
        />

        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-transparent backdrop-blur-sm">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Workflow Volume bar chart. No data yet."
        >
          <title>Workflow Volume</title>
          <desc>3D-style bar chart showing download, media, publish, and schedule volume. All values are zero.</desc>

          {/* Baseline */}
          <line
            x1="20"
            y1={BASELINE_Y}
            x2={WIDTH - 20}
            y2={BASELINE_Y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Bars */}
          {VOLUME_CATEGORIES.map((cat, i) => {
            const centerX = 30 + i * spacing + spacing / 2;
            const x = centerX - BAR_WIDTH / 2;
            const barHeight = Math.max(4, (cat.value / 100) * MAX_BAR_HEIGHT);
            const barY = BASELINE_Y - barHeight;

            return (
              <g key={cat.label}>
                {/* Depth face (right) */}
                <path
                  d={`M ${x + BAR_WIDTH} ${barY} L ${x + BAR_WIDTH + DEPTH_OFFSET} ${barY - DEPTH_OFFSET} L ${x + BAR_WIDTH + DEPTH_OFFSET} ${BASELINE_Y - DEPTH_OFFSET} L ${x + BAR_WIDTH} ${BASELINE_Y} Z`}
                  fill={cat.depth}
                  opacity="0.7"
                  className="chart-bar-animated"
                  style={{ animationDelay: `${200 + i * 100}ms` }}
                />
                {/* Top face */}
                <path
                  d={`M ${x} ${barY} L ${x + DEPTH_OFFSET} ${barY - DEPTH_OFFSET} L ${x + BAR_WIDTH + DEPTH_OFFSET} ${barY - DEPTH_OFFSET} L ${x + BAR_WIDTH} ${barY} Z`}
                  fill={cat.color}
                  opacity="0.5"
                  className="chart-bar-animated"
                  style={{ animationDelay: `${200 + i * 100}ms` }}
                />
                {/* Front face */}
                <rect
                  x={x}
                  y={barY}
                  width={BAR_WIDTH}
                  height={barHeight}
                  fill={cat.color}
                  rx="3"
                  className="chart-bar-animated"
                  style={{ transformOrigin: `${centerX}px ${BASELINE_Y}px`, animationDelay: `${200 + i * 100}ms` }}
                />

                {/* Label */}
                <text
                  x={centerX}
                  y={BASELINE_Y + 20}
                  textAnchor="middle"
                  className="fill-slate-500"
                  fontSize="10"
                >
                  {cat.label}
                </text>

                {/* Value */}
                <text
                  x={centerX}
                  y={barY - 10}
                  textAnchor="middle"
                  className="fill-slate-400"
                  fontSize="10"
                  fontWeight="500"
                >
                  {cat.value}
                </text>
              </g>
            );
          })}
        </svg>
        </div>
      </div>
    </div>
  );
}
