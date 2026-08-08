import { useEffect, useRef } from "react";
import { X, Pencil, Trash2, Shield, Star } from "lucide-react";
import type { ConnectedAccountDraft } from "../connected-accounts.types";
import { PLATFORM_DISPLAY, STATUS_LABEL } from "../connected-accounts.constants";
import { formatDateTime } from "../connected-accounts.utils";
import { StatusBadge } from "@/components/common/StatusBadge";

type Props = {
  account: ConnectedAccountDraft | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

export function AccountDetailsDialog({ account, open, onClose, onEdit, onRemove }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
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
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="acct-detail-title">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="relative ml-auto flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl sm:m-auto sm:h-auto sm:max-h-[90vh] sm:w-[90vw] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="acct-detail-title" className="truncate text-[15px] font-semibold text-slate-900">
              {account.accountLabel}
            </h2>
            <p className="text-[11px] text-slate-500">
              {PLATFORM_DISPLAY[account.platform]} • Local draft • No platform connection
            </p>
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div ref={dialogRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-[13px] font-semibold text-slate-900">Account overview</h3>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
                <div><dt className="text-slate-500">Platform</dt><dd className="font-medium text-slate-900">{PLATFORM_DISPLAY[account.platform]}</dd></div>
                <div><dt className="text-slate-500">Label</dt><dd className="font-medium text-slate-900">{account.accountLabel}</dd></div>
                <div><dt className="text-slate-500">Identifier</dt><dd className="font-medium text-slate-900">{account.accountIdentifier || "—"}</dd></div>
                <div><dt className="text-slate-500">Connection method</dt><dd className="font-medium text-slate-900">{account.connectionMethod}</dd></div>
                <div><dt className="text-slate-500">Status</dt><dd className="mt-1"><StatusBadge label={STATUS_LABEL[account.status] ?? account.status} tone={account.status === "backend-required" ? "amber" : account.status === "local-draft" ? "blue" : "neutral"} /></dd></div>
                <div><dt className="text-slate-500">Default</dt><dd className="font-medium text-slate-900">{account.isDefault ? "Default destination" : "Not default"}</dd></div>
                <div><dt className="text-slate-500">Created</dt><dd className="font-medium text-slate-900">{formatDateTime(account.createdAt)}</dd></div>
                <div><dt className="text-slate-500">Updated</dt><dd className="font-medium text-slate-900">{formatDateTime(account.updatedAt)}</dd></div>
              </dl>

              {account.notes && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[12px] leading-5 text-slate-700 ring-1 ring-slate-200">
                  Notes: {account.notes}
                </div>
              )}

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Planned capabilities</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {account.capabilities.map((cap) => (
                    <span key={cap} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                      Planned capability: {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="flex items-center gap-2 text-[12px] font-medium text-blue-900">
                <Shield className="h-4 w-4" aria-hidden="true" /> Security explanation
              </p>
              <p className="mt-2 text-[12px] leading-5 text-blue-800">
                Nexapa Web does not currently store OAuth tokens, passwords, cookies, or browser sessions. Secure account authorization will be implemented through Nexapa API.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-4 text-blue-700">
                <li>No credential collection</li>
                <li>No session storage</li>
                <li>No platform request</li>
                <li>No publishing permission acquired</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { onClose(); onEdit(account.id); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit local draft
              </button>
              <button
                type="button"
                aria-label={`Remove ${account.accountLabel}`}
                onClick={() => { onRemove(account.id); onClose(); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-medium text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove local draft
              </button>
              {account.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
                  <Star className="h-3 w-3" aria-hidden="true" /> Default destination
                </span>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-[11px] leading-4 text-slate-600 ring-1 ring-slate-200">
              Default destinations will be applied after the publishing backend is connected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
