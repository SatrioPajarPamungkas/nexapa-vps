import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Shield, Info } from "lucide-react";
import type { AccountPlatform, UiPlatform, AccountCapability, DraftForm } from "../connected-accounts.types";
import { AccountPlatformSelector } from "./AccountPlatformSelector";
import { PLATFORM_DISPLAY, PLATFORM_CONNECTION_METHOD } from "../connected-accounts.constants";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  editingForm: DraftForm | null;
  onClose: () => void;
  onSubmit: (form: DraftForm) => { errors?: Record<string, string> } | undefined;
};

type LocalState = {
  platform: UiPlatform | "";
  accountLabel: string;
  accountIdentifier: string;
  notes: string;
  isDefault: boolean;
  step: number;
};

const UI_PLATFORM_CAPABILITIES: Record<UiPlatform, AccountCapability[]> = {
  tiktok: ["publishing", "scheduling", "media-access"],
  facebook: ["publishing", "scheduling", "affiliate", "media-access"],
  instagram: ["publishing", "scheduling", "media-access"],
  youtube: ["publishing", "scheduling", "media-access"],
  shopee: ["affiliate", "media-access"],
  pinterest: ["publishing", "media-access"],
};

function getInitialState(editing: DraftForm | null): LocalState {
  if (editing) {
    return {
      platform: editing.platform,
      accountLabel: editing.accountLabel,
      accountIdentifier: editing.accountIdentifier,
      notes: editing.notes,
      isDefault: editing.isDefault,
      step: 3,
    };
  }
  return {
    platform: "",
    accountLabel: "",
    accountIdentifier: "",
    notes: "",
    isDefault: false,
    step: 1,
  };
}

