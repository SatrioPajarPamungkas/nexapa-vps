import { getSourceLabel } from "../affiliate.utils";
import type { AffiliateSource } from "../affiliate.types";
import { cn } from "@/lib/cn";

type Props = {
  source: AffiliateSource;
  isDemo?: boolean;
};

const sourceColors: Record<AffiliateSource, string> = {
  "tiktok-shop": "bg-rose-50 text-rose-700 ring-rose-200",
  shopee: "bg-orange-50 text-orange-700 ring-orange-200",
  facebook: "bg-blue-50 text-blue-700 ring-blue-200",
  instagram: "bg-purple-50 text-purple-700 ring-purple-200",
  generic: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function SourceBadge({ source, isDemo }: Props) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1", sourceColors[source] ?? sourceColors.generic)}>
        {getSourceLabel(source)}
      </span>
      {isDemo && (
        <span className="inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
          DEMO
        </span>
      )}
    </span>
  );
}
