import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useSchedulerWorkspace } from "@/features/scheduler/hooks/useSchedulerWorkspace";
import { SchedulerWorkspace } from "@/features/scheduler/components/SchedulerWorkspace";
import { SchedulePostDialog } from "@/features/scheduler/components/SchedulePostDialog";
import { ScheduleDetailsDialog } from "@/features/scheduler/components/ScheduleDetailsDialog";
import type { LocalSchedule, ScheduleFormValues, ScheduleDestinationDraft, ScheduleView } from "@/features/scheduler/scheduler.types";
import { getBrowserTimezone, formatDateKey, parseDateKey } from "@/features/scheduler/scheduler.utils";
import { DEFAULT_TIMEZONE_FALLBACK } from "@/features/scheduler/scheduler.constants";

export function SchedulerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const ws = useSchedulerWorkspace();

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [prefillValues, setPrefillValues] = useState<ScheduleFormValues | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const editingSchedule = useMemo(() => {
    if (!editingId) return null;
    return ws.schedules.find((s) => s.id === editingId) ?? null;
  }, [editingId, ws.schedules]);

  const detailsSchedule = useMemo(() => {
    if (!detailsId) return null;
    return ws.schedules.find((s) => s.id === detailsId) ?? null;
  }, [detailsId, ws.schedules]);

  // Publisher handoff detection
  const publisherHandoff = useMemo(() => {
    const state = location.state as Record<string, unknown> | null;
    if (!state) return null;
    const maybeTitle = typeof state["title"] === "string" ? (state["title"] as string).slice(0, 100) : "";
    const maybeCaption = typeof state["caption"] === "string" ? (state["caption"] as string) : "";
    const maybeMediaName = typeof state["mediaName"] === "string" ? (state["mediaName"] as string) : "";
    const maybePlatforms = Array.isArray(state["platforms"]) ? (state["platforms"] as string[]).filter((p) => ["tiktok", "facebook", "instagram", "youtube"].includes(p)) : [];
    const maybeDestIds = Array.isArray(state["destinationIds"]) ? (state["destinationIds"] as string[]) : [];
    const maybeDate = typeof state["date"] === "string" ? (state["date"] as string) : "";
    const maybeTime = typeof state["time"] === "string" ? (state["time"] as string) : "";
    const maybeTz = typeof state["timezone"] === "string" ? (state["timezone"] as string) : "";
    if (maybeTitle || maybeCaption || maybePlatforms.length > 0 || maybeDate) {
      return { title: maybeTitle, caption: maybeCaption, mediaName: maybeMediaName, platforms: maybePlatforms, destinationIds: maybeDestIds, date: maybeDate, time: maybeTime, timezone: maybeTz };
    }
    return null;
  }, [location.state]);

  const prefillForDialog: ScheduleFormValues | null = useMemo(() => {
    if (editingSchedule) return null;
    const source = prefillValues ?? publisherHandoff;
    if (!source) return null;
    const browserTz = ws.browserTimezone || getBrowserTimezone() || DEFAULT_TIMEZONE_FALLBACK;
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const defaultDate = formatDateKey(tomorrow);
    const date = (source as ScheduleFormValues).date ? (source as ScheduleFormValues).date : (publisherHandoff?.date && parseDateKey(publisherHandoff.date) ? publisherHandoff.date : defaultDate);
    const time = (source as ScheduleFormValues).time ? (source as ScheduleFormValues).time : (publisherHandoff?.time && /^\d{2}:\d{2}$/.test(publisherHandoff.time) ? publisherHandoff.time : "10:00");
    return {
      title: (source as ScheduleFormValues).title || publisherHandoff?.title || "",
      caption: (source as ScheduleFormValues).caption || publisherHandoff?.caption || "",
      mediaName: (source as ScheduleFormValues).mediaName || publisherHandoff?.mediaName || "",
      platforms: (source as ScheduleFormValues).platforms || publisherHandoff?.platforms || [],
      destinationIds: (source as ScheduleFormValues).destinationIds || publisherHandoff?.destinationIds || [],
      date,
      time,
      timezone: (source as ScheduleFormValues).timezone || publisherHandoff?.timezone || browserTz,
      notes: (source as ScheduleFormValues).notes || "",
      source: "publisher",
    };
  }, [publisherHandoff, prefillValues, ws.browserTimezone, editingSchedule]);

  const hasPublisherDraft = !!publisherHandoff;

  const handleOpenCreate = useCallback((date?: string, time?: string) => {
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    setEditingId(null);
    if (date || time) {
      const browserTz = ws.browserTimezone || getBrowserTimezone() || DEFAULT_TIMEZONE_FALLBACK;
      setPrefillValues({
        title: "", caption: "", mediaName: "", platforms: [], destinationIds: [],
        date: date || formatDateKey(new Date()),
        time: time || "10:00", timezone: browserTz, notes: "", source: "manual",
      });
    } else {
      setPrefillValues(null);
    }
    setShowCreateDialog(true);
  }, [ws.browserTimezone]);

  const handleOpenEdit = useCallback((id: string) => {
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    setEditingId(id);
    setPrefillValues(null);
    setShowCreateDialog(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setShowCreateDialog(false);
    setEditingId(null);
    setPrefillValues(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  }, []);

  const handleOpenDetails = useCallback((id: string) => {
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    setDetailsId(id);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsId(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  }, []);

  const handleSave = useCallback(
    (values: ScheduleFormValues, destDrafts: ScheduleDestinationDraft[]) => {
      if (editingId) {
        const result = ws.updateSchedule(editingId, values, destDrafts);
        if (!result.ok) return { ok: false as const, error: result.error, errors: (result as unknown as { errors?: Record<string, string> }).errors };
        return { ok: true as const };
      } else {
        const result = ws.createSchedule(values, destDrafts);
        if (!result.ok) return { ok: false as const, error: result.error, errors: (result as unknown as { errors?: Record<string, string> }).errors };
        return { ok: true as const };
      }
    },
    [editingId, ws],
  );

  const handleMonthChange = useCallback((next: Date) => {
    setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }, []);

  const handleSelectDate = useCallback(
    (key: string) => {
      ws.setSelectedDateKey(key);
      const parsed = parseDateKey(key);
      if (parsed) {
        const first = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        if (first.getMonth() !== currentMonth.getMonth() || first.getFullYear() !== currentMonth.getFullYear()) {
          setCurrentMonth(first);
        }
      }
    },
    [ws, currentMonth],
  );

  const handleClearFilters = useCallback(() => {
    ws.setFilter({ search: "", platform: "all", status: "all", dateRange: "all", destinationId: "all" });
  }, [ws]);

  const handleMoveSchedule = useCallback((scheduleId: string, newDate: string, newTime?: string) => {
    const schedule = ws.schedules.find((s) => s.id === scheduleId);
    if (!schedule || schedule.status === "cancelled") return;

    const result = ws.updateSchedule(
      scheduleId,
      {
        title: schedule.title,
        caption: schedule.caption,
        mediaName: schedule.mediaName ?? "",
        platforms: schedule.platforms,
        destinationIds: schedule.destinationIds,
        date: newDate,
        time: newTime || schedule.scheduledTime,
        timezone: schedule.timezone,
        notes: schedule.notes,
        source: schedule.source,
      },
      schedule.destinations,
    );

    if (result.ok) {
      ws.toggleSelect(scheduleId);
      ws.toggleSelect(scheduleId);
    }
  }, [ws]);

  const handleViewChange = useCallback((v: ScheduleView) => {
    ws.setView(v);
  }, [ws]);

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Publishing"
        title="Scheduler"
        description="Plan publishing dates, times, destinations, and content workflows from one Nexapa calendar."
        actions={
          <>
            <StatusBadge label="Scheduler service not connected" tone="amber" />
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
            >
              Schedule Post
            </button>
            <button
              type="button"
              onClick={() => navigate("/publisher")}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
            >
              Open Publisher
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <SchedulerWorkspace
          schedules={ws.schedules}
          filtered={ws.filtered}
          sorted={ws.sorted}
          schedulesByDate={ws.schedulesByDate}
          selectedDateKey={ws.selectedDateKey}
          selectedDateSchedules={ws.selectedDateSchedules}
          filter={ws.filter}
          sort={ws.sort}
          view={ws.view}
          selectedIds={ws.selectedIds}
          browserTimezone={ws.browserTimezone}
          allDestinations={ws.allDestinations}
          liveMsg={ws.liveMsg}
          clipboardError={ws.clipboardError}
          totalCount={ws.schedules.length}
          currentMonth={currentMonth}
          onMonthChange={handleMonthChange}
          onSelectDate={handleSelectDate}
          onFilterChange={ws.setFilter}
          onSortChange={ws.setSort}
          onViewChange={handleViewChange}
          onClearFilters={handleClearFilters}
          onSchedulePost={handleOpenCreate}
          onOpenPublisher={() => navigate("/publisher")}
          onOpenSettings={() => navigate("/settings")}
          onToggle={ws.toggleSelect}
          onOpenDetails={handleOpenDetails}
          onEdit={handleOpenEdit}
          onDuplicate={ws.duplicateSchedule as unknown as (id: string) => void}
          onPause={ws.pauseSchedule}
          onResume={ws.resumeSchedule}
          onCancel={ws.cancelSchedule}
          onRemove={ws.removeSchedule}
          onCopy={ws.copyScheduleDetails as unknown as (id: string) => void}
          onSelectAllVisible={() => ws.selectAllVisible(ws.filtered.map((s) => s.id))}
          onClearSelection={ws.clearSelection}
          onPauseSelected={ws.pauseSelected}
          onResumeSelected={ws.resumeSelected}
          onCancelSelected={ws.cancelSelected}
          onRemoveSelected={ws.removeSelected}
          onCopySelected={ws.copySelectedDetails}
          onLoadDemoSchedule={ws.loadDemoSchedules}
          onMoveSchedule={handleMoveSchedule}
        />
      </div>

      <SchedulePostDialog
        open={showCreateDialog}
        editingSchedule={editingSchedule}
        allSchedules={ws.schedules}
        demoLoaded={ws.showDemoDestinations}
        destinations={ws.allDestinations}
        browserTimezone={ws.browserTimezone}
        onClose={handleCloseCreate}
        onSave={handleSave as unknown as (values: ScheduleFormValues, destDrafts: ScheduleDestinationDraft[]) => { ok: boolean; error?: string; errors?: Record<string, string> }}
        onLoadDemoDestinations={ws.loadDemoDestinations}
        prefill={prefillForDialog}
        hasPublisherDraft={hasPublisherDraft}
      />

      <ScheduleDetailsDialog
        open={!!detailsId && !!detailsSchedule}
        schedule={detailsSchedule as LocalSchedule | null}
        browserTimezone={ws.browserTimezone}
        onClose={handleCloseDetails}
        onEdit={(id) => { handleCloseDetails(); window.setTimeout(() => handleOpenEdit(id), 80); }}
        onDuplicate={(id) => ws.duplicateSchedule(id)}
        onPause={ws.pauseSchedule}
        onResume={ws.resumeSchedule}
        onCancel={ws.cancelSchedule}
        onRemove={(id) => { ws.removeSchedule(id); handleCloseDetails(); }}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ws.liveMsg} {ws.clipboardError}
      </div>
    </div>
  );
}
