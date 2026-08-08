import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AffiliateWorkspace } from "@/features/affiliate/components/AffiliateWorkspace";

export function AffiliatePage() {
  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Commerce"
        title="Affiliate"
        description="Manage product references, affiliate links, content connections, and campaign drafts from one Nexapa workspace."
        actions={
          <>
            <StatusBadge label="Affiliate integration not connected" tone="amber" />
          </>
        }
      />

      <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <AffiliateWorkspace />
      </div>
    </div>
  );
}
