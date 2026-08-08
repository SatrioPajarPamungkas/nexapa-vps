import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PublisherHistoryWorkspace } from "@/features/publisher-history/components/PublisherHistoryWorkspace";

export function HistoryPage() {
  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow="Publisher"
        title="Publishing History"
        description="Review completed, failed, and cancelled publishing activity across all connected platforms."
        actions={
          <>
            <StatusBadge label="Production ready" tone="green" />
          </>
        }
      />

      <div className="mx-auto max-w-[1440px] space-y-5 bg-transparent px-4 py-6 sm:px-6 lg:px-8">
        <PublisherHistoryWorkspace />
      </div>
    </div>
  );
}
