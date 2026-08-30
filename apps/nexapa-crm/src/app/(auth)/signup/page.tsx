"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  User,
} from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);
  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);
  const [termsAccepted, setTermsAccepted] =
    useState(false);
  const [remember, setRemember] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(false);
  const [success, setSuccess] =
    useState(false);

  const handleSignup = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters",
      );
      return;
    }

    if (!termsAccepted) {
      setError(
        "You must accept the Terms and Privacy Policy",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/nexapa-register",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: fullName,
            email,
            password,
            password_confirmation:
              confirmPassword,
            terms_accepted: termsAccepted,
            remember,
          }),
        },
      );

      const result = await response.json().catch(
        () => ({
          success: false,
          message:
            "Respons registrasi tidak valid.",
        }),
      );

      if (!response.ok || !result.success) {
        setError(
          result.message ??
            "Registrasi akun gagal.",
        );
        return;
      }

      setSuccess(true);
    } catch {
      setError(
        "Layanan registrasi tidak dapat dihubungi. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CheckCircle className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-slate-900">
            Check your email
          </h1>

          <p className="mt-2 text-[13px] leading-6 text-slate-500">
            Nexapa telah mengirim tautan verifikasi ke{" "}
            <span className="font-medium text-slate-800">
              {email}
            </span>
            . Verifikasi email sebelum login.
          </p>

          <Link
            href={
              inviteToken
                ? `/login?invite=${encodeURIComponent(inviteToken)}`
                : "/login"
            }
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            {inviteToken
              ? "Create account & join"
              : "Create an account"}
          </h1>
        </div>

        <form
          onSubmit={handleSignup}
          className="space-y-4"
          noValidate
        >
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-5 text-red-900">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-[12px] font-medium text-slate-700"
            >
              Full Name
            </label>

            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                required
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[12px] font-medium text-slate-700"
            >
              Email
            </label>

            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@workspace.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <PasswordInput
            id="password"
            label="Password"
            value={password}
            visible={showPassword}
            onChange={setPassword}
            onToggle={() =>
              setShowPassword((value) => !value)
            }
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm Password"
            value={confirmPassword}
            visible={showConfirmPassword}
            onChange={setConfirmPassword}
            onToggle={() =>
              setShowConfirmPassword(
                (value) => !value,
              )
            }
          />

          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) =>
                setTermsAccepted(
                  event.target.checked,
                )
              }
              style={{
                colorScheme: "light",
                accentColor: "#2563eb",
              }}
              className="mt-0.5 h-4 w-4 rounded border border-slate-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />

            <label
              htmlFor="terms"
              className="text-[13px] text-slate-600"
            >
              I agree to the{" "}
              <a
                href="#"
                className="text-blue-600 hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-blue-600 hover:underline"
              >
                Privacy Policy
              </a>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(event) =>
                setRemember(event.target.checked)
              }
              style={{
                colorScheme: "light",
                accentColor: "#2563eb",
              }}
              className="h-4 w-4 rounded border border-slate-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />

            <label
              htmlFor="remember"
              className="text-[13px] text-slate-600"
            >
              Remember me on this device
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-[13px] text-slate-600">
          Already have an account?{" "}
          <Link
            href={
              inviteToken
                ? `/login?invite=${encodeURIComponent(inviteToken)}`
                : "/login"
            }
            className="font-medium text-blue-600 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  visible,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[12px] font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />

        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          required
          minLength={8}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />

        <button
          type="button"
          aria-label={
            visible
              ? "Hide password"
              : "Show password"
          }
          onClick={onToggle}
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {visible ? (
            <EyeOff
              className="h-4 w-4"
              aria-hidden="true"
            />
          ) : (
            <Eye
              className="h-4 w-4"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </div>
  );
}
