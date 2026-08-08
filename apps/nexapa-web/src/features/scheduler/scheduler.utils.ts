import type {
  LocalSchedule,
  ScheduleDestinationDraft,
  SchedulerPlatform,
  ScheduleStatus,
  ValidationItem,
  GroupedSchedules,
  ConflictDetail,
} from "./scheduler.types";
import {
  DEFAULT_TIMEZONE_FALLBACK,
  STATUS_LABELS,
  TITLE_MAX,
  CAPTION_ADVISORY_MAX,
  NOTES_MAX,
} from "./scheduler.constants";

let seq = 0;
export function generateScheduleId(): string {
  seq += 1;
  return `sched_${Date.now().toString(36)}_${seq.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === "string" && tz.length > 0) return tz;
  } catch {
    // ignore
  }
  return DEFAULT_TIMEZONE_FALLBACK;
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [ys, ms, ds] = key.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  const da = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null;
  const dt = new Date(y, mo - 1, da);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== da) return null;
  return dt;
}

export function isPastDateTime(dateStr: string, timeStr: string, tz: string): boolean {
  // Conservative check: compare using local construction and timezone awareness best effort
  // We validate by constructing a Date in browser from date+time assuming tz same as selected when possible,
  // but fallback to local comparison for past check.
  try {
    const d = parseDateKey(dateStr);
    if (!d) return true;
    const [hS, mS] = timeStr.split(":");
    const h = Number(hS);
    const m = Number(mS);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return true;

    const now = new Date();
    const browserTz = getBrowserTimezone();

    if (tz === browserTz || tz === DEFAULT_TIMEZONE_FALLBACK) {
      const test = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
      return test.getTime() < now.getTime() - 60 * 1000; // allow 1 min grace
    }

    // If tz differs, we still use local date construction for conservative past detection
    // but we also attempt to check via Intl: get instant = date in tz converted to UTC approx
    // Since we cannot precisely convert without lib, we check: if date itself is before today -> past
    const todayKey = formatDateKey(now);
    if (dateStr < todayKey) return true;
    if (dateStr > todayKey) return false;
    // same day, use time compare conservatively as if same as browser day
    const testToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    return testToday.getTime() < now.getTime() - 60 * 1000;
  } catch {
    return true;
  }
}

export function buildDateTimeLabel(date: string, time: string, tz: string): string {
  return `${date} ${time} ${tz}`;
}

export function buildLocalEquivalentLabel(date: string, time: string, tz: string): string | null {
  try {
    const browserTz = getBrowserTimezone();
    if (tz === browserTz) return null;
    const d = parseDateKey(date);
    if (!d) return null;
    const [hS, mS] = time.split(":");
    const h = Number(hS);
    const m = Number(mS);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);

    const fmt = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: browserTz,
    });
    return `${fmt.format(dt)} ${browserTz}`;
  } catch {
    return null;
  }
}

export function formatDisplayDate(dateKey: string, tz: string): string {
  try {
    const d = parseDateKey(dateKey);
    if (!d) return dateKey;
    const fmt = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: tz,
    });
    return fmt.format(d);
  } catch {
    return dateKey;
  }
}

export function formatTimeShort(time: string): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  return time;
}

export function validateScheduleForm(
  values: {
    title: string;
    caption: string;
    platforms: SchedulerPlatform[];
    destinationIds: string[];
    destinations: ScheduleDestinationDraft[];
    date: string;
    time: string;
    timezone: string;
    notes: string;
  },
  allSchedules: LocalSchedule[],
  editingId: string | null,
): { valid: boolean; errors: Record<string, string>; validationItems: ValidationItem[]; conflicts: ConflictDetail[] } {
  const errors: Record<string, string> = {};
  const validationItems: ValidationItem[] = [];
  const conflicts: ConflictDetail[] = [];

  const push = (id: string, label: string, severity: ValidationItem["severity"], message: string) => {
    validationItems.push({ id, label, severity, message });
  };

  const titleTrimmed = values.title.trim();
  if (!titleTrimmed) {
    errors.title = "Schedule title is required";
    push("title-missing", "Title", "action-required", "Schedule title is required (max 100 characters).");
  } else if (titleTrimmed.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or less`;
    push("title-long", "Title", "action-required", `Title exceeds ${TITLE_MAX} characters.`);
  } else {
    push("title-ok", "Title", "ready-locally", "Title present");
  }

  if (values.caption.length > 0 && values.caption.length > CAPTION_ADVISORY_MAX) {
    push("caption-long", "Caption length", "warning", `Caption exceeds advisory limit of ${CAPTION_ADVISORY_MAX} characters. May be truncated by platforms.`);
  } else if (values.caption.length > 0) {
    push("caption-ok", "Caption", "ready-locally", `Caption ${values.caption.length} characters`);
  }

  if (values.platforms.length === 0) {
    errors.platforms = "Select at least one platform";
    push("platform-missing", "Platforms", "action-required", "Select at least one platform (TikTok, Facebook, Instagram, YouTube).");
  } else {
    push("platform-ok", "Platforms", "ready-locally", `${values.platforms.length} platform(s) selected`);
  }

  if (values.destinationIds.length === 0) {
    errors.destinations = "Select at least one destination";
    push("dest-missing", "Destinations", "action-required", "Select at least one destination account.");
  } else {
    // check cancelled destinations? handled upstream but also here
    const cancelled = values.destinations.filter((d) => (d as unknown as { status?: string }).status === "cancelled");
    if (cancelled.length > 0) {
      push("dest-cancelled", "Destination state", "warning", "One or more selected destination drafts are marked cancelled.");
    }
    push("dest-ok", "Destinations", "ready-locally", `${values.destinationIds.length} destination(s) selected`);
  }

  // platform-destination mismatch
  if (values.platforms.length > 0 && values.destinations.length > 0) {
    const destPlatforms = new Set(values.destinations.map((d) => d.platform));
    const missingPlatforms = values.platforms.filter((p) => !destPlatforms.has(p));
    if (missingPlatforms.length > 0) {
      push("mismatch", "Platform–destination alignment", "warning", `Selected platforms ${missingPlatforms.join(", ")} have no matching destination account in selection.`);
    }
  }

  if (!values.date) {
    errors.date = "Date is required";
    push("date-missing", "Date", "action-required", "Select a publishing date.");
  } else {
    const parsed = parseDateKey(values.date);
    if (!parsed) {
      errors.date = "Invalid date format";
      push("date-invalid", "Date", "action-required", "Invalid date format. Use YYYY-MM-DD.");
    } else {
      push("date-ok", "Date", "ready-locally", `Date ${values.date}`);
    }
  }

  if (!values.time) {
    errors.time = "Time is required";
    push("time-missing", "Time", "action-required", "Select a publishing time.");
  } else if (!/^\d{2}:\d{2}$/.test(values.time)) {
    errors.time = "Invalid time format";
    push("time-invalid", "Time", "action-required", "Invalid time format. Use HH:mm.");
  } else {
    push("time-ok", "Time", "ready-locally", `Time ${values.time}`);
  }

  if (values.date && values.time) {
    if (isPastDateTime(values.date, values.time, values.timezone)) {
      errors.dateTime = "Date/time cannot be in the past";
      push("past", "Past date/time", "action-required", "Scheduled date/time is in the past for selected timezone.");
    }
  }

  if (values.notes.length > NOTES_MAX) {
    errors.notes = `Notes must be ${NOTES_MAX} characters or less`;
    push("notes-long", "Notes", "action-required", `Notes exceed ${NOTES_MAX} characters.`);
  }

  // Check conflicts
  if (values.date && values.time && values.destinationIds.length > 0) {
    for (const destId of values.destinationIds) {
      const destLabel = values.destinations.find((d) => d.id === destId)?.label ?? destId;
      const colliding = allSchedules.filter((s) => {
        if (editingId && s.id === editingId) return false;
        if (s.status === "cancelled") return false;
        if (s.scheduledDate !== values.date) return false;
        if (s.scheduledTime !== values.time) return false;
        return s.destinationIds.includes(destId);
      });
      for (const c of colliding) {
        conflicts.push({
          destinationId: destId,
          destinationLabel: destLabel,
          conflictWithId: c.id,
          conflictWithTitle: c.title,
        });
        push(
          `conflict-${destId}-${c.id}`,
          "Scheduling conflict",
          "action-required",
          `Another local schedule "${c.title}" uses ${destLabel} at the same time ${values.date} ${values.time}.`,
        );
      }
    }
  }

  // Authorization / backend notice
  push("backend", "Backend requirement", "backend-required", "Nexapa Scheduler is operating in local preview mode. Persistent schedules, background execution, retries, and publishing require Nexapa API and the scheduler worker.");
  if (values.destinations.some((d) => (d as unknown as { status?: string }).status === "authorization-required") || values.destinations.length === 0) {
    // generic note
    push("auth", "Authorization required", "warning", "Some destinations may require authorization. Authorization will be handled by Nexapa API.");
  }

  const hasActionRequired = validationItems.some((v) => v.severity === "action-required");
  return {
    valid: !hasActionRequired && Object.keys(errors).length === 0,
    errors,
    validationItems,
    conflicts,
  };
}

