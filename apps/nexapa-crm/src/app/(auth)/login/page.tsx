"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Info,
  Layers,
  Lock,
  Mail,
  Shield,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const destination = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : "/dashboard";

    window.location.href = destination;
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{
        backgroundImage: "url('/assets/backgrounds/wp-login.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between p-10 text-white lg:flex">
          <div>
            <img
              src="/assets/branding/nexapa-app-logo.svg"
              alt="Nexapa"
              className="h-9 w-auto"
            />
          </div>

          <div className="max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white ring-1 ring-white/15">
              <Sparkles
                className="h-3.5 w-3.5 text-cyan-300"
                aria-hidden="true"
              />
              CUSTOMER RELATIONSHIP PLATFORM
            </div>

            <h1 className="mt-6 text-[32px] font-semibold leading-[1.1] tracking-tight">
              Conversations, contacts, pipelines, and automation — in one workspace.
            </h1>

            <p className="mt-4 text-[14px] leading-6 text-slate-200">
              Nexapa CRM centralizes customer conversations, contacts,
              broadcasts, pipelines, automations, and WhatsApp workflows
              in one operational workspace.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/30">
                  <Shield className="h-4 w-4" />
                </div>

                <p className="mt-3 text-[13px] font-medium text-white">
                  Secure workspace
                </p>

                <p className="mt-1 text-[12px] leading-5 text-slate-300">
                  Protected authentication and account-level access control.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30">
                  <Layers className="h-4 w-4" />
                </div>

                <p className="mt-3 text-[13px] font-medium text-white">
                  Unified operations
                </p>

                <p className="mt-1 text-[12px] leading-5 text-slate-300">
                  Inbox, contacts, pipelines, broadcasts, and automations.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-300">
            © {new Date().getFullYear()} Nexapa
          </div>
        </div>

        <div className="flex min-h-screen flex-col">
          <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
            <div className="w-full max-w-[420px]">
              <div className="rounded-2xl border border-white/30 bg-white/90 p-6 shadow-xl backdrop-blur-xl sm:p-8">
                <div className="mb-6 flex flex-col items-center">
                  <img
                    src="/assets/branding/nexapa-app-logo.svg"
                    alt="Nexapa"
                    className="mb-3 h-10 w-auto"
                  />

                  <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                    Sign in
                  </h1>

                  <p className="mt-1 text-[13px] text-slate-500">
                    {inviteToken
                      ? "Sign in to continue your invitation"
                      : "Welcome back to Nexapa CRM"}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4" noValidate>
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
                        onChange={(e) => setEmail(e.target.value)}
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
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />

                      <button
                        type="button"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Signing In..." : "Sign In"}
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
          </div>
        </div>
      </div>
    </div>
  );
}