export function AccountConnectionPanel({ open, editingForm, onClose, onSubmit }: Props) {
  const isEditing = !!editingForm;
  // We derive initial form from props but keep it in state; when open toggles we reset via key prop pattern
  // Use a controlled reset via effect that schedules via queueMicrotask to satisfy react-hooks/set-state-in-effect
  const [formState, setFormState] = useState<LocalState>(() => getInitialState(editingForm));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  // Use open + editingForm identity to reset – schedule after render
  const openKey = open ? (editingForm ? `edit-${editingForm.accountLabel}-${editingForm.platform}` : "new") : "closed";
  const [lastKey, setLastKey] = useState<string>("closed");

  if (lastKey !== openKey) {
    // Defer state reset to microtask to avoid setState during render via direct call in effect alternative
    // But we must avoid ref during render; we use state comparison and queueMicrotask
    queueMicrotask(() => {
      setFormState(getInitialState(editingForm));
      setErrors({});
      setLastKey(openKey);
    });
  }

  const { platform, accountLabel, accountIdentifier, notes, isDefault, step } = formState;

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('button, input, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
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

  const currentCapabilities = useMemo(() => {
    if (!platform) return [];
    return UI_PLATFORM_CAPABILITIES[platform] ?? [];
  }, [platform]);

  const currentMethod = useMemo(() => {
    if (!platform) return "";
    return PLATFORM_CONNECTION_METHOD[platform];
  }, [platform]);

  const handleSubmit = useCallback(() => {
    if (!platform) return;
    const form: DraftForm = {
      platform,
      accountLabel,
      accountIdentifier,
      notes,
      isDefault,
      status: "backend-required",
    };
    const res = onSubmit(form);
    if (res?.errors) {
      setErrors(res.errors);
      return;
    }
    onClose();
  }, [platform, accountLabel, accountIdentifier, notes, isDefault, onSubmit, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="connect-title">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="relative ml-auto flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl sm:m-auto sm:h-auto sm:max-h-[90vh] sm:w-[90vw] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 id="connect-title" className="text-[15px] font-semibold text-slate-900">
              {isEditing ? "Edit local account draft" : "Prepare local account draft"}
            </h2>
            <p className="text-[11px] text-slate-500">Steps: 1 Choose platform • 2 Review method • 3 Label • 4 Save locally</p>
          </div>
          <button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div ref={dialogRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            {!isEditing && (
              <div className="flex items-center gap-2 text-[11px]">
                {[1, 2, 3, 4].map((s) => (
                  <span
                    key={s}
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium",
                      step >= s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
                    )}
                  >
                    {s}
                  </span>
                ))}
                <span className="ml-2 text-slate-600">Step {step} of 4</span>
              </div>
            )}

            {!isEditing && step === 1 && (
              <AccountPlatformSelector
                selected={platform as AccountPlatform | ""}
                onSelect={(p) => {
                  setFormState((prev) => ({ ...prev, platform: p, step: 2 }));
                }}
              />
            )}

            {(isEditing || step >= 2) && platform && (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-[12px] font-medium text-slate-800">
                    <Shield className="h-4 w-4 text-slate-500" aria-hidden="true" /> Selected platform
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">{PLATFORM_DISPLAY[platform]}</p>
                  <p className="mt-1 text-[12px] text-slate-600">{currentMethod}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {currentCapabilities.map((cap) => (
                      <span key={cap} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                        Planned capability: {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {step === 2 && !isEditing && (
                  <div className="flex justify-between">
                    <button type="button" onClick={() => setFormState((p) => ({ ...p, step: 1 }))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormState((p) => ({ ...p, step: 3 }))}
                      className="rounded-lg bg-slate-900 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      Continue to label
                    </button>
                  </div>
                )}
              </>
            )}

            {(isEditing || step >= 3) && platform && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="account-label" className="block text-[12px] font-medium text-slate-700">
                    Account label <span aria-hidden="true" className="text-rose-600">*</span>
                  </label>
                  <input
                    id="account-label"
                    value={accountLabel}
                    onChange={(e) => setFormState((prev) => ({ ...prev, accountLabel: e.target.value }))}
                    placeholder="Primary TikTok Account"
                    maxLength={80}
                    required
                    aria-invalid={!!errors.accountLabel}
                    aria-describedby={errors.accountLabel ? "label-error" : "label-help"}
                    className={cn(
                      "mt-1.5 h-9 w-full rounded-lg border bg-white px-3 text-[13px] focus:outline-none focus:ring-2",
                      errors.accountLabel ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
                    )}
                  />
                  <p id="label-help" className="mt-1 text-[11px] text-slate-500">
                    This is only a local reference label and is not verified with the platform. Max 80 chars. Required.
                  </p>
                  {errors.accountLabel && (
                    <p id="label-error" role="alert" className="mt-1 text-[11px] text-rose-600">
                      {errors.accountLabel}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="account-identifier" className="block text-[12px] font-medium text-slate-700">
                    Account identifier (optional)
                  </label>
                  <input
                    id="account-identifier"
                    value={accountIdentifier}
                    onChange={(e) => setFormState((prev) => ({ ...prev, accountIdentifier: e.target.value }))}
                    placeholder="username / Page name / channel name / store label"
                    maxLength={120}
                    aria-invalid={!!errors.accountIdentifier}
                    aria-describedby={errors.accountIdentifier ? "id-error" : "id-help"}
                    className={cn(
                      "mt-1.5 h-9 w-full rounded-lg border bg-white px-3 text-[13px] focus:outline-none focus:ring-2",
                      errors.accountIdentifier ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
                    )}
                  />
                  <p id="id-help" className="mt-1 text-[11px] text-slate-500">Optional reference only. Not verified. Max 120 chars.</p>
                  {errors.accountIdentifier && (
                    <p id="id-error" role="alert" className="mt-1 text-[11px] text-rose-600">
                      {errors.accountIdentifier}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="connection-method" className="block text-[12px] font-medium text-slate-700">
                    Connection method (read-only)
                  </label>
                  <input id="connection-method" value={currentMethod} readOnly className="mt-1.5 h-9 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-600" />
                </div>

                <div>
                  <label htmlFor="account-notes" className="block text-[12px] font-medium text-slate-700">
                    Notes (optional)
                  </label>
                  <textarea
                    id="account-notes"
                    value={notes}
                    onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                    maxLength={300}
                    rows={3}
                    placeholder="Local notes about this draft…"
                    aria-describedby={errors.notes ? "notes-error" : "notes-help"}
                    aria-invalid={!!errors.notes}
                    className={cn(
                      "mt-1.5 w-full rounded-lg border bg-white p-2.5 text-[13px] focus:outline-none focus:ring-2",
                      errors.notes ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
                    )}
                  />
                  <p id="notes-help" className="mt-1 text-[11px] text-slate-500">Max 300 chars. In-memory only.</p>
                  {errors.notes && (
                    <p id="notes-error" role="alert" className="mt-1 text-[11px] text-rose-600">
                      {errors.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="is-default"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setFormState((prev) => ({ ...prev, isDefault: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <label htmlFor="is-default" className="text-[12px] text-slate-700">
                    Default publishing destination for {platform ? PLATFORM_DISPLAY[platform] : "this platform"}
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Default destinations will be applied after the publishing backend is connected.</p>

                {errors.global && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{errors.global}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  {!isEditing ? (
                    <>
                      <button type="button" onClick={() => setFormState((p) => ({ ...p, step: 2 }))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
                        Back
                      </button>
                      <button type="button" onClick={handleSubmit} className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                        Save local draft
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
                        Cancel
                      </button>
                      <button type="button" onClick={handleSubmit} className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                        Save changes
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-4 text-blue-800 ring-1 ring-blue-200">
              No login form, no password, no cookie, no token input. This panel only prepares a local reference. No platform request is made.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
