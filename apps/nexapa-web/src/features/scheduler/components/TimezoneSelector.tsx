import { TIMEZONES } from "../scheduler.constants";

type Props = {
  value: string;
  onChange: (tz: string) => void;
  id?: string;
};

export function TimezoneSelector({ value, onChange, id = "schedule-timezone" }: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Timezone</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors"
      >
        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
      </select>
    </div>
  );
}
