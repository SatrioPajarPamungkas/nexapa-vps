import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type {
  InboxNotification,
  NotificationListMeta,
} from "@/lib/api/notifications";

type InboxFilter = "all" | "unread";

const EMPTY_META: NotificationListMeta = {
  current_page: 1,
  per_page: 20,
  total: 0,
};

function formatDate(value: string | null): string {
  if (!value) return "Unknown time";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getMessagePreview(message: string): string {
  const normalized = message.trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 180)}…`;
}

function dispatchNotificationsUpdated(): void {
  window.dispatchEvent(
    new CustomEvent("nexapa:notifications-updated"),
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [meta, setMeta] = useState<NotificationListMeta>(EMPTY_META);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadInbox = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const [listResponse, unreadCount] = await Promise.all([
          getNotifications({
            unread: filter === "unread",
            page,
            per_page: 20,
            signal,
          }),
          getUnreadNotificationCount(signal),
        ]);

        setNotifications(listResponse.data ?? []);
        setMeta(listResponse.meta ?? EMPTY_META);
        setUnreadTotal(unreadCount);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load your inbox.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [filter, page],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadInbox(controller.signal);

    return () => controller.abort();
  }, [loadInbox]);

  useEffect(() => {
    if (!statusMessage) return;

    const timer = window.setTimeout(() => {
      setStatusMessage(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const totalPages = useMemo(() => {
    if (meta.per_page < 1) return 1;

    return Math.max(1, Math.ceil(meta.total / meta.per_page));
  }, [meta.per_page, meta.total]);

  const handleFilterChange = (nextFilter: InboxFilter) => {
    if (nextFilter === filter) return;

    setFilter(nextFilter);
    setPage(1);
    setExpandedId(null);
  };

  const handleOpenNotification = async (notification: InboxNotification) => {
    const willOpen = expandedId !== notification.id;

    setExpandedId(willOpen ? notification.id : null);

    if (!willOpen || notification.read_at) {
      return;
    }

    try {
      const updated = await markNotificationRead(notification.id);

      setNotifications((current) => {
        const next = current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: updated.read_at }
            : item,
        );

        return filter === "unread"
          ? next.filter((item) => item.id !== notification.id)
          : next;
      });

      if (filter === "unread") {
        setExpandedId(null);
        setMeta((current) => ({
          ...current,
          total: Math.max(0, current.total - 1),
        }));
      }

      setUnreadTotal((current) => Math.max(0, current - 1));
      dispatchNotificationsUpdated();
    } catch {
      // Keep the notification open even when marking it read fails.
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadTotal === 0) return;

    setMarkingAll(true);
    setError(null);

    try {
      await markAllNotificationsRead();

      const readAt = new Date().toISOString();

      if (filter === "unread") {
        setNotifications([]);
        setMeta((current) => ({
          ...current,
          total: 0,
        }));
        setExpandedId(null);
      } else {
        setNotifications((current) =>
          current.map((item) =>
            item.read_at ? item : { ...item, read_at: readAt },
          ),
        );
      }

      setUnreadTotal(0);
      setStatusMessage("All notifications marked as read.");
      dispatchNotificationsUpdated();
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Failed to mark notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleActionUrl = (actionUrl: string) => {
    if (actionUrl.startsWith("/")) {
      navigate(actionUrl);
      return;
    }

    if (/^https?:\/\//i.test(actionUrl)) {
      window.open(actionUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow="ACCOUNT"
        title="Inbox"
        description="Notifications and messages from Nexapa administrators."
        actions={
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={loading || markingAll || unreadTotal === 0}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 text-[13px] font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        }
      />

      <div className="mx-auto max-w-[1100px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex w-fit rounded-xl border border-white/20 bg-white/10 p-1"
            role="group"
            aria-label="Inbox filter"
          >
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === "all"
                  ? "bg-white/90 text-navy-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/30"
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange("unread")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === "unread"
                  ? "bg-white/90 text-navy-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/30"
              }`}
            >
              Unread
              {unreadTotal > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </span>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            {meta.total} {meta.total === 1 ? "message" : "messages"}
          </p>
        </div>

        <div aria-live="polite">
          {statusMessage && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-400/25 bg-emerald-400/15 px-4 py-3 text-sm text-emerald-900 backdrop-blur-xl"
            >
              {statusMessage}
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-red-800 backdrop-blur-xl"
          >
            <p className="text-sm font-medium">{error}</p>

            <button
              type="button"
              onClick={() => void loadInbox()}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-red-400/30 bg-white/40 px-4 text-sm font-medium transition hover:bg-white/60"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl"
              />
            ))}
          </div>
        ) : !error && notifications.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 text-center backdrop-blur-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30 text-slate-600">
              <BellRing className="h-6 w-6" aria-hidden="true" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-navy-900">
              {filter === "unread"
                ? "You have no unread notifications."
                : "Your inbox is empty."}
            </h2>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Messages sent by Nexapa administrators will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const expanded = expandedId === notification.id;
              const unread = notification.read_at === null;

              return (
                <article
                  key={notification.id}
                  className={`overflow-hidden rounded-2xl border backdrop-blur-xl transition ${
                    unread
                      ? "border-blue-400/30 bg-white/85 shadow-[0_12px_35px_rgba(37,99,235,0.10)]"
                      : "border-white/20 bg-white/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void handleOpenNotification(notification)
                    }
                    aria-expanded={expanded}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left sm:px-5"
                  >
                    <span className="mt-2 flex h-3 w-3 shrink-0 items-center justify-center">
                      {unread && (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-blue-500"
                          aria-label="Unread"
                        />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <h2 className="break-words text-sm font-semibold text-navy-900">
                          {notification.subject || "Notification"}
                        </h2>

                        <time className="shrink-0 text-xs text-slate-500">
                          {formatDate(notification.created_at)}
                        </time>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        From{" "}
                        {notification.sender?.name?.trim() ||
                          "Administrator"}
                      </p>

                      {!expanded && (
                        <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                          {getMessagePreview(notification.message)}
                        </p>
                      )}
                    </div>

                    {expanded ? (
                      <ChevronUp
                        className="mt-1 h-4 w-4 shrink-0 text-slate-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronDown
                        className="mt-1 h-4 w-4 shrink-0 text-slate-500"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {expanded && (
                    <div className="border-t border-white/30 px-5 py-4 sm:pl-12">
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                        {notification.message}
                      </p>

                      {notification.action_url && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleActionUrl(notification.action_url!);
                          }}
                          className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          <ExternalLink
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          Open link
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/20 px-3 text-sm font-medium text-slate-700 transition hover:bg-white/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </button>

            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/20 px-3 text-sm font-medium text-slate-700 transition hover:bg-white/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
