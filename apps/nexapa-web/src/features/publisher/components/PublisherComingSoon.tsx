import { Clock3 } from "lucide-react";
import type { PublisherPlatform } from "../publisher.types";

export function PublisherComingSoon({ platform }: { platform: Extract<PublisherPlatform, "youtube" | "shopee"> }) {
  const name = platform === "youtube" ? "YouTube" : "Shopee";
  return <div className="mx-auto max-w-2xl bg-transparent px-4 py-16"><div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10"><Clock3 className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-4 text-lg font-semibold text-slate-900">{name} Publisher</h2><p className="mt-1 inline-flex rounded-full border border-blue-400/25 bg-blue-500/12 px-2 py-0.5 text-sm font-medium text-blue-800">Coming soon</p><p className="mt-3 text-[13px] text-slate-600">{name} publishing adapter is not configured yet.</p></div></div>;
}
