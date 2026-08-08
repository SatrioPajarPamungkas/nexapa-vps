import { DashboardSectionHeader } from "./DashboardSectionHeader";

/* ─── Icon SVG paths (Lucide-style, 24×24 viewBox) ─── */

const ICON_PATHS = {
  media: {
    paths: [
      "M12 2L2 7l10 5 10-5-10-5z",
      "M2 17l10 5 10-5",
      "M2 12l10 5 10-5",
    ],
    viewBox: "0 0 24 24",
  },
  cloud: {
    paths: [
      "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",
    ],
    viewBox: "0 0 24 24",
  },
  accounts: {
    paths: [
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
      "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
      "M22 21v-2a4 4 0 0 0-3-3.87",
      "M16 3.13a4 4 0 0 1 0 7.75",
    ],
    viewBox: "0 0 24 24",
  },
  publish: {
    paths: [
      "M22 2L11 13",
      "M22 2l-7 20-4-9-9-4z",
    ],
    viewBox: "0 0 24 24",
  },
  schedule: {
    paths: [
      "M3 6h18",
      "M3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6",
      "M16 2v4",
      "M8 2v4",
      "M3 10h18",
      "M14 14h.01",
      "M10 14h.01",
      "M14 18h.01",
      "M10 18h.01",
    ],
    viewBox: "0 0 24 24",
  },
} as const;

type IconKey = keyof typeof ICON_PATHS;

/* ─── Node configuration ─── */

type WorkflowNode = {
  id: string;
  label: string;
  supporting: string;
  icon: IconKey;
  x: number;
  y: number;
  accent: "blue" | "cyan";
  floatClass: string;
};

const NODES: WorkflowNode[] = [
  {
    id: "media",
    label: "Media",
    supporting: "Input",
    icon: "media",
    x: 60,
    y: 148,
    accent: "blue",
    floatClass: "wf-float-a",
  },
  {
    id: "cloud",
    label: "Cloud",
    supporting: "Workspace",
    icon: "cloud",
    x: 240,
    y: 72,
    accent: "cyan",
    floatClass: "wf-float-b",
  },
  {
    id: "accounts",
    label: "Accounts",
    supporting: "Connected",
    icon: "accounts",
    x: 420,
    y: 148,
    accent: "blue",
    floatClass: "wf-float-c",
  },
  {
    id: "publish",
    label: "Publish",
    supporting: "Output",
    icon: "publish",
    x: 570,
    y: 72,
    accent: "blue",
    floatClass: "wf-float-d",
  },
  {
    id: "schedule",
    label: "Schedule",
    supporting: "Timed",
    icon: "schedule",
    x: 570,
    y: 240,
    accent: "cyan",
    floatClass: "wf-float-e",
  },
];

const NODE_W = 108;
const NODE_H = 88;
const NODE_R = 14;
const ICON_R = 10;

/* ─── Connector paths ─── */

type ConnectorDef = {
  id: string;
  d: string;
  pulseDelay: string;
};

const CONNECTORS: ConnectorDef[] = [
  {
    id: "c-media-cloud",
    d: "M 168 176 C 196 176 212 112 240 112",
    pulseDelay: "0s",
  },
  {
    id: "c-cloud-accounts",
    d: "M 348 112 C 376 112 392 176 420 176",
    pulseDelay: "1.2s",
  },
  {
    id: "c-accounts-publish",
    d: "M 528 176 C 548 176 558 112 570 112",
    pulseDelay: "2.4s",
  },
  {
    id: "c-accounts-schedule",
    d: "M 528 176 C 548 176 558 276 570 276",
    pulseDelay: "3s",
  },
];

/* ─── Sub-components ─── */

