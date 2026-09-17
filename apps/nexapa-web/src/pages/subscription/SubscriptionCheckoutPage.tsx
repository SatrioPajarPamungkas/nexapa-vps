import { useCallback, useEffect, useRef, useState } from "react";

type Cycle = "monthly" | "yearly";

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

type CurrentSubscription = {
  active?: boolean;
  status?: string;
  plan?: {
    code: string;
    name: string;
    billing_cycle: Cycle;
  };
  expires_at?: string;
};

const API_BASE = (
  import.meta.env.VITE_NEXAPA_API_BASE_URL ||
  "https://api.nexapa.app/api/v1"
).replace(/\/+$/, "");

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function planDescription(plan: Plan) {
  const descriptions: Record<string, string> = {
    starter:
      "A starter plan for individuals and businesses beginning with Nexapa.",
    pro:
      "A growth plan for teams that need more capacity and publishing tools.",
    business:
      "A complete plan for businesses with larger operational requirements.",
  };

  return descriptions[plan.code.toLowerCase()]
    ?? plan.description
    ?? "Nexapa Publisher service plan.";
}

function cookie(name: string) {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)"),
  );

  return match ? decodeURIComponent(match[1]) : "";
}

function midtransUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    const validHost =
      url.hostname === "midtrans.com" ||
      url.hostname.endsWith(".midtrans.com");

    return url.protocol === "https:" && validHost
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function json<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const origin = new URL(API_BASE).origin;

    await fetch(`${origin}/sanctum/csrf-cookie`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    headers.set("Content-Type", "application/json");

    const token = cookie("XSRF-TOKEN");
    if (token) headers.set("X-XSRF-TOKEN", token);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const body = await response.json().catch(() => null) as {
    message?: string;
    errors?: Record<string, string[]>;
  } | null;

  if (!response.ok) {
    const validation = body?.errors
      ? Object.values(body.errors)[0]?.[0]
      : null;

    throw new Error(
      validation ||
      body?.message ||
      "Payment request failed.",
    );
  }

  return body as T;
}

