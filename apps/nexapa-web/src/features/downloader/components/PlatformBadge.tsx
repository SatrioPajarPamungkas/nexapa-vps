import { Video, Users, Camera, PlayCircle, Globe, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DownloadPlatform } from "../downloader.types";

type Props = { platform: DownloadPlatform; className?: string };

const MAP: Record<DownloadPlatform, { label: string; icon: LucideIcon; tone: string }> = {
  tiktok: { label: "TikTok", icon: Video, tone: "border-white/15 bg-white/10 text-slate-700 backdrop-blur-xl" },
  facebook: { label: "Facebook", icon: Users, tone: "border-blue-200/40 bg-blue-500/12 text-blue-700" },
  instagram: { label: "Instagram", icon: Camera, tone: "border-fuchsia-200/40 bg-fuchsia-500/12 text-fuchsia-700" },
  youtube: { label: "YouTube", icon: PlayCircle, tone: "border-red-200/40 bg-red-500/12 text-red-700" },
  generic: { label: "Web", icon: Globe, tone: "border-white/15 bg-white/10 text-slate-600 backdrop-blur-xl" },
};

export function PlatformBadge({ platform, className }: Props) {
  const cfg = MAP[platform] ?? MAP.generic;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors duration-150",
        cfg.tone,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
