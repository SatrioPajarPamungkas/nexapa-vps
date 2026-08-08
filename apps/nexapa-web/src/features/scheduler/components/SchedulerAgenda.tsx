import { ScheduledPostRow } from "./ScheduledPostRow";
import type { LocalSchedule, GroupedSchedules } from "../scheduler.types";
import { computeGroupedAgenda } from "../scheduler.utils";
import { useMemo } from "react";

type Props = {
  schedules: LocalSchedule[];
  selectedIds: Set<string>;
  browserTimezone: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onCopy: (id: string) => void;
};

export function SchedulerAgenda({ schedules, selectedIds, browserTimezone, onToggle, onOpen, onEdit, onDuplicate, onPause, onResume, onCancel, onRemove, onCopy }: Props) {
  const groups: GroupedSchedules[] = useMemo(() => computeGroupedAgenda(schedules), [schedules]);

  if (schedules.length === 0) return null;

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</h3>
            <span className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] tabular-nums text-slate-400">{g.items.length}</span>
          </div>

          <div className="space-y-2">
            {g.items.map((s) => (
              <ScheduledPostRow
                key={s.id}
                schedule={s}
                selected={selectedIds.has(s.id)}
                onToggle={onToggle}
                onOpen={onOpen}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
                onRemove={onRemove}
                onCopy={onCopy}
                browserTimezone={browserTimezone}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
