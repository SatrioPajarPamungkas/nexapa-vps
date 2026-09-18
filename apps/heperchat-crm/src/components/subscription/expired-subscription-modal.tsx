"use client"

import { createBrowserClient } from "@supabase/ssr"
import {
  Check,
  Clock3,
  LogOut,
  Sparkles,
  Zap,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type BillingCycle = "monthly" | "yearly"

const plans = [
  {
    code: "starter",
    name: "Starter",
    description: "Untuk mulai mengelola bisnis.",
    monthly: 50000,
    yearly: 500000,
    ai: "50 penggunaan AI",
    features: [
      "1 pengguna",
      "3 akun media sosial",
      "1 nomor WhatsApp",
      "1.000 kontak CRM",
    ],
    accent: "border-blue-500/30",
    button: "bg-blue-600 hover:bg-blue-500",
  },
  {
    code: "pro",
    name: "Pro",
    description: "Untuk bisnis yang sedang berkembang.",
    monthly: 75000,
    yearly: 750000,
    ai: "300 penggunaan AI",
    features: [
      "5 pengguna",
      "10 akun media sosial",
      "1 nomor WhatsApp",
      "5.000 kontak CRM",
    ],
    accent: "border-violet-500/50",
    button: "bg-violet-600 hover:bg-violet-500",
    popular: true,
  },
  {
    code: "business",
    name: "Business",
    description: "Untuk tim dan operasional besar.",
    monthly: 100000,
    yearly: 1000000,
    ai: "1.000 penggunaan AI",
    features: [
      "15 pengguna",
      "30 akun media sosial",
      "3 nomor WhatsApp",
      "25.000 kontak CRM",
    ],
    accent: "border-emerald-500/30",
    button: "bg-emerald-600 hover:bg-emerald-500",
  },
] as const

function readCookie(name: string): string | null {
  const prefix = `${name}=`

  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix))

  return value
    ? decodeURIComponent(value.substring(prefix.length))
    : null
}

function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function ExpiredSubscriptionModal() {
  const [expired, setExpired] = useState(false)
  const [billing, setBilling] =
    useState<BillingCycle>("monthly")
  const [loggingOut, setLoggingOut] = useState(false)
  const [expiresAt, setExpiresAt] =
    useState<string | null>(null)

  useEffect(() => {
    const status = readCookie(
      "nexapa_subscription_status"
    )

    const expiry = readCookie(
      "nexapa_subscription_expires_at"
    )

    setExpired(status === "expired")
    setExpiresAt(expiry)

    if (status === "expired") {
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const formattedExpiry = useMemo(() => {
    if (!expiresAt) {
      return null
    }

    const date = new Date(expiresAt)

    if (Number.isNaN(date.getTime())) {
      return null
    }

    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(date)
  }, [expiresAt])

  async function logout() {
    setLoggingOut(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (!expired) {
    return null
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-expired-title"
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/85 px-4 py-8 backdrop-blur-xl"
    >
      <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/60 sm:p-8">
          <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

          <header className="relative mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
              <Clock3 className="h-7 w-7" />
            </div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Masa langganan berakhir
            </div>

            <h1
              id="subscription-expired-title"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Pilih paket untuk melanjutkan
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Workspace dan data Anda tetap aman. Aktifkan
              kembali paket untuk menggunakan Nexapa CRM,
              Publisher, WhatsApp, automasi, dan AI.
            </p>

            {formattedExpiry && (
              <p className="mt-3 text-xs text-slate-500">
                Masa aktif sebelumnya: {formattedExpiry}
              </p>
            )}

            <div className="mx-auto mt-6 inline-flex rounded-full border border-slate-700 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billing === "monthly"
                    ? "bg-white text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Bulanan
              </button>

              <button
                type="button"
                onClick={() => setBilling("yearly")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billing === "yearly"
                    ? "bg-white text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Tahunan
                <span className="ml-2 text-[10px] text-emerald-500">
                  HEMAT 2 BULAN
                </span>
              </button>
            </div>
          </header>

          <div className="relative grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const price =
                billing === "yearly"
                  ? plan.yearly
                  : plan.monthly

              return (
                <article
                  key={plan.code}
                  className={`relative flex flex-col rounded-3xl border bg-slate-900/80 p-6 ${plan.accent}`}
                >
                  {"popular" in plan && plan.popular && (
                    <span className="absolute right-5 top-5 rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                      Paling populer
                    </span>
                  )}

                  <h2 className="text-xl font-bold text-white">
                    {plan.name}
                  </h2>

                  <p className="mt-2 min-h-10 text-sm text-slate-400">
                    {plan.description}
                  </p>

                  <div className="mt-5">
                    <strong className="text-3xl font-bold tracking-tight text-white">
                      {rupiah(price)}
                    </strong>

                    <span className="ml-1 text-sm text-slate-500">
                      /{billing === "yearly"
                        ? "tahun"
                        : "bulan"}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-950/70 px-3 py-2 text-sm font-medium text-violet-300">
                    <Zap className="h-4 w-4" />
                    {plan.ai} per bulan
                  </div>

                  <ul className="my-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-3 text-sm text-slate-300"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                        </span>

                        {feature}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={
                      "https://nexapa.app/pricing.html" +
                      `?plan=${plan.code}` +
                      `&billing=${billing}` +
                      "&source=crm-expired"
                    }
                    className={`mt-auto flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-bold text-white transition ${plan.button}`}
                  >
                    Pilih {plan.name}
                  </a>
                </article>
              )
            })}
          </div>

          <footer className="relative mt-7 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-center text-xs text-slate-500 sm:text-left">
              Butuh paket khusus? Hubungi tim Nexapa untuk
              menyesuaikan kebutuhan bisnis Anda.
            </p>

            <div className="flex items-center gap-3">
              <a
                href="https://nexapa.app/contact.html?service=subscription"
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Hubungi Nexapa
              </a>

              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
