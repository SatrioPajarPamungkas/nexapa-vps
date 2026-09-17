import {
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  LoaderCircle,
  PackageCheck,
  X,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";

export type PublisherSubscription = {
  is_admin?: boolean;
  active?: boolean;
  status?: string;
  plan?: {
    code: string;
    name: string;
    billing_cycle: "monthly" | "yearly";
    price_paid?: number;
  };
  expires_at?: string;
};

type Plan = {
  code: string;
  name: string;
  description: string | null;
  monthly_price: number;
  monthly_final_price: number;
  yearly_price: number;
  yearly_final_price: number;
  limits: Record<string, number>;
};

type Envelope<T> = {
  data: T;
};

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function usePublisherSubscription() {
  const [data, setData] =
    useState<PublisherSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    apiGet<Envelope<PublisherSubscription>>(
      "/subscription",
      controller.signal,
    )
      .then((response) => {
        if (mounted) setData(response.data);
      })
      .catch((caught) => {
        if (
          mounted &&
          !(caught instanceof DOMException &&
            caught.name === "AbortError")
        ) {
          setError("Status paket gagal dimuat.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return { data, loading, error };
}

export function PublisherPlanMenuItem({
  onClick,
}: {
  onClick: () => void;
}) {
  const { data, loading } = usePublisherSubscription();
  const admin = Boolean(data?.is_admin);
  const active = admin || Boolean(data?.active);

  return (
    <button
      type="button"
      disabled={admin}
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-white/25 bg-blue-50/60 px-4 py-3 text-left transition hover:bg-blue-100/70 disabled:cursor-default"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <PackageCheck className="h-4 w-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-900">
          Paket Publisher
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-600">
          {loading
            ? "Memuat status..."
            : admin
              ? "Akses administrator"
              : `${data?.plan?.name || "Tanpa paket"} · ${
                  active ? "Aktif" : "Belum aktif"
                }`}
        </span>
      </span>

      {!admin && (
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-blue-700">
          Kelola
        </span>
      )}
    </button>
  );
}

export function SubscriptionUpgradeModal({
  open,
  onClose,
  current,
}: {
  open: boolean;
  onClose: () => void;
  current: PublisherSubscription | null;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] =
    useState<"monthly" | "yearly">(
      current?.plan?.billing_cycle || "monthly",
    );
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let mounted = true;

    setLoading(true);
    setError("");

    apiGet<Envelope<Plan[]>>(
      "/subscription/plans?product=publisher",
      controller.signal,
    )
      .then((response) => {
        if (mounted) setPlans(response.data);
      })
      .catch(() => {
        if (mounted) {
          setError("Pilihan paket gagal dimuat.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () =>
      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
  }, [open, onClose]);

  if (!open) return null;

  const rank: Record<string, number> = {
    starter: 1,
    pro: 2,
    business: 3,
  };

  const currentCode =
    current?.plan?.code?.toLowerCase() || "";
  const currentRank = rank[currentCode] || 0;
  const active = Boolean(current?.active);

  let availablePlans = active
    ? plans.filter(
        (plan) =>
          (rank[plan.code.toLowerCase()] || 0) >
          currentRank,
      )
    : plans;

  const highestPlan =
    active && availablePlans.length === 0;

  if (highestPlan) {
    availablePlans = plans.filter(
      (plan) =>
        plan.code.toLowerCase() === currentCode,
    );
  }

  async function checkout(plan: Plan) {
    if (paying) return;

    setPaying(plan.code);
    setError("");

    try {
      const response = await apiPost<
        Envelope<{ redirect_url: string | null }>
      >("/subscription/checkout", {
        plan_code: plan.code,
        billing_cycle: cycle,
      });

      if (!response.data.redirect_url) {
        throw new Error();
      }

      window.location.assign(
        response.data.redirect_url,
      );
    } catch {
      setError(
        "Pembayaran gagal disiapkan. Silakan coba lagi.",
      );
      setPaying("");
    }
  }

  const handleBackdrop = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kelola paket Publisher"
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
    >
      <section
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/50 bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Paket Publisher
            </div>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {active
                ? "Upgrade paket"
                : "Pilih paket"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Paket aktif:{" "}
              <strong className="text-slate-800">
                {current?.plan?.name || "Belum ada"}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={
              "rounded-lg px-5 py-2 text-sm font-semibold " +
              (cycle === "monthly"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-600")
            }
          >
            Bulanan
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={
              "rounded-lg px-5 py-2 text-sm font-semibold " +
              (cycle === "yearly"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-600")
            }
          >
            Tahunan
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {availablePlans.map((plan) => {
              const regular =
                cycle === "monthly"
                  ? plan.monthly_price
                  : plan.yearly_price;
              const finalPrice =
                cycle === "monthly"
                  ? plan.monthly_final_price
                  : plan.yearly_final_price;
              const promo = finalPrice < regular;
              const renewing =
                plan.code.toLowerCase() === currentCode;

              return (
                <article
                  key={plan.code}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-slate-900">
                      {plan.name}
                    </h3>
                    {promo && (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">
                        PROMO
                      </span>
                    )}
                  </div>

                  <p className="mt-2 min-h-10 text-sm text-slate-500">
                    {plan.description ||
                      "Paket Nexapa Publisher."}
                  </p>

                  {promo && (
                    <div className="mt-5 text-sm text-slate-400 line-through">
                      {money(regular)}
                    </div>
                  )}

                  <div
                    className={
                      promo
                        ? "text-2xl font-bold text-blue-700"
                        : "mt-5 text-2xl font-bold text-slate-900"
                    }
                  >
                    {money(finalPrice)}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    per{" "}
                    {cycle === "monthly"
                      ? "bulan"
                      : "tahun"}
                  </div>

                  <ul className="mt-5 flex-1 space-y-2">
                    {Object.entries(plan.limits)
                      .slice(0, 5)
                      .map(([key, value]) => (
                        <li
                          key={key}
                          className="flex items-center gap-2 text-xs text-slate-600"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          {key.replaceAll("_", " ")}:{" "}
                          <strong>{value}</strong>
                        </li>
                      ))}
                  </ul>

                  <button
                    type="button"
                    disabled={Boolean(paying)}
                    onClick={() => checkout(plan)}
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {paying === plan.code
                      ? "Menyiapkan pembayaran..."
                      : renewing
                        ? `Perpanjang ${plan.name}`
                        : `Upgrade ke ${plan.name}`}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
