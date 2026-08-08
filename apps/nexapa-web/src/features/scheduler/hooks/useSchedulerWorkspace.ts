import { useCallback, useMemo, useState } from "react";
import type {
  LocalSchedule,
  ScheduleDestinationDraft,
  SchedulerPlatform,
  ScheduleFilter,
  ScheduleSort,
  ScheduleView,
  ScheduleFormValues,
  DemoDestination,
} from "../scheduler.types";
import {
  DEMO_DESTINATIONS,
  DEMO_TITLES,
  MAX_SCHEDULES,
} from "../scheduler.constants";
import {
  generateScheduleId,
  getBrowserTimezone,
  validateScheduleForm,
  formatDateKey,
  filterAndSearchSchedules,
  sortSchedules,
  buildScheduleCopyText,
} from "../scheduler.utils";

export function useSchedulerWorkspace() {
  const [schedules, setSchedules] = useState<LocalSchedule[]>([]);
  const [filter, setFilter] = useState<ScheduleFilter>({
    search: "",
    platform: "all",
    status: "all",
    dateRange: "all",
    destinationId: "all",
  });
  const [sort, setSort] = useState<ScheduleSort>("earliest");
  const [view, setView] = useState<ScheduleView>("month");
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateKey(new Date()));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [demoDestinations, setDemoDestinations] = useState<DemoDestination[]>([]);
  const [liveMsg, setLiveMsg] = useState<string>("");
  const [clipboardError, setClipboardError] = useState<string>("");

  const browserTimezone = useMemo(() => getBrowserTimezone(), []);

  const showDemoDestinations = demoDestinations.length > 0;

  const allDestinationsMap = useMemo(() => {
    const map = new Map<string, ScheduleDestinationDraft>();
    for (const d of demoDestinations) {
      map.set(d.id, { id: d.id, label: d.label, identifier: d.identifier, platform: d.platform, isDemo: true });
    }
    // include destinations referenced in schedules to keep them searchable
    for (const s of schedules) {
      for (const dest of s.destinations) {
        if (!map.has(dest.id)) map.set(dest.id, dest);
      }
    }
    return map;
  }, [demoDestinations, schedules]);

  const allDestinations = useMemo(() => Array.from(allDestinationsMap.values()), [allDestinationsMap]);

  const filtered = useMemo(() => filterAndSearchSchedules(schedules, filter), [schedules, filter]);
  const sorted = useMemo(() => sortSchedules(filtered, sort), [filtered, sort]);

  const schedulesByDate = useMemo(() => {
    const m = new Map<string, LocalSchedule[]>();
    for (const s of schedules) {
      const list = m.get(s.scheduledDate) ?? [];
      list.push(s);
      m.set(s.scheduledDate, list);
    }
    return m;
  }, [schedules]);

  const selectedSchedules = useMemo(() => schedules.filter((s) => selectedIds.has(s.id)), [schedules, selectedIds]);

  const selectedDateSchedules = useMemo(() => {
    const list = schedules.filter((s) => s.scheduledDate === selectedDateKey);
    return sortSchedules(list, sort);
  }, [schedules, selectedDateKey, sort]);

  const hasActiveFilters = useMemo(() => {
    return (
      filter.search.trim() !== "" ||
      filter.platform !== "all" ||
      filter.status !== "all" ||
      filter.dateRange !== "all" ||
      filter.destinationId !== "all"
    );
  }, [filter]);

  const announce = useCallback((msg: string) => {
    setLiveMsg(msg);
    window.setTimeout(() => setLiveMsg(""), 3500);
  }, []);

  const loadDemoDestinations = useCallback(() => {
    if (demoDestinations.length > 0) return;
    setDemoDestinations([...DEMO_DESTINATIONS]);
    announce("DEMO destinations loaded — all marked DEMO");
  }, [demoDestinations.length, announce]);

  const clearDemoDestinations = useCallback(() => {
    setDemoDestinations([]);
    // also unselect demo destinations in forms handled by consumers, but clear selection if selected id belongs only to demo destination referencing schedule?
    announce("DEMO destinations cleared");
  }, [announce]);

  const loadDemoSchedules = useCallback(() => {
    if (schedules.length >= MAX_SCHEDULES) {
      announce(`Maximum ${MAX_SCHEDULES} schedules reached`);
      return;
    }
    const now = new Date();
    const today: LocalSchedule[] = [];
    const titles = [...DEMO_TITLES];
    const tz = getBrowserTimezone();

    for (let i = 0; i < 3; i++) {
      const destSubset = DEMO_DESTINATIONS.slice(i, i + 2).map((d) => ({
        id: d.id,
        label: d.label,
        identifier: d.identifier,
        platform: d.platform,
        isDemo: true,
      }));
      const platforms = Array.from(new Set(destSubset.map((d) => d.platform))) as SchedulerPlatform[];
      const nd = new Date(now);
      nd.setDate(now.getDate() + i * 2);
      nd.setHours(10 + i * 2, i % 2 === 0 ? 0 : 30, 0, 0);
      const dateKey = formatDateKey(nd);
      const timeStr = `${String(nd.getHours()).padStart(2, "0")}:${String(nd.getMinutes()).padStart(2, "0")}`;
      const nowMs = Date.now() + i;

      const sched: LocalSchedule = {
        id: generateScheduleId(),
        title: titles[i % titles.length],
        caption: `Local preview caption for ${titles[i % titles.length]}. This is demo content only. No publishing occurs.\n\nSecond line preserved.`,
        mediaName: i % 2 === 0 ? `demo-media-${i + 1}.mp4` : null,
        mediaType: i % 2 === 0 ? "video" : "none",
        destinationIds: destSubset.map((dd) => dd.id),
        destinations: destSubset,
        platforms: Array.from(platforms) as SchedulerPlatform[],
        scheduledDate: dateKey,
        scheduledTime: timeStr,
        timezone: tz,
        status: "backend-required",
        source: "demo",
        createdAt: nowMs,
        createdAtIso: new Date(nowMs).toISOString(),
        updatedAt: nowMs,
        updatedAtIso: new Date(nowMs).toISOString(),
        notes: "This only exists in browser memory. DEMO schedule.",
        isDemo: true,
      };
      today.push(sched);
    }

    setSchedules((prev) => [...prev, ...today]);
    // ensure demo dest loaded too
    setDemoDestinations((prev) => (prev.length === 0 ? [...DEMO_DESTINATIONS] : prev));
    announce(`${today.length} DEMO schedules loaded`);
  }, [schedules.length, announce]);

  const createSchedule = useCallback(
    (values: ScheduleFormValues, destDrafts: ScheduleDestinationDraft[]) => {
      if (schedules.length >= MAX_SCHEDULES) {
        return { ok: false, error: `Maximum ${MAX_SCHEDULES} schedules reached`, validationItems: [] as ReturnType<typeof validateScheduleForm>["validationItems"] };
      }

      const validation = validateScheduleForm(
        {
          title: values.title,
          caption: values.caption,
          platforms: values.platforms,
          destinationIds: values.destinationIds,
          destinations: destDrafts,
          date: values.date,
          time: values.time,
          timezone: values.timezone,
          notes: values.notes,
        },
        schedules,
        null,
      );

      if (!validation.valid) {
        return { ok: false, error: validation.errors.global ?? "Fix validation errors before saving", validationItems: validation.validationItems, errors: validation.errors, conflicts: validation.conflicts };
      }

      const now = Date.now();
      const isDemo = destDrafts.some((d) => d.isDemo) || values.source === "demo";
      const derivedStatus = isDemo ? "backend-required" : "ready-locally";

      const newSchedule: LocalSchedule = {
        id: generateScheduleId(),
        title: values.title.trim(),
        caption: values.caption,
        mediaName: values.mediaName.trim() ? values.mediaName.trim() : null,
        mediaType: values.mediaName.trim() ? (values.mediaName.toLowerCase().endsWith(".mp4") || values.mediaName.toLowerCase().endsWith(".mov") ? "video" : "image") : "none",
        destinationIds: [...values.destinationIds],
        destinations: [...destDrafts],
        platforms: [...values.platforms],
        scheduledDate: values.date,
        scheduledTime: values.time,
        timezone: values.timezone,
        status: derivedStatus as LocalSchedule["status"],
        source: values.source,
        createdAt: now,
        createdAtIso: new Date(now).toISOString(),
        updatedAt: now,
        updatedAtIso: new Date(now).toISOString(),
        notes: values.notes,
        isDemo,
      };

      setSchedules((prev) => [...prev, newSchedule]);
      announce(`Schedule "${newSchedule.title}" created — ${newSchedule.scheduledDate} ${newSchedule.scheduledTime} ${newSchedule.timezone}`);
      return { ok: true as const, schedule: newSchedule, validationItems: validation.validationItems };
    },
    [schedules, announce],
  );

  const updateSchedule = useCallback(
    (id: string, values: ScheduleFormValues, destDrafts: ScheduleDestinationDraft[]) => {
      const existing = schedules.find((s) => s.id === id);
      if (!existing) return { ok: false as const, error: "Schedule not found" };

      const validation = validateScheduleForm(
        {
          title: values.title,
          caption: values.caption,
          platforms: values.platforms,
          destinationIds: values.destinationIds,
          destinations: destDrafts,
          date: values.date,
          time: values.time,
          timezone: values.timezone,
          notes: values.notes,
        },
        schedules,
        id,
      );

      if (!validation.valid) {
        return { ok: false as const, error: validation.errors.global ?? "Fix validation errors", validationItems: validation.validationItems, errors: validation.errors, conflicts: validation.conflicts };
      }

      const now = Date.now();
      const isDemo = destDrafts.some((d) => d.isDemo) || existing.isDemo || values.source === "demo";

      setSchedules((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          return {
            ...s,
            title: values.title.trim(),
            caption: values.caption,
            mediaName: values.mediaName.trim() ? values.mediaName.trim() : null,
            mediaType: values.mediaName.trim() ? (values.mediaName.toLowerCase().endsWith(".mp4") || values.mediaName.toLowerCase().endsWith(".mov") ? "video" : "image") : "none",
            destinationIds: [...values.destinationIds],
            destinations: [...destDrafts],
            platforms: [...values.platforms],
            scheduledDate: values.date,
            scheduledTime: values.time,
            timezone: values.timezone,
            notes: values.notes,
            source: values.source,
            updatedAt: now,
            updatedAtIso: new Date(now).toISOString(),
            isDemo,
            status: s.status === "paused" || s.status === "cancelled" ? s.status : isDemo ? "backend-required" : "ready-locally",
          };
        }),
      );

      announce(`Schedule "${values.title.trim()}" updated`);
      return { ok: true as const, validationItems: validation.validationItems };
    },
    [schedules, announce],
  );

  const duplicateSchedule = useCallback(
    (id: string) => {
      const existing = schedules.find((s) => s.id === id);
      if (!existing) return null;
      if (schedules.length >= MAX_SCHEDULES) {
        announce(`Maximum ${MAX_SCHEDULES} schedules reached`);
        return null;
      }
      const now = Date.now();
      const copy: LocalSchedule = {
        ...existing,
        id: generateScheduleId(),
        title: `${existing.title} Copy`,
        status: "local-draft",
        createdAt: now,
        createdAtIso: new Date(now).toISOString(),
        updatedAt: now,
        updatedAtIso: new Date(now).toISOString(),
      };
      setSchedules((prev) => [...prev, copy]);
      announce(`Schedule duplicated: "${copy.title}" — choose a new time`);
      return copy;
    },
    [schedules, announce],
  );

  const pauseSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, status: "paused", updatedAt: Date.now(), updatedAtIso: new Date().toISOString() } : s)));
    announce("Schedule paused — This only changes the local frontend state.");
  }, [announce]);

  const resumeSchedule = useCallback((id: string) => {
    setSchedules((prev) => {
      const target = prev.find((s) => s.id === id);
      if (!target) return prev;
      // re-validate loosely: set to backend-required or ready-locally
      const newStatus = target.isDemo ? "backend-required" : "ready-locally";
      return prev.map((s) => (s.id === id ? { ...s, status: newStatus, updatedAt: Date.now(), updatedAtIso: new Date().toISOString() } : s));
    });
    announce("Schedule resumed — frontend validation reapplied");
  }, [announce]);

  const cancelSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, status: "cancelled", updatedAt: Date.now(), updatedAtIso: new Date().toISOString() } : s)));
    announce("Schedule cancelled — kept in local history");
  }, [announce]);

  const removeSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    announce("Schedule removed from local preview");
  }, [announce]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const pauseSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setSchedules((prev) => prev.map((s) => (selectedIds.has(s.id) ? { ...s, status: "paused", updatedAt: Date.now(), updatedAtIso: new Date().toISOString() } : s)));
    announce(`${selectedIds.size} schedule(s) paused — local frontend state only`);
  }, [selectedIds, announce]);

  const resumeSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setSchedules((prev) => prev.map((s) => (selectedIds.has(s.id) ? { ...s, status: s.isDemo ? "backend-required" : "ready-locally", updatedAt: Date.now(), updatedAtIso: new Date().toISOString() } : s)));
    announce(`${selectedIds.size} schedule(s) resumed`);
  }, [selectedIds, announce]);

  const cancelSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setSchedules((prev) => prev.map((s) => (selectedIds.has(s.id) ? { ...s, status: "cancelled", updatedAt: Date.now(), updatedAtIso: new Date().toISOString() } : s)));
    announce(`${selectedIds.size} schedule(s) cancelled — kept in history`);
  }, [selectedIds, announce]);

  const removeSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setSchedules((prev) => prev.filter((s) => !selectedIds.has(s.id)));
    announce(`${selectedIds.size} schedule(s) removed`);
    setSelectedIds(new Set());
  }, [selectedIds, announce]);

  const copyScheduleDetails = useCallback(async (id: string) => {
    const s = schedules.find((x) => x.id === id);
    if (!s) return false;
    const text = buildScheduleCopyText(s);
    setClipboardError("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      announce("Schedule details copied");
      return true;
    } catch {
      setClipboardError("Clipboard access failed — copy manually");
      window.setTimeout(() => setClipboardError(""), 3000);
      return false;
    }
  }, [schedules, announce]);

  const copySelectedDetails = useCallback(async () => {
    if (selectedIds.size === 0) return false;
    const list = schedules.filter((s) => selectedIds.has(s.id));
    const text = list.map(buildScheduleCopyText).join("\n\n---\n\n");
    setClipboardError("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      announce(`${list.length} schedule(s) details copied`);
      return true;
    } catch {
      setClipboardError("Clipboard access failed — copy manually");
      window.setTimeout(() => setClipboardError(""), 3000);
      return false;
    }
  }, [schedules, selectedIds, announce]);

  const clearAll = useCallback(() => {
    setSchedules([]);
    setSelectedIds(new Set());
    announce("All local schedules cleared");
  }, [announce]);

  return {
    schedules,
    filtered,
    sorted,
    schedulesByDate,
    selectedDateKey,
    setSelectedDateKey,
    selectedDateSchedules,
    filter,
    setFilter,
    sort,
    setSort,
    view,
    setView,
    selectedIds,
    selectedSchedules,
    browserTimezone,
    allDestinations,
    allDestinationsMap,
    demoDestinations,
    showDemoDestinations,
    hasActiveFilters,
    liveMsg,
    clipboardError,
    loadDemoDestinations,
    clearDemoDestinations,
    loadDemoSchedules,
    createSchedule,
    updateSchedule,
    duplicateSchedule,
    pauseSchedule,
    resumeSchedule,
    cancelSchedule,
    removeSchedule,
    toggleSelect,
    selectAllVisible,
    clearSelection,
    pauseSelected,
    resumeSelected,
    cancelSelected,
    removeSelected,
    copyScheduleDetails,
    copySelectedDetails,
    clearAll,
  };
}
