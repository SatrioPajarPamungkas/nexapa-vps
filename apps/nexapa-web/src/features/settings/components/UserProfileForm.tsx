import { useState, useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { updateProfile } from "@/lib/api/auth";
import { CheckCircle2, AlertCircle, Loader2, User, Mail } from "lucide-react";

type FormState = {
  name: string;
  email: string;
};

type FormErrors = {
  name?: string;
  email?: string;
  general?: string;
};

export function UserProfileForm() {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState<FormState>({
    name: user?.name ?? "",
    email: user?.email ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useMemo(() => {
    const e: FormErrors = {};
    if (!formData.name.trim()) {
      e.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      e.name = "Name must be at least 2 characters";
    }
    if (!formData.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      e.email = "Please enter a valid email address";
    }
    return e;
  }, [formData]);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldError = validate[field];
    if (fieldError) {
      setErrors((prev) => ({ ...prev, [field]: fieldError }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true });

    const validationErrors = validate;
    if (validationErrors.name || validationErrors.email) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      await updateProfile({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
      });
      await refreshUser();
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      if (error?.status === 422 && error?.errors) {
        const apiErrors = error.errors as Record<string, string[]>;
        const mappedErrors: FormErrors = {};
        if (apiErrors.name?.[0]) mappedErrors.name = apiErrors.name[0];
        if (apiErrors.email?.[0]) mappedErrors.email = apiErrors.email[0];
        setErrors(mappedErrors);
      } else {
        setErrors({
          general: error?.message || "Failed to update profile. Please try again.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty =
    formData.name !== user?.name || formData.email !== user?.email;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-transparent" noValidate>
      {saveSuccess && (
        <div
          className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-[13px] font-medium text-emerald-800 backdrop-blur-xl"
          role="status"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Profile updated successfully
        </div>
      )}

      {errors.general && (
        <div
          className="flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-800 backdrop-blur-xl"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {errors.general}
        </div>
      )}

      {/* Profile Info Card */}
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/20 backdrop-blur-xl">
              <User className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-slate-950">
                Profile Information
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">
                Update your personal information and contact details.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-[12px] font-medium text-slate-800"
            >
              Display Name
            </label>
            <div className="relative mt-1.5">
              <input
                id="profile-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="Enter your name"
                autoComplete="name"
                className={`h-10 w-full rounded-xl border bg-white/15 py-2 pl-10 pr-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${
                  errors.name ? "border-red-400/40 focus:border-red-400/60" : "border-white/25 focus:border-blue-400/60"
                }`}
              />
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            {errors.name && (
              <p className="mt-1.5 text-[11px] font-medium text-red-700">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="block text-[12px] font-medium text-slate-800"
            >
              Email Address
            </label>
            <div className="relative mt-1.5">
              <input
                id="profile-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="Enter your email"
                autoComplete="email"
                className={`h-10 w-full rounded-xl border bg-white/15 py-2 pl-10 pr-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${
                  errors.email ? "border-red-400/40 focus:border-red-400/60" : "border-white/25 focus:border-blue-400/60"
                }`}
              />
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-[11px] font-medium text-red-700">{errors.email}</p>
            )}
          </div>

          {/* Account Role */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-xl">
                <svg
                  className="h-4 w-4 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-slate-800">
                  Account Role
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-600">
                  Your role determines your access level in the system. This
                  cannot be changed from the profile settings.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 backdrop-blur-xl">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      user?.role === "admin" ? "bg-blue-500" : "bg-slate-400"
                    }`}
                  />
                  {user?.role === "admin" ? "Administrator" : "User"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/15 pt-5">
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: user?.name ?? "",
                email: user?.email ?? "",
              });
              setErrors({});
              setTouched({});
            }}
            disabled={!isDirty || isSaving}
            className="inline-flex h-10 min-w-[80px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 text-[13px] font-medium text-slate-700 backdrop-blur-xl transition-colors hover:bg-white/22 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className="inline-flex h-10 min-w-[124px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Helper info */}
      <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-[12px] leading-5 text-slate-600 backdrop-blur-xl">
        Your profile information is used for account identification and
        communication. Changes are saved immediately and synchronized across all
        your sessions.
      </div>
    </form>
  );
}
