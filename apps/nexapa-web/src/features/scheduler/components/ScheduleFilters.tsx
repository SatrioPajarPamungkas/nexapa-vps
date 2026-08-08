import type { ScheduleFilter, ScheduleDestinationDraft } from "../scheduler.types";

type Props = {
  filter: ScheduleFilter;
  resultCount: number;
  totalCount: number;
  destinations: ScheduleDestinationDraft[];
  onFilterChange: (f: ScheduleFilter) => void;
  onClear: () => void;
};

export function ScheduleFilters(_props: Props) {
  return null;
}
