import { ScheduledPostRow } from "./ScheduledPostRow";
import type { LocalSchedule } from "../scheduler.types";

type Props = {
  schedule: LocalSchedule;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onCopy: (id: string) => void;
  browserTimezone: string;
};

export function ScheduledPostCard(props: Props) {
  return <ScheduledPostRow {...props} />;
}
