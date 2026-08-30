import { useState, useEffect } from "react";
import { Eye, EyeOff, Info, Layers, Lock, Mail } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export function LoginPage() {
  const { login, loading, authenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (authenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authenticated, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password, remember);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
    }
  }


  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Layers className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-widest text-slate-900">
          NEXAPA
        </span>
      </div>

      <div className="rounded-2xl border border-white/30 bg-white/80 p-6 shadow-sm sm:p-8 backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center">
          <img src="/assets/branding/nexapa-app-logo.svg" alt="Nexapa" className="h-10 w-auto mb-3" />
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Sign in
          </h1>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-5 text-red-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
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
                onChange={e => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              <button
                type="button"
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Forgot password?
              </button>
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
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="remember" className="text-[13px] text-slate-600">
                Remember me on this device
              </label>
            </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

        </form>

        <div className="mt-6 text-center text-[13px] text-slate-600">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-blue-600 hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
