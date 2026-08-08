import { useState, useId } from "react";
import { Eye, EyeOff, X, ShieldAlert } from "lucide-react";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  description?: string;
  id?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
};

export function SecretField({ label, value, onChange, placeholder, description, id, required, error, autoComplete = "new-password", disabled }: Props) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descId = description ? `${fieldId}-desc` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;

  return (
    <div>
      <label htmlFor={fieldId} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="text-rose-500" aria-hidden="true">*</span>}
        <span className="inline-flex items-center gap-0.5 rounded border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 normal-case tracking-normal backdrop-blur-xl">
          <ShieldAlert className="h-2.5 w-2.5" /> Sensitive
        </span>
      </label>
      <div className="relative mt-1.5">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-describedby={[descId, errId].filter(Boolean).join(" ") || undefined}
          aria-invalid={!!error}
          className={`h-9 w-full rounded-xl border bg-white/12 px-3 pr-[72px] text-[12px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:bg-white/5 transition-colors ${error ? "border-rose-300/60" : "border-white/20"}`}
        />
        <div className="absolute right-1 top-1 flex gap-0.5">
          <button
            type="button"
            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
            onClick={() => setVisible((v) => !v)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-600 backdrop-blur-xl transition-colors hover:bg-white/18 hover:text-slate-900"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange("")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-500 backdrop-blur-xl transition-colors hover:bg-white/18 hover:text-slate-700"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      {description && (
        <p id={descId} className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p>
      )}
      {error && (
        <p id={errId} className="mt-1 text-[10px] text-rose-500">{error}</p>
      )}
      <p className="mt-0.5 text-[9px] text-slate-500">Masked input is not encrypted storage.</p>
    </div>
  );
}
