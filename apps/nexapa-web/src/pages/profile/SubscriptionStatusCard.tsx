import { useState } from "react";
import {
  CalendarClock,
  LoaderCircle,
  PackageCheck,
} from "lucide-react";
import {
  SubscriptionUpgradeModal,
  usePublisherSubscription,
} from "@/features/subscription/PublisherSubscriptionManager";

function formatDate(value?: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function remainingDays(value?: string) {
  if (!value) return null;

  return Math.max(
    0,
    Math.ceil(
      (new Date(value).getTime() - Date.now()) /
        86_400_000,
    ),
  );
}

export function SubscriptionStatusCard() {
  const { data, loading, error } =
    usePublisherSubscription();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return (
      <section className="flex min-h-32 items-center justify-center rounded-2xl border border-white/30 bg-white/80">
        <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
      </section>
    );
  }

  const admin = Boolean(data?.is_admin);
  const active = admin || Boolean(data?.active);
  const days = remainingDays(data?.expires_at);

  return (
    <>
      <section className="rounded-2xl border border-white/30 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <PackageCheck className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Paket Publisher
              </h2>
              <span
                className={
                  "rounded-full px-2.5 py-1 text-xs font-semibold " +
                  (active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700")
                }
              >
                {admin
                  ? "Administrator"
                  : active
                    ? "Aktif"
                    : data?.status === "expired"
                      ? "Berakhir"
                      : "Belum aktif"}
              </span>
            </div>

            {error ? (
              <p className="mt-2 text-sm text-rose-600">
                {error}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <strong className="text-slate-900">
                  {admin
                    ? "Akses penuh"
                    : data?.plan?.name || "Tanpa paket"}
                </strong>

                {data?.plan?.billing_cycle && (
                  <span>
                    {data.plan.billing_cycle === "yearly"
                      ? "Tahunan"
                      : "Bulanan"}
                  </span>
                )}

                {data?.expires_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4" />
                    Berakhir {formatDate(data.expires_at)}
                    {days !== null &&
                      ` · ${days} hari tersisa`}
                  </span>
                )}
              </div>
            )}
          </div>

          {!admin && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Kelola paket
            </button>
          )}
        </div>
      </section>

      <SubscriptionUpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        current={data}
      />
    </>
  );
}
