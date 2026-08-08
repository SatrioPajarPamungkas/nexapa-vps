import { Outlet } from "react-router-dom";
import { Layers, Shield, Sparkles } from "lucide-react";

export function AuthLayout() {
  return (
    <div
      className="min-h-screen w-full overflow-x-hidden relative"
      style={{
        backgroundImage: "url('/assets/backgrounds/wp-login.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr] relative">
        <div className="relative hidden flex-col justify-between p-10 text-white lg:flex">
          <div className="relative">
            <div className="flex items-center gap-3">
              <img src="/assets/branding/nexapa-app-logo.svg" alt="Nexapa" className="h-9 w-auto" />
            </div>
          </div>

          <div className="relative max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              MEDIA WORKFLOW PLATFORM
            </div>
            <h1 className="mt-6 text-[32px] font-semibold leading-[1.1] tracking-tight">
              Media operations, publishing, and affiliate — in one workspace.
            </h1>
            <p className="mt-4 text-[14px] leading-6 text-slate-300">
              Nexapa will centralize downloader, library, connected accounts,
              publisher, scheduler, and affiliate workflows. Current build
              provides the authenticated shell only. No backend is connected yet.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/30">
                  <Shield className="h-4 w-4" />
                </div>
                <p className="mt-3 text-[13px] font-medium text-white">
                  Secure by design
                </p>
                <p className="mt-1 text-[12px] leading-5 text-slate-400">
                  No credentials stored in localStorage. API boundary reserved.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30">
                  <Layers className="h-4 w-4" />
                </div>
                <p className="mt-3 text-[13px] font-medium text-white">
                  Modular workspace
                </p>
                <p className="mt-1 text-[12px] leading-5 text-slate-400">
                  Desktop, tablet, and mobile adaptive shell.
                </p>
              </div>
            </div>
          </div>

          <div className="relative text-[11px] text-slate-400">
            © {new Date().getFullYear()} Nexapa
          </div>
        </div>

        <div className="flex min-h-screen flex-col">
          <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