export function SubscriptionCheckoutPage() {
  const parameters = new URLSearchParams(
    window.location.search,
  );

  const requestedPlan = (
    parameters.get("plan") || ""
  ).toLowerCase();

  const requestedCycle =
    parameters.get("cycle") === "yearly"
      ? "yearly"
      : "monthly";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] =
    useState<Cycle>(requestedCycle);
  const [current, setCurrent] =
    useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState("");
  const [error, setError] = useState("");
  const automaticCheckoutStarted = useRef(false);

  useEffect(() => {
    Promise.all([
      json<{ data: Plan[] }>(
        "/subscription/plans?product=publisher",
      ),
      json<{ data: CurrentSubscription }>(
        "/subscription",
      ).catch(() => ({ data: {} })),
    ])
      .then(([catalog, subscription]) => {
        const matchingPlans = requestedPlan
          ? catalog.data.filter(
              plan =>
                plan.code.toLowerCase() === requestedPlan,
            )
          : catalog.data;

        setPlans(
          matchingPlans.length > 0
            ? matchingPlans
            : catalog.data,
        );
        setCurrent(subscription.data);
      })
      .catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Failed to load plans.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const checkout = useCallback(async (plan: Plan) => {
    setPaying(plan.code);
    setError("");

    try {
      const response = await json<{
        data: { redirect_url: string | null };
      }>("/subscription/checkout", {
        method: "POST",
        body: JSON.stringify({
          plan_code: plan.code,
          billing_cycle: cycle,
        }),
      });

      const redirectUrl = midtransUrl(response.data.redirect_url);

      if (!redirectUrl) {
        throw new Error(
          "The Midtrans payment URL is invalid.",
        );
      }

      window.location.assign(redirectUrl);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Checkout failed.";

      if (
        /unauthenticated|session.*not found|sesi.*tidak ditemukan/i.test(
          message,
        )
      ) {
        const returnTo =
          window.location.pathname +
          window.location.search;

        localStorage.setItem(
          "nexapa_subscription_return",
          returnTo,
        );

        window.location.assign(
          "/login?redirect=" +
          encodeURIComponent(returnTo),
        );

        return;
      }

      setError(message);
      setPaying("");
    }
  }, [cycle]);

  const selectedExists =
    requestedPlan !== "" &&
    plans.some(
      plan => plan.code.toLowerCase() === requestedPlan,
    );

  const visiblePlans = selectedExists
    ? plans.filter(
        plan =>
          plan.code.toLowerCase() === requestedPlan,
      )
    : plans;

  const selectedPlan = selectedExists
    ? visiblePlans[0]
    : null;

  useEffect(() => {
    if (
      loading ||
      !requestedPlan ||
      !selectedPlan ||
      automaticCheckoutStarted.current
    ) {
      return;
    }

    automaticCheckoutStarted.current = true;
    void checkout(selectedPlan);
  }, [checkout, loading, requestedPlan, selectedPlan]);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <a
              href="/"
              className="mb-5 inline-flex text-sm text-violet-300 hover:text-violet-200"
            >
              ← Back to Publisher
            </a>

            <h1 className="text-3xl font-bold">
              Nexapa Publisher Plans
            </h1>

            <p className="mt-2 max-w-2xl text-slate-400">
              Choose a plan and complete payment through Midtrans.
              Your plan activates automatically after a successful
              payment.
            </p>
          </div>

          <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-1">
            {(["monthly", "yearly"] as Cycle[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCycle(value)}
                  className={
                    "rounded-lg px-5 py-2 text-sm font-semibold " +
                    (
                      cycle === value
                        ? "bg-violet-600 text-white"
                        : "text-slate-400 hover:text-white"
                    )
                  }
                >
                  {value === "monthly"
                    ? "Monthly"
                    : "Yearly"}
                </button>
              ),
            )}
          </div>
        </div>

        {selectedPlan && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-700 bg-violet-950/50 p-4">
            <div>
              <p className="text-sm text-violet-300">
                Your selected plan
              </p>
              <p className="mt-1 text-lg font-bold">
                {selectedPlan.name} ·{" "}
                {cycle === "monthly"
                  ? "Monthly"
                  : "Yearly"}
              </p>
            </div>

            <a
              href="https://nexapa.app/pricing.html"
              className="rounded-lg border border-violet-600 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-900"
            >
              Change Plan
            </a>
          </div>
        )}

        {current?.active && (
          <div className="mb-6 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm text-emerald-200">
            Active plan:{" "}
            <strong>
              {current.plan?.name || current.plan?.code}
            </strong>
            {current.expires_at
              ? ` · valid until ${new Date(
                  current.expires_at,
                ).toLocaleDateString("en-US")}`
              : ""}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            Loading plans...
          </div>
        ) : (
          <div
            className={
              visiblePlans.length === 1
                ? "mx-auto grid w-full max-w-md gap-5"
                : "grid gap-5 md:grid-cols-3"
            }
          >
            {visiblePlans.map((plan) => {
              const normal =
                cycle === "monthly"
                  ? plan.monthly_price
                  : plan.yearly_price;

              const finalPrice =
                cycle === "monthly"
                  ? plan.monthly_final_price
                  : plan.yearly_final_price;

              const promotion = finalPrice < normal;

              return (
                <article
                  key={plan.code}
                  className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
                >
                  <div className="mb-5">
                    <p className="text-sm font-semibold uppercase tracking-wider text-violet-400">
                      Publisher
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {plan.name}
                    </h2>

                    <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                      {planDescription(plan)}
                    </p>
                  </div>

                  <div className="mb-6">
                    {promotion && (
                      <p className="text-sm text-slate-500 line-through">
                        {money(normal)}
                      </p>
                    )}

                    <p className="text-3xl font-bold">
                      {money(finalPrice)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      per{" "}
                      {cycle === "monthly"
                        ? "month"
                        : "year"}
                    </p>
                  </div>

                  <ul className="mb-7 flex-1 space-y-2 text-sm text-slate-300">
                    {Object.entries(plan.limits)
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <li key={key}>
                          ✓ {key.replaceAll("_", " ")}:{" "}
                          <strong>{value}</strong>
                        </li>
                      ))}
                  </ul>

                  <button
                    type="button"
                    disabled={Boolean(paying)}
                    onClick={() => checkout(plan)}
                    className="rounded-xl bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {paying === plan.code
                      ? "Creating payment..."
                      : "Pay with Midtrans"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
