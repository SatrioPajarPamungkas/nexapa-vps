import type { ReactNode } from "react";

type Props = { left: ReactNode; center: ReactNode; right: ReactNode };

export function PublisherWorkspace({ left, center, right }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.8fr_0.9fr] xl:grid-cols-[1.15fr_0.85fr_0.9fr]">
      <div className="space-y-6">{left}</div>
      <div className="space-y-6">{center}</div>
      <div className="space-y-6">{right}</div>
    </div>
  );
}
