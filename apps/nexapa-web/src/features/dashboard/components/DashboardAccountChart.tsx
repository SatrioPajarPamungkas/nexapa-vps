import { ACCOUNT_PLATFORMS } from "../dashboard.constants";
import { DashboardSectionHeader } from "./DashboardSectionHeader";
import { Link2 } from "lucide-react";
import { Link } from "react-router-dom";

const SIZE = 180;
const CENTER = SIZE / 2;
const RADIUS = 65;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DashboardAccountChart() {
  const totalConnected = ACCOUNT_PLATFORMS.filter((p) => p.connected).length;

  return (
    <div className="animate-card-enter animate-stagger-8 relative isolate overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-6">
      <div className="relative z-10">
        <DashboardSectionHeader
          title="Connected Accounts"
          description="Platform connection status"
          action={
            <Link
              to="/accounts"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Open Accounts
            </Link>
          }
        />

        <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={`Connected Accounts: ${totalConnected} of ${ACCOUNT_PLATFORMS.length} connected`}
            >
              <title>Connected Accounts</title>
              <desc>Donut chart showing connected platform accounts. Currently 0 connected.</desc>

              {/* Background ring */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={STROKE}
              />

              {/* Empty state ring */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={STROKE}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="donut-segment"
                style={{
                  "--circumference": CIRCUMFERENCE,
                  "--target-offset": CIRCUMFERENCE,
                } as React.CSSProperties}
              />

              {/* Center text */}
              <text
                x={CENTER}
                y={CENTER - 6}
                textAnchor="middle"
                className="fill-navy-900"
                fontSize="28"
                fontWeight="600"
              >
                0
              </text>
              <text
                x={CENTER}
                y={CENTER + 14}
                textAnchor="middle"
                className="fill-slate-400"
                fontSize="10"
              >
                Not connected
              </text>
            </svg>
          </div>

          {/* Platform list */}
          <div className="flex-1 space-y-2">
            {ACCOUNT_PLATFORMS.map((platform) => (
              <div
                key={platform.label}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm"
              >
                <span className="text-[13px] font-medium text-slate-700">
                  {platform.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-500 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                  Not connected
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
