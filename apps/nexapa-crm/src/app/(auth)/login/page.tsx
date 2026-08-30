"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [showPassword, setShowPassword] =
    useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] =
    useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/nexapa-login",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const result = await response.json().catch(
        () => ({
          success: false,
          message: "Respons login tidak valid.",
        }),
      );

      if (!response.ok || !result.success) {
        setError(
          result.message ??
            "Email atau password salah.",
        );
        return;
      }

      const destination = inviteToken
        ? `/join/${encodeURIComponent(inviteToken)}`
        : result.destination ?? "/dashboard";

      window.location.href = destination;
    } catch {
      setError(
        "Layanan login tidak dapat dihubungi. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl border border-white/30 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/assets/branding/nexapa-app-logo.svg"
            alt="Nexapa"
            className="mb-3 h-10 w-auto"
          />

          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Sign in
          </h1>

          {inviteToken && (
            <p className="mt-1 text-center text-[13px] text-slate-500">
              Sign in to continue your invitation
            </p>
          )}
        </div>

        <form
          onSubmit={handleLogin}
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

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[12px] font-medium text-slate-700"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {showPassword ? (
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

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-[13px] text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href={
              inviteToken
                ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                : "/signup"
            }
            className="font-medium text-blue-600 hover:underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
