import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  PanelsTopLeft,
  RefreshCw,
  Search,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getConnectedAccounts,
  getConnectedAccountsPaginated,
  type ConnectedAccount,
} from "@/lib/api/connected-accounts";

export function FacebookPagesPage() {
  const { accountId = "" } = useParams();
  const navigate = useNavigate();

  const [admin, setAdmin] = useState<ConnectedAccount | null>(null);
  const [pages, setPages] = useState<ConnectedAccount[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(null);

    try {
      const [accounts, pageResponse] = await Promise.all([
        getConnectedAccounts(signal),
        getConnectedAccountsPaginated({
          platform: "facebook",
          account_type: "facebook_page",
          parent_connected_account_id: accountId,
          per_page: 100,
          signal,
        }),
      ]);

      const parent = accounts.find(
        (account) =>
          account.id === accountId &&
          account.platform === "facebook" &&
          account.account_type === "facebook_admin",
      );

      if (!parent) {
        throw new Error("Facebook Admin account tidak ditemukan.");
      }

      setAdmin(parent);
      setPages(pageResponse.data ?? []);
    } catch (reason) {
      if (signal?.aborted) return;

      setError(
        reason instanceof Error
          ? reason.message
          : "Gagal mengambil Facebook Page.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [accountId]);

  const filteredPages = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return pages;

    return pages.filter((page) =>
      [
        page.display_name,
        page.username,
        page.external_account_id,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(keyword),
        ),
    );
  }, [pages, search]);

  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow="FACEBOOK"
        title={admin?.display_name ?? "Facebook Pages"}
        description="Seluruh Facebook Page yang dikelola oleh akun ini."
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/accounts"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 text-[13px] font-medium text-slate-800 backdrop-blur-xl hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Accounts
            </Link>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 rounded-2xl border border-white/20 bg-white/12 p-4 shadow-sm backdrop-blur-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-slate-950">
                Managed Pages
              </p>
              <p className="mt-1 text-[12px] text-slate-600">
                {pages.length} Facebook Page tersinkronisasi.
              </p>
            </div>

            <label className="relative block w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nama, username, atau Page ID..."
                className="h-10 w-full rounded-xl border border-white/25 bg-white/20 pl-10 pr-4 text-[13px] text-slate-900 outline-none backdrop-blur-xl placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl"
              />
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/25 bg-white/10 px-6 py-16 text-center backdrop-blur-xl">
            <PanelsTopLeft className="mx-auto h-10 w-10 text-blue-600" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              Facebook Page tidak ditemukan
            </h2>
            <p className="mt-2 text-[13px] text-slate-600">
              Jalankan Reconnect &amp; Sync Pages jika Page belum
              tampil.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() =>
                  navigate(
                    `/accounts/facebook/${accountId}/pages/${page.id}/insights`,
                  )
                }
                className="group rounded-2xl border border-white/20 bg-white/12 p-5 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-blue-400/35 hover:bg-white/20 hover:shadow-xl"
              >
                <div className="flex items-start gap-4">
                  {page.avatar_url ? (
                    <img
                      src={page.avatar_url}
                      alt=""
                      className="h-14 w-14 rounded-2xl object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                      <PanelsTopLeft className="h-7 w-7" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-slate-950">
                      {page.display_name}
                    </h2>

                    <p className="mt-1 truncate text-[12px] text-slate-600">
                      {page.username
                        ? `@${page.username}`
                        : `Page ID: ${page.external_account_id}`}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                          page.status === "connected"
                            ? "bg-emerald-500/15 text-emerald-800"
                            : "bg-amber-500/15 text-amber-800"
                        }`}
                      >
                        {page.status}
                      </span>

                      {page.is_publishable && (
                        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-medium text-blue-800">
                          Publishable
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
                  <span className="text-[12px] text-slate-600">
                    Lihat performa Page
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-700">
                    <BarChart3 className="h-4 w-4" />
                    View Insights
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