export function deriveStatusFromValidation(validationItems: ValidationItem[], isPaused: boolean, isCancelled: boolean): ScheduleStatus {
  if (isCancelled) return "cancelled";
  if (isPaused) return "paused";
  const hasActionRequired = validationItems.some((v) => v.severity === "action-required");
  if (hasActionRequired) return "local-draft";
  const hasAuth = validationItems.some((v) => v.id === "auth") || validationItems.some((v) => v.label.toLowerCase().includes("authorization"));
  if (hasAuth) return "authorization-required";
  const hasBackend = validationItems.some((v) => v.severity === "backend-required");
  if (hasBackend) {
    // if only backend and ready items, still backend-required unless all actionable resolved -> ready-locally is still backend-required? spec says ready-locally means frontend validation complete.
    // We treat backend note as not blocking ready-locally, but we still want backend-required as default unless ready.
    // Distinguish: if there are only ready + backend, we can mark ready-locally.
    const onlyReadyAndBackend = validationItems.every((v) => v.severity === "ready-locally" || v.severity === "backend-required" || v.severity === "warning");
    if (onlyReadyAndBackend) {
      // check if any warning is actually auth-related
      return "ready-locally";
    }
    return "backend-required";
  }
  return "ready-locally";
}

export function computeGroupedAgenda(schedules: LocalSchedule[]): GroupedSchedules[] {
  const now = new Date();
  const todayKey = formatDateKey(now);
  const tomorrowD = new Date(now);
  tomorrowD.setDate(now.getDate() + 1);
  const tomorrowKey = formatDateKey(tomorrowD);

  const endOfWeek = new Date(now);
  // This week: up to Sunday
  const dayOfWeek = now.getDay(); // 0 Sun .. 6 Sat
  const diffToSunday = 7 - dayOfWeek;
  endOfWeek.setDate(now.getDate() + diffToSunday);

  const groups: Record<string, LocalSchedule[]> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  for (const s of schedules) {
    if (s.scheduledDate === todayKey) groups.today.push(s);
    else if (s.scheduledDate === tomorrowKey) groups.tomorrow.push(s);
    else {
      const d = parseDateKey(s.scheduledDate);
      if (!d) {
        groups.later.push(s);
        continue;
      }
      if (d <= endOfWeek && d > tomorrowD) groups.thisWeek.push(s);
      else groups.later.push(s);
    }
  }

  const result: GroupedSchedules[] = [];
  if (groups.today.length > 0) result.push({ key: "today", label: "Today", items: groups.today });
  if (groups.tomorrow.length > 0) result.push({ key: "tomorrow", label: "Tomorrow", items: groups.tomorrow });
  if (groups.thisWeek.length > 0) result.push({ key: "this-week", label: "This week", items: groups.thisWeek });
  if (groups.later.length > 0) result.push({ key: "later", label: "Later", items: groups.later });

  // If no grouped but schedules exist outside (e.g., past but not today) fallback to date groups
  if (result.length === 0 && schedules.length > 0) {
    // group by full date
    const byDate: Record<string, LocalSchedule[]> = {};
    for (const s of schedules) {
      byDate[s.scheduledDate] = byDate[s.scheduledDate] ?? [];
      byDate[s.scheduledDate].push(s);
    }
    for (const dateKey of Object.keys(byDate).sort()) {
      result.push({ key: dateKey, label: formatDisplayDate(dateKey, byDate[dateKey][0]?.timezone ?? DEFAULT_TIMEZONE_FALLBACK), items: byDate[dateKey] });
    }
  }

  return result;
}

