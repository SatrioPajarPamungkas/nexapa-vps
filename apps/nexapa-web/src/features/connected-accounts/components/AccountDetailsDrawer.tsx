import { useEffect, useRef } from "react";
import { X, Pencil, Trash2, Shield, Star, Settings } from "lucide-react";
import type { ConnectedAccountDraft, UiPlatform } from "../connected-accounts.types";
import { PLATFORM_DISPLAY, STATUS_LABEL, PLATFORM_CONNECTION_METHOD, PLATFORM_CAPABILITY_LABELS } from "../connected-accounts.constants";
import { formatDateTime, getInitials } from "../connected-accounts.utils";
import { cn } from "@/lib/cn";

type Props = {
  account: ConnectedAccountDraft | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onSetDefault: (id: string) => void;
  onClearDefault: (id: string) => void;
};

const PLATFORM_TONE: Record<UiPlatform, string> = {
  tiktok: "bg-slate-900 text-white",
  facebook: "bg-blue-600 text-white",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  youtube: "bg-red-600 text-white",
  shopee: "bg-orange-500 text-white",
  pinterest: "bg-red-500 text-white",
};

export function AccountDetailsDrawer({ account, open, onClose, onEdit, onRemove, onSetDefault, onClearDefault }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="acct-detail-title">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="drawer-slide-in relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl sm:max-w-[520px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="acct-detail-title" className="truncate text-[15px] font-semibold text-slate-900">
              {account.accountLabel}
            </h2>
            <p className="text-[11px] text-slate-500">
              {PLATFORM_DISPLAY[account.platform]} \u2022 Local draft
            </p>
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div ref={drawerRef} className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            {/* Avatar and identity */}
            <div className="flex items-center gap-4">
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold", PLATFORM_TONE[account.platform])}>
                {getInitials(account.accountLabel)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-semibold text-slate-900">{account.accountLabel}</h3>
                  {account.isDemo && (
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">DEMO</span>
                  )}
                </div>
                <p className="text-[12px] text-slate-500">
                  {PLATFORM_DISPLAY[account.platform]}
                  {account.accountIdentifier && ` \u2022 ${account.accountIdentifier}`}
                </p>
              </div>
            </div>

            {/* Status and default */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
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
              {account.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                  <Star className="h-3 w-3" aria-hidden="true" /> Default destination
                </span>
              )}
            </div>

            {/* Capabilities */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-[12px] font-medium text-slate-700">Planned capabilities</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {account.capabilities.map((cap) => (
                  <span key={cap} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                    {PLATFORM_CAPABILITY_LABELS[cap]}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Available after authorization</p>
            </div>

            {/* Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-[12px] font-medium text-slate-700">Details</h4>
              <dl className="mt-3 space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Platform</dt>
                  <dd className="font-medium text-slate-900">{PLATFORM_DISPLAY[account.platform]}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Label</dt>
                  <dd className="font-medium text-slate-900">{account.accountLabel}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Identifier</dt>
                  <dd className="font-medium text-slate-900">{account.accountIdentifier || "\u2014"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Connection</dt>
                  <dd className="max-w-[280px] text-right font-medium text-slate-900">{PLATFORM_CONNECTION_METHOD[account.platform]}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Created</dt>
                  <dd className="font-medium text-slate-900">{formatDateTime(account.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Updated</dt>
                  <dd className="font-medium text-slate-900">{formatDateTime(account.updatedAt)}</dd>
                </div>
              </dl>

              {account.notes && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] leading-5 text-slate-600 ring-1 ring-slate-200">
                  {account.notes}
                </div>
              )}
            </div>

            {/* Security notice */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="flex items-center gap-2 text-[12px] font-medium text-blue-800">
                <Shield className="h-4 w-4" aria-hidden="true" /> Security
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-blue-700">
                Nexapa Web does not currently store OAuth tokens, passwords, raw cookies, or active platform sessions. Secure authorization will be managed by Nexapa API.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { onEdit(account.id); onClose(); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-slate-800"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit Local Draft
              </button>
              {account.isDefault ? (
                <button
                  type="button"
                  onClick={() => { onClearDefault(account.id); onClose(); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-[12px] font-medium text-blue-700 hover:bg-blue-100"
                >
                  <Star className="h-3.5 w-3.5" aria-hidden="true" /> Clear Default
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { onSetDefault(account.id); onClose(); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-[12px] font-medium text-blue-700 hover:bg-blue-100"
                >
                  <Star className="h-3.5 w-3.5" aria-hidden="true" /> Set as Default
                </button>
              )}
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-medium text-slate-400 opacity-60"
                aria-disabled="true"
                title="Connect Nexapa API and complete platform developer configuration before starting authorization"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" /> Prepare Authorization
              </button>
              <button
                type="button"
                aria-label={`Remove ${account.accountLabel}`}
                onClick={() => { onRemove(account.id); onClose(); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-medium text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              This is a local draft. No platform login or authorization was performed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
