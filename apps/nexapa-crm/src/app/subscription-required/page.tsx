import Link from "next/link"
import { LogoutButton } from "./logout-button"

type PageProps = {
  searchParams: Promise<{
    status?: string
    expires_at?: string
  }>
}

export default async function SubscriptionRequiredPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const status = params.status ?? "missing"

  const content = {
    expired: {
      title: "Masa langganan berakhir",
      description:
        "Perpanjang paket Nexapa untuk kembali menggunakan CRM, WhatsApp, automasi, dan AI.",
    },
    suspended: {
      title: "Langganan sedang disuspend",
      description:
        "Akses workspace dihentikan sementara. Hubungi Nexapa untuk mendapatkan bantuan.",
    },
    cancelled: {
      title: "Langganan telah dibatalkan",
      description:
        "Aktifkan kembali paket Nexapa agar workspace dapat digunakan.",
    },
    unavailable: {
      title: "Verifikasi paket sedang bermasalah",
      description:
        "Sistem belum dapat memverifikasi langganan. Silakan coba kembali beberapa saat lagi.",
    },
    missing: {
      title: "Paket Nexapa belum aktif",
      description:
        "Pilih paket untuk mengaktifkan CRM, Publisher, WhatsApp, dan AI.",
    },
  }[status] ?? {
    title: "Langganan tidak aktif",
    description:
      "Hubungi Nexapa untuk memeriksa status paket Anda.",
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          Status langganan
        </div>

        <h1 className="text-3xl font-bold">
          {content.title}
        </h1>

        <p className="mt-4 leading-7 text-slate-400">
          {content.description}
        </p>

        {params.expires_at && (
          <p className="mt-4 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
            Masa aktif sebelumnya:{" "}
            {new Intl.DateTimeFormat("id-ID", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "Asia/Jakarta",
            }).format(new Date(params.expires_at))}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="https://nexapa.app/pricing.html"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Lihat paket
          </Link>

          <Link
            href="https://nexapa.app/contact.html?service=subscription"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Hubungi Nexapa
          </Link>

          <LogoutButton />
        </div>
      </section>
    </main>
  )
}
