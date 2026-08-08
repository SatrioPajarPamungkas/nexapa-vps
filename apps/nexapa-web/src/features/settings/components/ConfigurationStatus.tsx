type Props = {
  status: "not-configured" | "partial" | "complete-locally" | "backend-required" | "has-errors";
};

export function ConfigurationStatus({ status }: Props) {
  const map: Record<Props["status"], { label: string; tone: string }> = {
    "not-configured": { label: "Not configured", tone: "border border-slate-400/25 bg-slate-500/12 text-slate-700 backdrop-blur-xl" },
    partial: { label: "Partially configured", tone: "border border-amber-400/25 bg-amber-500/12 text-amber-800 backdrop-blur-xl" },
    "complete-locally": { label: "Configuration complete locally", tone: "border border-emerald-400/25 bg-emerald-500/12 text-emerald-800 backdrop-blur-xl" },
    "backend-required": { label: "Backend required", tone: "border border-blue-400/25 bg-blue-500/10 text-blue-800 backdrop-blur-xl" },
    "has-errors": { label: "Action required", tone: "border border-red-400/25 bg-red-500/12 text-red-800 backdrop-blur-xl" },
  };
  const info = map[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium shadow-sm backdrop-blur-xl ${info.tone}`}>{info.label}</span>;
}
