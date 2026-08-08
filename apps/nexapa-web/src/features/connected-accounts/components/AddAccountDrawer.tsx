import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Shield, ChevronRight, ChevronLeft, Check, Info } from "lucide-react";
import type { AccountPlatform, AccountCapability, UiPlatform, DraftForm } from "../connected-accounts.types";
import { PLATFORM_DISPLAY, PLATFORM_CONNECTION_METHOD, PLATFORM_CAPABILITY_LABELS, PLATFORM_DESCRIPTION } from "../connected-accounts.constants";
import { AccountPlatformSelector } from "./AccountPlatformSelector";
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
  capabilities: AccountCapability[];
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
      capabilities: UI_PLATFORM_CAPABILITIES[editing.platform] ?? [],
      step: 3,
    };
  }
  return {
    platform: "",
    accountLabel: "",
    accountIdentifier: "",
    notes: "",
    isDefault: false,
    capabilities: [],
    step: 1,
  };
}

const STEPS = ["Platform", "Method", "Details", "Capabilities", "Review"];

export function AddAccountDrawer({ open, editingForm, onClose, onSubmit }: Props) {
  const isEditing = !!editingForm;
  const [formState, setFormState] = useState<LocalState>(() => getInitialState(editingForm));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const openKey = open ? (editingForm ? `edit-${editingForm.accountLabel}-${editingForm.platform}` : "new") : "closed";
  const [lastKey, setLastKey] = useState<string>("closed");

  if (lastKey !== openKey) {
    queueMicrotask(() => {
      setFormState(getInitialState(editingForm));
      setErrors({});
      setLastKey(openKey);
    });
  }

  const { platform, accountLabel, accountIdentifier, notes, isDefault, capabilities, step } = formState;

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>('button, input, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
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

  function toggleCapability(cap: AccountCapability) {
    setFormState((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter((c) => c !== cap)
        : [...prev.capabilities, cap],
    }));
  }

  if (!open) return null;

  const maxStep = isEditing ? 5 : 5;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="add-acct-title">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="drawer-slide-in relative flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl sm:max-w-[560px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="add-acct-title" className="text-[15px] font-semibold text-slate-900">
              {isEditing ? "Edit Account" : "Add Account"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isEditing ? "Update local account draft" : `Step ${step} of ${maxStep}`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Step indicator */}
        {!isEditing && (
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-1">
              {STEPS.map((label, idx) => {
                const stepNum = idx + 1;
                const isActive = step === stepNum;
                const isComplete = step > stepNum;
                return (
                  <div key={label} className="flex items-center">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
                        isComplete ? "bg-blue-600 text-white" : isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500",
                      )}>
                        {isComplete ? <Check className="h-3 w-3" /> : stepNum}
                      </span>
                      <span className={cn("text-[11px] font-medium", isActive ? "text-slate-900" : "text-slate-500")}>
                        {label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && <ChevronRight className="mx-1 h-3 w-3 text-slate-300" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div ref={drawerRef} className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            {/* Step 1: Platform */}
            {!isEditing && step === 1 && (
              <AccountPlatformSelector
                selected={platform as AccountPlatform | ""}
                onSelect={(p) => {
                  setFormState((prev) => ({
                    ...prev,
                    platform: p,
                    capabilities: UI_PLATFORM_CAPABILITIES[p] ?? [],
                    step: 2,
                  }));
                }}
              />
            )}

            {/* Step 2: Connection Method */}
            {(isEditing || step >= 2) && platform && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[12px] font-medium text-slate-800">
                    <Shield className="mr-1.5 inline h-4 w-4 text-slate-500" aria-hidden="true" />
                    Connection method
                  </p>
                  <p className="mt-1.5 text-[14px] font-semibold text-slate-900">{PLATFORM_DISPLAY[platform]}</p>
                  <p className="mt-1 text-[12px] text-slate-600">{currentMethod}</p>
                  <p className="mt-2 text-[11px] text-slate-500">{PLATFORM_DESCRIPTION[platform]}</p>
                </div>

                <div className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-4 text-blue-800 ring-1 ring-blue-200">
                  Authentication will be performed securely through Nexapa API. Passwords, raw cookies, and access tokens are not entered on this page.
                </div>

                {step === 2 && !isEditing && (
                  <div className="flex justify-between">
                    <button type="button" onClick={() => setFormState((p) => ({ ...p, step: 1 }))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
                      <ChevronLeft className="h-3 w-3" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormState((p) => ({ ...p, step: 3 }))}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800"
                    >
                      Continue <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Account Details */}
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
                      "mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-[13px] focus:outline-none focus:ring-2",
                      errors.accountLabel ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
                    )}
                  />
                  <p id="label-help" className="mt-1 text-[11px] text-slate-500">
                    Local reference label. Not verified. Max 80 chars.
                  </p>
                  {errors.accountLabel && (
                    <p id="label-error" role="alert" className="mt-1 text-[11px] text-rose-600">{errors.accountLabel}</p>
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
                    placeholder="username / Page name / channel name"
                    maxLength={120}
                    aria-invalid={!!errors.accountIdentifier}
                    className={cn(
                      "mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-[13px] focus:outline-none focus:ring-2",
                      errors.accountIdentifier ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
                    )}
                  />
                  {errors.accountIdentifier && (
                    <p role="alert" className="mt-1 text-[11px] text-rose-600">{errors.accountIdentifier}</p>
                  )}
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
                    placeholder="Local notes about this account..."
                    aria-invalid={!!errors.notes}
                    className={cn(
                      "mt-1.5 w-full rounded-xl border bg-white p-3 text-[13px] focus:outline-none focus:ring-2",
                      errors.notes ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
                    )}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Max 300 chars. In-memory only.</p>
                  {errors.notes && <p role="alert" className="mt-1 text-[11px] text-rose-600">{errors.notes}</p>}
                </div>

                <div className="flex items-center gap-2.5">
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
                <p className="text-[11px] text-slate-500">Default destinations will be suggested in Publisher and Scheduler.</p>

                {errors.global && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{errors.global}</span>
                  </div>
                )}

                {step === 3 && !isEditing && (
                  <div className="flex justify-between">
                    <button type="button" onClick={() => setFormState((p) => ({ ...p, step: 2 }))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
                      <ChevronLeft className="h-3 w-3" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormState((p) => ({ ...p, step: 4 }))}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800"
                    >
                      Continue <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Capabilities */}
            {(isEditing || step >= 4) && platform && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-[12px] font-medium text-slate-700">Requested workflow capabilities</h4>
                  <p className="mt-1 text-[11px] text-slate-500">Select intended uses for this account.</p>
                  <div className="mt-3 space-y-2">
                    {currentCapabilities.map((cap) => (
                      <label
                        key={cap}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                          capabilities.includes(cap)
                            ? "border-blue-200 bg-blue-50 text-blue-900 ring-1 ring-blue-200"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={capabilities.includes(cap)}
                          onChange={() => toggleCapability(cap)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                        />
                        <span className="text-[13px] font-medium">{PLATFORM_CAPABILITY_LABELS[cap]}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">Capabilities do not imply platform permission has been granted.</p>
                </div>

                {step === 4 && !isEditing && (
                  <div className="flex justify-between">
                    <button type="button" onClick={() => setFormState((p) => ({ ...p, step: 3 }))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
                      <ChevronLeft className="h-3 w-3" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormState((p) => ({ ...p, step: 5 }))}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800"
                    >
                      Review <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {(isEditing || step >= 5) && platform && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-[12px] font-medium text-slate-700">Review</h4>
                  <dl className="mt-3 space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Platform</dt>
                      <dd className="font-medium text-slate-900">{PLATFORM_DISPLAY[platform]}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Label</dt>
                      <dd className="font-medium text-slate-900">{accountLabel}</dd>
                    </div>
                    {accountIdentifier && (
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Identifier</dt>
                        <dd className="font-medium text-slate-900">{accountIdentifier}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Default</dt>
                      <dd className="font-medium text-slate-900">{isDefault ? "Yes" : "No"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Capabilities</dt>
                      <dd className="font-medium text-slate-900">{capabilities.map((c) => PLATFORM_CAPABILITY_LABELS[c]).join(", ") || "None selected"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Status</dt>
                      <dd className="font-medium text-amber-700">Backend Required</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-4 text-blue-800 ring-1 ring-blue-200">
                  Account prepared locally. No platform login or authorization was performed.
                </div>

                <div className="flex justify-between">
                  {!isEditing ? (
                    <>
                      <button type="button" onClick={() => setFormState((p) => ({ ...p, step: 4 }))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
                        <ChevronLeft className="h-3 w-3" /> Back
                      </button>
                      <button type="button" onClick={handleSubmit} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:from-blue-700 hover:to-blue-800">
                        Prepare Account
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
                        Cancel
                      </button>
                      <button type="button" onClick={handleSubmit} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:from-blue-700 hover:to-blue-800">
                        Save Changes
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
