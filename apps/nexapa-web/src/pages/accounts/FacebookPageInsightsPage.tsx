import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  FileText,
  Heart,
  LoaderCircle,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getFacebookPageInsights,
  type FacebookPageInsights,
} from "@/lib/api/connected-accounts";

type Days = 7 | 28 | 90;

const formatter = new Intl.NumberFormat("id-ID");

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Eye;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/12 p-5 shadow-sm backdrop-blur-2xl">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-[12px] font-medium text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
        {formatter.format(value)}
      </p>
    </div>
  );
}

function InsightChart({
  data,
}: {
  data: FacebookPageInsights["series"];
}) {
  const width = 900;
  const height = 260;
  const padding = 28;

  const points = useMemo(() => {
    if (data.length === 0) return "";

    const maximum = Math.max(
      ...data.map((point) => point.views),
      1,
    );

    return data
      .map((point, index) => {
        const x =
          data.length === 1
            ? width / 2
            : padding +
              (index / (data.length - 1)) *
                (width - padding * 2);

        const y =
          height -
          padding -
          (point.views / maximum) *
            (height - padding * 2);

        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-[13px] text-slate-500">
        Belum ada data tayangan untuk periode ini.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[700px]"
        role="img"
        aria-label="Grafik tayangan Facebook Page"
      >
        {[0.25, 0.5, 0.75, 1].map((position) => (
          <line
            key={position}
            x1={padding}
            x2={width - padding}
            y1={height * position}
            y2={height * position}
            stroke="rgba(100,116,139,.18)"
            strokeDasharray="5 7"
          />
        ))}

        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) => {
          const coordinates = points
            .split(" ")[index]
            ?.split(",");

          if (!coordinates) return null;

          return (
            <circle
              key={point.date}
              cx={coordinates[0]}
              cy={coordinates[1]}
              r="4"
              fill="#2563eb"
            >
              <title>
                {point.date}: {formatter.format(point.views)} tayangan
              </title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

export function FacebookPageInsightsPage() {
  const { accountId = "", pageId = "" } = useParams();
  const [days, setDays] = useState<Days>(28);
  const [data, setData] =
    useState<FacebookPageInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    getFacebookPageInsights(
      pageId,
      days,
      controller.signal,
    )
      .then(setData)
      .catch((reason) => {
        if (controller.signal.aborted) return;

        setError(
          reason instanceof Error
            ? reason.message
            : "Gagal mengambil Facebook Insights.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [pageId, days]);

  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow="FACEBOOK INSIGHTS"
        title={data?.page.display_name ?? "Page Insights"}
        description={
          data
            ? `${data.period.since} — ${data.period.until}`
            : "Performa dan jangkauan Facebook Page."
        }
        actions={
          <Link
            to={`/accounts/facebook/${accountId}/pages`}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 text-[13px] font-medium text-slate-800 backdrop-blur-xl hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            All Pages
          </Link>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex justify-end">
          <div className="inline-flex rounded-xl border border-white/20 bg-white/12 p-1 backdrop-blur-xl">
            {([7, 28, 90] as Days[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setDays(period)}
                className={`rounded-lg px-4 py-2 text-[12px] font-semibold transition ${
                  days === period
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white/20"
                }`}
              >
                {period} days
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-center">
            <BarChart3 className="mx-auto h-9 w-9 text-red-600" />
            <h2 className="mt-3 font-semibold text-red-900">
              Insight tidak dapat dimuat
            </h2>
            <p className="mt-2 text-[13px] text-red-800">
              {error}
            </p>
            <p className="mt-3 text-[12px] text-red-700">
              Jalankan Reconnect &amp; Sync Pages untuk memberikan
              izin read_insights.
            </p>
          </div>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Tayangan"
                value={data.summary.views}
                icon={Eye}
                tone="bg-blue-500/15 text-blue-700"
              />
              <MetricCard
                label="Engagement"
                value={data.summary.engagements}
                icon={Heart}
                tone="bg-rose-500/15 text-rose-700"
              />
              <MetricCard
                label="Followers"
                value={data.summary.followers}
                icon={Users}
                tone="bg-emerald-500/15 text-emerald-700"
              />
              <MetricCard
                label="Total Post"
                value={data.summary.posts}
                icon={FileText}
                tone="bg-violet-500/15 text-violet-700"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/20 bg-white/12 p-5 shadow-sm backdrop-blur-2xl">
              <div className="mb-4">
                <h2 className="text-[15px] font-semibold text-slate-950">
                  Tayangan Harian
                </h2>
                <p className="mt-1 text-[12px] text-slate-600">
                  Jumlah konten Page diputar atau ditampilkan setiap
                  hari.
                </p>
              </div>

              <InsightChart data={data.series} />
            </div>

            {data.warnings.length > 0 && (
              <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-[12px] text-amber-900">
                Sebagian metrik tidak tersedia dari Meta. Data yang
                berhasil diambil tetap ditampilkan.
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