function WorkflowNodeCard({ node }: { node: WorkflowNode }) {
  const icon = ICON_PATHS[node.icon];
  const cx = node.x + NODE_W / 2;
  const iconCx = cx;
  const iconCy = node.y + 28;
  const isBlue = node.accent === "blue";
  const accentFill = isBlue ? "#3b82f6" : "#06b6d4";
  const accentFillLight = isBlue ? "#eff6ff" : "#ecfeff";
  const accentStroke = isBlue ? "#93c5fd" : "#67e8f9";

  return (
    <g className={node.floatClass}>
      {/* 3D shadow */}
      <rect
        x={node.x + 4}
        y={node.y + 4}
        width={NODE_W}
        height={NODE_H}
        rx={NODE_R}
        fill="#cbd5e1"
        opacity="0.35"
      />
      {/* 3D depth face (bottom) */}
      <rect
        x={node.x + 2}
        y={node.y + 2}
        width={NODE_W}
        height={NODE_H}
        rx={NODE_R}
        fill="#e2e8f0"
        opacity="0.5"
      />
      {/* Main card */}
      <rect
        x={node.x}
        y={node.y}
        width={NODE_W}
        height={NODE_H}
        rx={NODE_R}
        fill="white"
        stroke={accentStroke}
        strokeWidth="1.5"
      />
      {/* Top highlight */}
      <rect
        x={node.x + 1}
        y={node.y + 1}
        width={NODE_W - 2}
        height={20}
        rx={NODE_R - 1}
        fill={accentFillLight}
        opacity="0.6"
      />
      {/* Icon container circle */}
      <circle
        cx={iconCx}
        cy={iconCy}
        r={ICON_R + 4}
        fill={accentFillLight}
        stroke={accentStroke}
        strokeWidth="1"
      />
      <circle cx={iconCx} cy={iconCy} r={ICON_R} fill={accentFill} opacity="0.12" />
      {/* Icon */}
      <g
        transform={`translate(${iconCx - 12}, ${iconCy - 12}) scale(1)`}
        fill="none"
        stroke={accentFill}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {/* Label */}
      <text
        x={cx}
        y={node.y + NODE_H - 18}
        textAnchor="middle"
        fill="#0f172a"
        fontSize="11.5"
        fontWeight="600"
      >
        {node.label}
      </text>
      <text
        x={cx}
        y={node.y + NODE_H - 6}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="9.5"
      >
        {node.supporting}
      </text>
      {/* Connection port */}
      <circle cx={cx} cy={node.y + NODE_H} r="3" fill={accentFill} opacity="0.6" />
    </g>
  );
}

function Connector({ connector, index }: { connector: ConnectorDef; index: number }) {
  const revealDelay = `${index * 0.25}s`;
  return (
    <g>
      {/* Shadow track */}
      <path
        d={connector.d}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Main path */}
      <path
        d={connector.d}
        fill="none"
        stroke="url(#wf-conn-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="wf-connector-path"
        style={{ animationDelay: revealDelay }}
      />
      {/* Dashed guide */}
      <path
        d={connector.d}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="0.75"
        strokeDasharray="3 4"
        opacity="0.4"
      />
      {/* Traveling pulse */}
      <circle r="4" fill="#3b82f6" opacity="0.7" className="wf-pulse-travel">
        <animateMotion
          dur="4s"
          repeatCount="indefinite"
          begin={connector.pulseDelay}
          path={connector.d}
        />
      </circle>
      <circle r="2" fill="#06b6d4" opacity="0.9" className="wf-pulse-travel">
        <animateMotion
          dur="4s"
          repeatCount="indefinite"
          begin={connector.pulseDelay}
          path={connector.d}
        />
      </circle>
    </g>
  );
}

/* ─── Main component ─── */

export function DashboardWorkflowVisual() {
  return (
    <div className="animate-card-enter animate-stagger-5 relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.18)] backdrop-blur-2xl ring-1 ring-white/10">
      <div className="relative z-10 p-5 sm:p-6">
        <DashboardSectionHeader
          title="Nexapa Workflow"
          description="How your media moves through Nexapa"
        />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-4 pb-5 sm:px-6">
        <svg
          viewBox="0 0 680 340"
          className="h-auto w-full max-w-[580px]"
          role="img"
          aria-label="Nexapa Workflow: Media enters the cloud workspace, connects to authorized accounts, and continues to publishing or scheduling workflows."
        >
          <title>Nexapa Workflow</title>
          <desc>
            Media enters the Nexapa cloud workspace, connects to authorized
            accounts, and continues to publishing or scheduling workflows.
          </desc>

          <defs>
            <linearGradient id="wf-conn-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="wf-node-blue" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eff6ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="wf-node-cyan" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ecfeff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#cffafe" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Connectors (behind nodes) */}
          <g className="wf-connector-group">
            {CONNECTORS.map((c, i) => (
              <Connector key={c.id} connector={c} index={i} />
            ))}
          </g>

          {/* Nodes */}
          {NODES.map((node) => (
            <WorkflowNodeCard key={node.id} node={node} />
          ))}

          {/* Branch label */}
          <text
            x="540"
            y="184"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
            fontStyle="italic"
          >
            branch
          </text>
        </svg>
      </div>

      {/* Compact footer - transparent to show wallpaper */}
      <div className="relative z-10 border-t border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm sm:px-6">
        <p className="text-center text-[11px] text-slate-600">
          Media{" "}
          <span className="text-blue-600">→</span>{" "}
          Cloud{" "}
          <span className="text-cyan-600">→</span>{" "}
          Accounts{" "}
          <span className="text-blue-600">→</span>{" "}
          Publish / Schedule
        </p>
      </div>
    </div>
  );
}