export function filterAndSearchSchedules(schedules: LocalSchedule[], filter: import("./scheduler.types").ScheduleFilter): LocalSchedule[] {
  let list = [...schedules];
  const term = filter.search.trim().toLowerCase();
  if (term) {
    list = list.filter((s) => {
      const hay = `${s.title} ${s.caption} ${s.mediaName ?? ""} ${s.destinations.map((d) => d.label).join(" ")}`.toLowerCase();
      return hay.includes(term);
    });
  }
  if (filter.platform !== "all") {
    list = list.filter((s) => s.platforms.includes(filter.platform as SchedulerPlatform));
  }
  if (filter.status !== "all") {
    list = list.filter((s) => s.status === filter.status);
  }
  if (filter.destinationId !== "all") {
    list = list.filter((s) => s.destinationIds.includes(filter.destinationId as string));
  }
  if (filter.dateRange !== "all") {
    const now = new Date();
    const todayKey = formatDateKey(now);
    if (filter.dateRange === "today") {
      list = list.filter((s) => s.scheduledDate === todayKey);
    } else if (filter.dateRange === "next7") {
      const end = new Date(now);
      end.setDate(now.getDate() + 7);
      list = list.filter((s) => {
        const d = parseDateKey(s.scheduledDate);
        if (!d) return false;
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= end;
      });
    } else if (filter.dateRange === "next30") {
      const end = new Date(now);
      end.setDate(now.getDate() + 30);
      list = list.filter((s) => {
        const d = parseDateKey(s.scheduledDate);
        if (!d) return false;
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= end;
      });
    }
  }
  return list;
}

