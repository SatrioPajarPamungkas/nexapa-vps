import { Outlet } from "react-router-dom";
import {
  ArrowUpRight,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7fc] text-slate-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.42]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(83,113,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(83,113,255,0.055) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "linear-gradient(to bottom right, black, transparent 72%)",
        }}
      />

      <div
        className="pointer-events-none absolute -left-44 -top-44 h-[520px] w-[520px] rounded-full bg-blue-500/20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-52 left-[35%] h-[520px] w-[520px] rounded-full bg-cyan-400/15 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-48 top-1/3 h-[440px] w-[440px] rounded-full bg-indigo-400/15 blur-[130px]"
        aria-hidden="true"
      />

      <div className="relative grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[#071126] px-10 py-9 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 15% 12%, rgba(83,113,255,.34), transparent 28%), radial-gradient(circle at 88% 82%, rgba(56,182,255,.20), transparent 30%), linear-gradient(145deg, rgba(255,255,255,.035), transparent 50%)",
            }}
          />

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.10]"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
              backgroundSize: "52px 52px",
              maskImage:
                "linear-gradient(to bottom, black, transparent 82%)",
            }}
          />

          <header className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
              <img
                src="/assets/branding/nexapa-app-logo.svg"
                alt=""
                className="h-7 w-7"
              />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[0.22em]">
                NEXAPA
              </p>
              <p className="mt-0.5 text-[10px] tracking-[0.16em] text-slate-400">
                DIGITAL WORKSPACE
              </p>
            </div>
          </header>

          <main className="relative max-w-[620px] py-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/10 px-3.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-blue-100 backdrop-blur-xl">
              <Sparkles
                className="h-3.5 w-3.5 text-cyan-300"
                aria-hidden="true"
              />
              CONNECTED BUSINESS OPERATIONS
            </div>

            <h1 className="mt-7 max-w-[590px] text-[42px] font-semibold leading-[1.08] tracking-[-0.035em] xl:text-[50px]">
              Operasikan bisnis dalam satu ruang kerja yang terhubung.
            </h1>

            <p className="mt-6 max-w-[540px] text-[15px] leading-7 text-slate-300">
              Kelola publikasi, pelanggan, komunikasi, automasi,
              dan insight AI melalui ekosistem Nexapa yang aman,
              terukur, dan siap berkembang.
            </p>

            <div className="mt-10 grid max-w-[570px] grid-cols-2 gap-3">
              <div className="group rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl transition duration-300 hover:border-blue-300/25 hover:bg-white/[0.08]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-400/15 text-blue-200">
                  <ShieldCheck
                    className="h-[18px] w-[18px]"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-[13px] font-semibold">
                  Aman dan terkendali
                </p>
                <p className="mt-1.5 text-[12px] leading-5 text-slate-400">
                  Akses, data, dan operasional berada dalam sistem
                  yang terstruktur.
                </p>
              </div>

              <div className="group rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl transition duration-300 hover:border-cyan-300/25 hover:bg-white/[0.08]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/15 text-cyan-200">
                  <Layers
                    className="h-[18px] w-[18px]"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-[13px] font-semibold">
                  Satu ekosistem
                </p>
                <p className="mt-1.5 text-[12px] leading-5 text-slate-400">
                  Publisher, CRM, WhatsApp, automasi, dan AI bekerja
                  dalam satu alur.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-[12px] text-slate-400">
              <span>Teknologi untuk bisnis yang bergerak</span>
              <ArrowUpRight
                className="h-3.5 w-3.5 text-blue-300"
                aria-hidden="true"
              />
            </div>
          </main>

          <footer className="relative flex items-center justify-between border-t border-white/[0.08] pt-5 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} Nexapa</span>
            <span>PT Deaji Anggayuh Trisna</span>
          </footer>
        </section>

        <section className="relative flex min-h-screen flex-col">
          <div className="absolute left-5 top-5 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/80 shadow-sm backdrop-blur-xl">
              <img
                src="/assets/branding/nexapa-app-logo.svg"
                alt="Nexapa"
                className="h-6 w-6"
              />
            </div>
            <span className="text-[13px] font-semibold tracking-[0.18em] text-slate-900">
              NEXAPA
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-20 sm:px-8 lg:px-12 xl:px-16">
            <div className="w-full max-w-[460px]">
              <Outlet />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
