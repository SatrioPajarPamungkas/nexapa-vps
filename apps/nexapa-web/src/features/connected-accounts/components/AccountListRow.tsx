import { Star, Pencil, Trash2, Eye, Video, Users, Camera, PlayCircle, ShoppingBag } from "lucide-react";
import type { ConnectedAccountDraft, UiPlatform } from "../connected-accounts.types";
import { PLATFORM_DISPLAY, STATUS_LABEL, PLATFORM_CAPABILITY_LABELS } from "../connected-accounts.constants";
import { formatDateTime } from "../connected-accounts.utils";
import { cn } from "@/lib/cn";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  account: ConnectedAccountDraft;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onView: (id: string) => void;
};

const ICON_MAP: Record<UiPlatform, typeof Video> = {
  tiktok: Video,
  facebook: Users,
  instagram: Camera,
  youtube: PlayCircle,
  shopee: ShoppingBag,
  pinterest: Camera,
};

const PLATFORM_TONE: Record<UiPlatform, string> = {
  tiktok: "bg-slate-900 text-white",
  facebook: "bg-blue-600 text-white",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  youtube: "bg-red-600 text-white",
  shopee: "bg-orange-500 text-white",
  pinterest: "bg-red-500 text-white",
};

export function AccountListRow({ account, onToggle, onEdit, onRemove, onView }: Props) {
  const Icon = ICON_MAP[account.platform];

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${account.accountLabel}, ${account.selected ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
      onClick={(event) => {
        if (!isInteractiveSelectionTarget(event.target)) onToggle(account.id);
      }}
      onKeyDown={(event) => {
        if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
          event.preventDefault();
          onToggle(account.id);
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col gap-3 rounded-xl border bg-white px-3 py-3 shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:flex-row sm:items-center sm:px-4",
        account.selected
          ? "border-blue-300 ring-1 ring-blue-200 bg-blue-50/30"
          : account.isDefault
            ? "border-blue-200"
            : "border-slate-200 hover:border-slate-300 hover:shadow-md",
      )}
    >
      <div className="flex items-center gap-3 sm:w-[35%]">
        <SelectionCheckbox
          checked={account.selected}
          onChange={() => onToggle(account.id)}
          ariaLabel={`${account.selected ? "Deselect" : "Select"} ${account.accountLabel}`}
        />
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", PLATFORM_TONE[account.platform])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-slate-900">{account.accountLabel}</p>
            {account.isDemo && (
              <span className="inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 ring-1 ring-amber-200">
                DEMO
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-slate-500">
            {account.accountIdentifier || "No identifier"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2 text-[11px] sm:justify-between">
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
          {PLATFORM_DISPLAY[account.platform]}
        </span>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
          account.status === "backend-required"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : account.status === "authorization-required"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : account.status === "inactive"
                ? "border-slate-200 bg-slate-100 text-slate-500"
                : "border-slate-200 bg-slate-50 text-slate-600",
        )}>
          {STATUS_LABEL[account.status]}
        </span>
        <span className="text-slate-500">
          {account.capabilities.slice(0, 2).map((c) => PLATFORM_CAPABILITY_LABELS[c]).join(", ")}
          {account.capabilities.length > 2 && ` +${account.capabilities.length - 2}`}
        </span>
        {account.isDefault && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600">
            <Star className="h-2.5 w-2.5" aria-hidden="true" /> Default
          </span>
        )}
        <span className="text-[10px] text-slate-400">{formatDateTime(account.updatedAt)}</span>
      </div>

      <div className="flex items-center gap-1 sm:ml-auto">
        <button
          type="button"
          aria-label={`View details for ${account.accountLabel}`}
          onClick={() => onView(account.id)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Edit ${account.accountLabel}`}
          onClick={() => onEdit(account.id)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Remove ${account.accountLabel}`}
          onClick={() => onRemove(account.id)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
