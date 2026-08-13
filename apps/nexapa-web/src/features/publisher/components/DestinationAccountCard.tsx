import { Video, Users, Camera, PlayCircle, Star } from "lucide-react";
import { useState } from "react";
import type { DestinationAccount, PublishPlatform } from "../publisher.types";
import { PLATFORM_DISPLAY } from "../publisher.constants";
import { cn } from "@/lib/cn";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";

type Props = {
  account: DestinationAccount;
  selected: boolean;
  onToggle: (id: string) => void;
  singleSelect?: boolean;
};

const ICON_MAP: Record<PublishPlatform, typeof Video> = {
  tiktok: Video,
  facebook: Users,
  instagram: Camera,
  youtube: PlayCircle,
};

const PLATFORM_COLORS: Record<PublishPlatform, string> = {
  tiktok: "bg-slate-900",
  facebook: "bg-blue-600",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  youtube: "bg-red-600",
};

export function DestinationAccountCard({ account, selected, onToggle, singleSelect = false }: Props) {
  const Icon = ICON_MAP[account.platform];
  const showAvatar = Boolean(account.avatarUrl) && (account.platform === "facebook" || account.platform === "tiktok");
  const initials = account.label.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const displayIdentifier =
    account.platform === "tiktok"
      ? account.identifier && !account.identifier.startsWith("-") && account.identifier.length < 40
        ? account.identifier
        : "TikTok account"
      : account.identifier;

  return (
    <label className={cn("group flex cursor-pointer items-center gap-3 rounded-xl border p-3 backdrop-blur-xl transition-all", selected ? "border-blue-400/35 bg-blue-500/12 shadow-sm ring-1 ring-blue-400/20" : "border-white/10 bg-white/6 hover:border-white/15 hover:bg-white/14")}>
      <SelectionCheckbox
        type={singleSelect ? "radio" : "checkbox"}
        name={singleSelect ? `destination-${account.platform}` : undefined}
        checked={selected}
        onChange={() => onToggle(account.id)}
        ariaLabel={`${selected ? (singleSelect ? "Selected" : "Deselect") : "Select"} ${account.label} ${account.isDemo ? "DEMO" : ""}`}
      />

      {showAvatar && account.avatarUrl ? <AvatarWithFallback src={account.avatarUrl} initials={initials} selected={selected} /> : <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white shadow-sm backdrop-blur-xl transition-colors", selected ? "bg-blue-600 border-blue-400/40 text-white" : PLATFORM_COLORS[account.platform])}><Icon className="h-4 w-4" aria-hidden="true" /></span>}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-medium text-slate-900">{account.label}</span>
          {account.isDemo && <span className="rounded-full border border-amber-400/25 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-amber-800">Demo</span>}
          {account.isDefault && <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-label="Default account" />}
        </span>
        <span className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
          <span>{PLATFORM_DISPLAY[account.platform]}</span>
          {account.accountType && <><span className="text-white/30">&middot;</span><span className="truncate rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px]">{account.accountType.replace('facebook_', '')}</span></>}
          <span className="text-white/30">&middot;</span>
          <span className="truncate">{displayIdentifier}</span>
          <span className="text-white/30">&middot;</span>
          <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-medium backdrop-blur-xl", account.status === "demo" ? "border-amber-400/25 bg-amber-400/15 text-amber-800" : account.status === "authorization-required" ? "border-amber-400/25 bg-amber-400/15 text-amber-800" : "border-white/15 bg-white/8 text-slate-500")}>{account.status === "demo" ? "Demo" : account.status === "backend-required" ? "Backend needed" : account.status === "authorization-required" ? "Auth needed" : "Ready"}</span>
        </span>
      </span>
    </label>
  );
}

function AvatarWithFallback({ src, initials, selected }: { src: string; initials: string; selected: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!src || imageFailed) {
    return (
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white shadow-sm backdrop-blur-xl transition-colors", selected ? "bg-blue-600 border-blue-400/40" : "bg-slate-400/80")}>
        <span className="text-[10px] font-semibold">{initials}</span>
      </span>
    );
  }

  return <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-full border border-white/25 bg-white/20 object-cover shadow-sm" loading="lazy" onError={() => setImageFailed(true)} />;
}
