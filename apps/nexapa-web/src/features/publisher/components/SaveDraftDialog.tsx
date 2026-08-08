import { useEffect, useRef, useState } from "react";
import { X, Save } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName?: string;
};

export function SaveDraftDialog({ open, onClose, onSave, initialName }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const [initializedFor, setInitializedFor] = useState("");

  const initKey = open ? (initialName ?? "new") : "closed";

  if (initializedFor !== initKey) {
    queueMicrotask(() => {
      if (open) {
        setName(initialName ?? "");
        setError("");
      }
      setInitializedFor(initKey);
    });
  }

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("input")?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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

  if (!open) return null;

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Draft name required");
      return;
    }
    if (trimmed.length > 80) {
      setError("Maximum 80 characters");
      return;
    }
    onSave(trimmed);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="draft-dialog-title">
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} className="relative mx-4 w-full max-w-[420px] rounded-2xl border border-white/10 bg-slate-950/78 p-6 shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
        <div className="flex items-center justify-between"><h2 id="draft-dialog-title" className="text-[15px] font-semibold text-white">Save local draft</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 backdrop-blur-xl hover:bg-white/15"><X className="h-4 w-4" aria-hidden="true" /></button></div>

        <div className="mt-4 space-y-3">
          <label htmlFor="draft-name" className="block text-[12px] font-medium text-white/80">Draft name</label>
          <input id="draft-name" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="My campaign draft" maxLength={80} className="h-10 w-full rounded-xl border border-white/15 bg-white/8 px-3 text-[13px] text-white backdrop-blur-xl placeholder:text-white/40 focus:border-blue-400/60 focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          <div className="flex items-center justify-between">{error ? <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-2 py-1 text-[11px] text-red-200" role="alert">{error}</p> : <p className="text-[10px] text-white/50">{name.length}/80</p>}</div>
          <p className="text-[10px] leading-4 text-white/50">Local drafts exist only in this browser session. Maximum 20 drafts. No localStorage, IndexedDB, or backend.</p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-[13px] text-white backdrop-blur-xl hover:bg-white/15">Cancel</button>
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-blue-700"><Save className="h-4 w-4" aria-hidden="true" /> Save</button>
        </div>
      </div>
    </div>
  );
}