export function sortSchedules(list: LocalSchedule[], sort: import("./scheduler.types").ScheduleSort): LocalSchedule[] {
  const copy = [...list];
  switch (sort) {
    case "earliest":
      return copy.sort((a, b) => {
        const keyA = `${a.scheduledDate} ${a.scheduledTime}`;
        const keyB = `${b.scheduledDate} ${b.scheduledTime}`;
        if (keyA === keyB) return a.createdAt - b.createdAt;
        return keyA.localeCompare(keyB);
      });
    case "latest":
      return copy.sort((a, b) => {
        const keyA = `${a.scheduledDate} ${a.scheduledTime}`;
        const keyB = `${b.scheduledDate} ${b.scheduledTime}`;
        if (keyA === keyB) return b.createdAt - a.createdAt;
        return keyB.localeCompare(keyA);
      });
    case "recent-created":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "recent-updated":
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
    case "title-asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return copy;
  }
}

export function getStatusLabel(status: ScheduleStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getCalendarDays(month: Date): Date[] {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const first = new Date(year, mon, 1);
  // Monday start
  const startDay = first.getDay(); // 0 Sun
  const mondayIndex = startDay === 0 ? 6 : startDay - 1; // 0 Mon ... 6 Sun
  const start = new Date(year, mon, 1 - mondayIndex);

  const days: Date[] = [];
  // 6 weeks = 42 days to cover all months
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function getWeekDays(anchor: Date): Date[] {
  const d = new Date(anchor);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }
  return days;
}

export function formatWeekRange(days: Date[]): string {
  if (days.length === 0) return "";
  const first = days[0];
  const last = days[days.length - 1];
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return `${fmt.format(first)}\u2013${fmt.format(last)}, ${first.getFullYear()}`;
}

export function formatHourLabel(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function formatTime12(time: string): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  const [hS, mS] = time.split(":");
  const h = Number(hS);
  const m = Number(mS);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export type WeekScheduleBlock = {
  schedule: LocalSchedule;
  dayIndex: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  lane: number;
  totalLanes: number;
};

export function computeWeekBlocks(schedules: LocalSchedule[], weekDays: Date[]): WeekScheduleBlock[] {
  const dayKeys = weekDays.map(formatDateKey);
  const blocks: WeekScheduleBlock[] = [];

  for (const s of schedules) {
    if (s.status === "cancelled") continue;
    const dayIdx = dayKeys.indexOf(s.scheduledDate);
    if (dayIdx === -1) continue;
    const [hS, mS] = s.scheduledTime.split(":");
    const h = Number(hS);
    const m = Number(mS);
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    blocks.push({
      schedule: s,
      dayIndex: dayIdx,
      startHour: h,
      startMinute: m,
      endHour: h,
      endMinute: m + 30,
      lane: 0,
      totalLanes: 1,
    });
  }

  // Compute lanes for overlapping blocks
  const byDay = new Map<number, WeekScheduleBlock[]>();
  for (const b of blocks) {
    const list = byDay.get(b.dayIndex) ?? [];
    list.push(b);
    byDay.set(b.dayIndex, list);
  }

  for (const [, dayBlocks] of byDay) {
    dayBlocks.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
    const lanes: WeekScheduleBlock[][] = [];
    for (const block of dayBlocks) {
      const blockStart = block.startHour * 60 + block.startMinute;
      let placed = false;
      for (let l = 0; l < lanes.length; l++) {
        const last = lanes[l][lanes[l].length - 1];
        const lastEnd = last.endHour * 60 + last.endMinute;
        if (blockStart >= lastEnd) {
          lanes[l].push(block);
          block.lane = l;
          placed = true;
          break;
        }
      }
      if (!placed) {
        block.lane = lanes.length;
        lanes.push([block]);
      }
    }
    const totalLanes = lanes.length;
    for (const b of dayBlocks) {
      b.totalLanes = totalLanes;
    }
  }

  return blocks;
}

export function isSameDayKey(aKey: string, b: Date): boolean {
  return aKey === formatDateKey(b);
}

export function isTodayKey(key: string): boolean {
  return key === formatDateKey(new Date());
}

export function buildScheduleCopyText(s: LocalSchedule): string {
  const lines = [
    `Title: ${s.title}`,
    `Date: ${s.scheduledDate} ${s.scheduledTime} ${s.timezone}`,
    `Platforms: ${s.platforms.join(", ")}`,
    `Destinations: ${s.destinations.map((d) => d.label).join(", ")}`,
    `Status: ${getStatusLabel(s.status)}`,
    `Source: ${s.source}${s.isDemo ? " (DEMO)" : ""}`,
    `Media: ${s.mediaName ?? "No media ref"}`,
    `Caption: ${s.caption.slice(0, 500)}`,
    `Notes: ${s.notes}`,
    `ID: ${s.id}`,
  ];
  return lines.join("\n");
}
