import { Star, RefreshCw, Trash2, User, AlertTriangle } from "lucide-react";
import type { ConnectedAccount, AccountStatus, AccountPlatform } from "../connected-accounts.types";
import { STATUS_LABEL, PLATFORM_COLOR } from "../connected-accounts.constants";
import { formatDateTime, getInitials, truncate } from "../connected-accounts.utils";
import { cn } from "@/lib/cn";

type Props = {
  account: ConnectedAccount;
  onRefresh: (id: string) => void;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
  actionLoading?: boolean;
};

function statusGlassTone(status: AccountStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-400/15 border-emerald-400/25 text-emerald-800";
    case "expired":
      return "bg-amber-400/12 border-amber-400/25 text-amber-800";
    case "error":
      return "bg-red-400/12 border-red-400/25 text-red-800";
    case "disconnected":
      return "bg-red-400/12 border-red-400/25 text-red-800";
    default:
      return "bg-white/10 border-white/20 text-slate-700";
  }
}

function StatusBadge({ status }: { status: AccountStatus }) {
  const hasIcon = status === "error" || status === "expired";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-xl", statusGlassTone(status))}>
      {hasIcon && <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

function AvatarPlaceholder({ name, platform }: { name: string; platform: AccountPlatform }) {
  const initials = getInitials(name);
  return (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/20 text-[13px] font-bold backdrop-blur-xl", PLATFORM_COLOR[platform] ? "text-white" : "text-slate-700")}>
      {initials}
    </div>
  );
}

export function ConnectedAccountCard({ account, onRefresh, onSetDefault, onRemove, actionLoading }: Props) {
  const isLoading = actionLoading ?? false;
  const metadata = account.metadata as Record<string, unknown> | undefined;
  const parentAccountName = metadata?.parent_account_name as string | undefined;

  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_14px_40px_rgba(2,6,23,0.14)] backdrop-blur-2xl ring-1 ring-white/10 transition-all duration-200 hover:bg-white/15 hover:border-white/30",
        account.is_default && "border-blue-400/25 bg-blue-400/12",
      )}
    >
      <div className="flex items-start gap-3">
        {account.avatar_url ? (
          <img src={account.avatar_url} alt={account.display_name} className="h-10 w-10 shrink-0 rounded-xl border border-white/25 bg-white/20 object-cover backdrop-blur-xl" loading="lazy" />
        ) : (
          <AvatarPlaceholder name={account.display_name} platform={account.platform} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-slate-900">{truncate(account.display_name, 40)}</p>
            {account.is_default && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 backdrop-blur-xl">
                <Star className="h-2.5 w-2.5 fill-amber-500" aria-hidden="true" /> Default
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            {account.username && <span>@{account.username}</span>}
            {parentAccountName && (
              <>
                <span className="text-white/30">•</span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" aria-hidden="true" />
                  {parentAccountName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={account.status} />
        <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[11px] text-slate-500 backdrop-blur-xl">{account.connection_method}</span>
      </div>

      {account.last_validated_at && <p className="mt-2 text-[11px] text-slate-500">Last checked {formatDateTime(account.last_validated_at)}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/15 pt-3">
        <button type="button" aria-label={`Refresh ${account.display_name}`} onClick={() => onRefresh(account.id)} disabled={isLoading} className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/12 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl transition hover:bg-white/22 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} aria-hidden="true" />
          Refresh
        </button>

        {account.is_default ? (
          <button type="button" aria-label={`Clear default for ${account.display_name}`} onClick={() => onSetDefault(account.id)} disabled={isLoading} className="inline-flex items-center gap-1 rounded-xl border border-blue-400/25 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-800 backdrop-blur-xl transition hover:bg-blue-500/18 disabled:cursor-not-allowed disabled:opacity-50">
            Clear default
          </button>
        ) : (
          <button type="button" aria-label={`Set ${account.display_name} as default`} onClick={() => onSetDefault(account.id)} disabled={isLoading} className="inline-flex items-center gap-1 rounded-xl border border-blue-400/25 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-800 backdrop-blur-xl transition hover:bg-blue-500/18 disabled:cursor-not-allowed disabled:opacity-50">
            <Star className="h-3 w-3" aria-hidden="true" />
            Set as Default
          </button>
        )}

        <button type="button" aria-label={`Remove ${account.display_name}`} onClick={() => onRemove(account.id)} disabled={isLoading} className="inline-flex items-center gap-1 rounded-xl border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-700 backdrop-blur-xl transition hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-50">
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          Remove
        </button>
      </div>
    </div>
  );
}
