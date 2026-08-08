import { useCallback, useMemo } from "react";

type Props = {
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onTimezoneChange: (timezone: string) => void;
  minDate?: string;
  disabled?: boolean;
};

export function ScheduleDateTimePicker({
  scheduledDate,
  scheduledTime,
  timezone,
  onDateChange,
  onTimeChange,
  onTimezoneChange,
  minDate,
  disabled,
}: Props) {
  const browserTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Asia/Jakarta";
    }
  }, []);

  const handleTimezoneChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onTimezoneChange(e.target.value);
    },
    [onTimezoneChange]
  );

  const today = new Date();
  const minDateValue = minDate || today.toISOString().split("T")[0];

  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = String(h).padStart(2, "0");
        const minute = String(m).padStart(2, "0");
        options.push(`${hour}:${minute}`);
      }
    }
    return options;
  }, []);

  const commonTimezones = [
    "Asia/Jakarta",
    "Asia/Makassar",
    "Asia/Jayapura",
    "Asia/Singapore",
    "Asia/Bangkok",
    "Asia/Kuala_Lumpur",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Australia/Sydney",
    "Australia/Melbourne",
    "Pacific/Auckland",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "America/Toronto",
    "UTC",
  ];

  return (
    <div className="space-y-3 bg-transparent">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 bg-transparent">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
          <label htmlFor="schedule-date" className="text-[11px] font-medium text-slate-600">Date</label>
          <input type="date" id="schedule-date" value={scheduledDate} onChange={(e) => onDateChange(e.target.value)} min={minDateValue} disabled={disabled} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 py-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:bg-white/5" />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
          <label htmlFor="schedule-time" className="text-[11px] font-medium text-slate-600">Time</label>
          <select id="schedule-time" value={scheduledTime} onChange={(e) => onTimeChange(e.target.value)} disabled={disabled} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-2.5 py-2 text-[12px] backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:bg-white/5">
            {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
          </select>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl sm:col-span-1">
          <label htmlFor="schedule-timezone" className="text-[11px] font-medium text-slate-600">Timezone</label>
          <select id="schedule-timezone" value={timezone} onChange={handleTimezoneChange} disabled={disabled} className="mt-1 w-full rounded-xl border border-white/20 bg-white/12 px-2 py-2 text-[11px] backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:bg-white/5">
            {commonTimezones.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
          </select>
          <p className="mt-1 text-[10px] text-slate-500">Current: {browserTimezone}</p>
        </div>
      </div>
    </div>
  );
}